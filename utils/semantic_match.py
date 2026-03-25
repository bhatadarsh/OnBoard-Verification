from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# Load once (important)
_model = SentenceTransformer("all-MiniLM-L6-v2")


def semantic_overlap(source: list[str], target: list[str], threshold: float = 0.6) -> list[str]:
    """
    Returns items from `source` that have a semantic match in `target`
    above the given similarity threshold.
    """

    if not source or not target:
        return []

    source_embeddings = _model.encode(source, normalize_embeddings=True)
    target_embeddings = _model.encode(target, normalize_embeddings=True)

    similarities = cosine_similarity(source_embeddings, target_embeddings)

    matched = []
    for i, row in enumerate(similarities):
        if row.max() >= threshold:
            matched.append(source[i])

    return matched
