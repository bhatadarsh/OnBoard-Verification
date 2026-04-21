"""
Embedding Generator — generates vector embeddings.

Supports two providers (configured via EMBEDDING_PROVIDER in .env):
  1. "huggingface" — Local inference with google/embeddinggemma-300m (default)
  2. "openai"      — OpenAI API (text-embedding-3-small, etc.)

Handles text chunking, batch processing, and prepares output for ChromaDB.
"""
from typing import List, Dict, Any, Optional

from config.settings import settings
from utils.logger import get_logger

log = get_logger(__name__)

# Approximate token limit per chunk
MAX_CHUNK_CHARS = 6000

# Cache for HuggingFace model (loaded once)
_hf_model = None
_hf_tokenizer = None


def _load_hf_model():
    """Lazy-load the HuggingFace embedding model (singleton)."""
    global _hf_model, _hf_tokenizer

    if _hf_model is not None:
        return _hf_model, _hf_tokenizer

    import torch
    from transformers import AutoTokenizer, AutoModel

    model_name = settings.embedding_model
    token = settings.hf_token if settings.hf_token else None
    log.info(f"Loading HuggingFace model: [bold]{model_name}[/] on {settings.hf_device}...")

    _hf_tokenizer = AutoTokenizer.from_pretrained(model_name, token=token)
    _hf_model = AutoModel.from_pretrained(model_name, token=token)
    _hf_model.to(settings.hf_device)
    _hf_model.eval()

    log.info(f"[bold green]Model loaded[/]: {model_name}")
    return _hf_model, _hf_tokenizer


def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for a list of texts.

    Routes to HuggingFace or OpenAI based on EMBEDDING_PROVIDER setting.

    Args:
        texts: List of text strings to embed.

    Returns:
        List of embedding vectors (float lists).
    """
    if not texts:
        return []

    provider = settings.embedding_provider.lower()

    if provider == "huggingface":
        return _generate_hf_embeddings(texts)
    elif provider == "openai":
        return _generate_openai_embeddings(texts)
    else:
        log.error(f"Unknown embedding provider: {provider}. Use 'huggingface' or 'openai'.")
        return [[] for _ in texts]


def _generate_hf_embeddings(texts: List[str]) -> List[List[float]]:
    """Generate embeddings using HuggingFace model locally."""
    import torch

    model, tokenizer = _load_hf_model()

    valid_texts = [t if t and t.strip() else " " for t in texts]

    # BERT-family models have 512 position embedding limit
    # Force 512 regardless of what config reports
    max_tokens = 512
    # Conservative chunking: ~3 chars per token → 1500 chars
    chunk_char_limit = 1500

    chunked_texts = []
    chunk_map = []
    for idx, text in enumerate(valid_texts):
        chunks = _chunk_text(text, max_chars=chunk_char_limit)
        for chunk in chunks:
            chunked_texts.append(chunk)
            chunk_map.append(idx)

    # Batch process through model
    all_embeddings = []
    batch_size = 16

    for i in range(0, len(chunked_texts), batch_size):
        batch = chunked_texts[i:i + batch_size]

        encoded = tokenizer(
            batch,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors="pt",
        ).to(settings.hf_device)

        with torch.no_grad():
            outputs = model(**encoded)

        # Mean pooling over token embeddings (ignore padding tokens)
        token_embeddings = outputs.last_hidden_state
        attention_mask = encoded["attention_mask"].unsqueeze(-1)
        masked_embeddings = token_embeddings * attention_mask
        summed = masked_embeddings.sum(dim=1)
        counts = attention_mask.sum(dim=1).clamp(min=1e-9)
        mean_pooled = (summed / counts).cpu().tolist()

        all_embeddings.extend(mean_pooled)

    # Aggregate chunks
    final_embeddings = _aggregate_chunk_embeddings(
        all_embeddings, chunk_map, len(valid_texts)
    )

    dim = len(final_embeddings[0]) if final_embeddings and final_embeddings[0] else 0
    log.info(
        f"Generated [bold]{len(final_embeddings)}[/] embeddings "
        f"(provider=huggingface, model={settings.embedding_model}, dim={dim})"
    )
    return final_embeddings


def _generate_openai_embeddings(texts: List[str]) -> List[List[float]]:
    """Generate embeddings using OpenAI API."""
    if not settings.openai_api_key:
        log.warning("OPENAI_API_KEY not set. Returning empty embeddings.")
        return [[] for _ in texts]

    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)

        valid_texts = [t for t in texts if t and t.strip()]
        if not valid_texts:
            return [[] for _ in texts]

        chunked_texts = []
        chunk_map = []
        for idx, text in enumerate(valid_texts):
            chunks = _chunk_text(text)
            for chunk in chunks:
                chunked_texts.append(chunk)
                chunk_map.append(idx)

        all_embeddings = []
        batch_size = 512
        for i in range(0, len(chunked_texts), batch_size):
            batch = chunked_texts[i:i + batch_size]
            response = client.embeddings.create(
                model=settings.embedding_model,
                input=batch,
                dimensions=settings.embedding_dimensions,
            )
            for item in response.data:
                all_embeddings.append(item.embedding)

        final_embeddings = _aggregate_chunk_embeddings(
            all_embeddings, chunk_map, len(valid_texts)
        )

        log.info(
            f"Generated [bold]{len(final_embeddings)}[/] embeddings "
            f"(provider=openai, dim={settings.embedding_dimensions})"
        )
        return final_embeddings

    except Exception as e:
        log.error(f"OpenAI embedding error: {e}")
        return [[] for _ in texts]


def embed_and_prepare(
    content_id: str,
    text: str,
    metadata: Dict[str, Any] = None,
) -> Dict[str, Any]:
    """Embed a single text and prepare it for ChromaDB storage.

    Args:
        content_id: Unique ID for this content piece.
        text: Text to embed.
        metadata: Optional metadata dict.

    Returns:
        Dict with id, embedding, text, and metadata ready for ChromaDB.
    """
    embeddings = generate_embeddings([text])
    embedding = embeddings[0] if embeddings else []

    return {
        "id": content_id,
        "embedding": embedding,
        "document": text[:10000],
        "metadata": metadata or {},
    }


def _chunk_text(text: str, max_chars: int = MAX_CHUNK_CHARS) -> List[str]:
    """Split text into chunks on paragraph boundaries."""
    if len(text) <= max_chars:
        return [text]

    chunks = []
    paragraphs = text.split("\n\n")
    current_chunk = ""

    for para in paragraphs:
        if len(current_chunk) + len(para) + 2 <= max_chars:
            current_chunk += ("\n\n" + para) if current_chunk else para
        else:
            if current_chunk:
                chunks.append(current_chunk)
            if len(para) > max_chars:
                for i in range(0, len(para), max_chars):
                    chunks.append(para[i:i + max_chars])
                current_chunk = ""
            else:
                current_chunk = para

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


def _aggregate_chunk_embeddings(
    all_embeddings: List[List[float]],
    chunk_map: List[int],
    num_originals: int,
) -> List[List[float]]:
    """Average embeddings from chunks belonging to the same original text."""
    from collections import defaultdict

    groups = defaultdict(list)
    for chunk_idx, orig_idx in enumerate(chunk_map):
        if chunk_idx < len(all_embeddings):
            groups[orig_idx].append(all_embeddings[chunk_idx])

    result = []
    for orig_idx in range(num_originals):
        group = groups.get(orig_idx, [])
        if not group:
            result.append([])
        elif len(group) == 1:
            result.append(group[0])
        else:
            dim = len(group[0])
            avg = [sum(g[d] for g in group) / len(group) for d in range(dim)]
            result.append(avg)

    return result
