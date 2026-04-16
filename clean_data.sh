#!/bin/bash
# 🧹 Data Cleanup Utility for Data Extraction Pipeline
# Usage: ./clean_data.sh (from the data_extraction directory)

set -e  # Exit on error

# Ensure we are in the right directory (check for presence of ChromaDB or docker-compose)
if [ ! -d "chroma_db" ]; then
    echo "⚠️  Warning: 'chroma_db' directory not found. Are you in the 'data_extraction' folder?"
    echo "Current directory: $(pwd)"
fi

echo "──────────────────────────────────────────────"
echo "🧹 STARTING DATA CLEANUP..."
echo "──────────────────────────────────────────────"

# 1. Remove ChromaDB Vector Store
if [ -d "chroma_db" ]; then
    echo "🗑️  Removing ChromaDB directory..."
    rm -rf chroma_db
    echo "   ✅ (Done)"
else
    echo "ℹ️  ChromaDB directory not found (skipping)"
fi

# 2. Drop MongoDB Database 'data_extraction'
echo "🗑️  Dropping MongoDB database 'data_extraction'..."
if docker ps | grep -q de_mongo; then
    docker exec de_mongo mongosh data_extraction --eval "db.dropDatabase()" --quiet
    echo "   ✅ (Done)"
else
    echo "❌ Container 'de_mongo' not running! Please start docker-compose."
fi

# 3. Reset PostgreSQL 'public' Schema
echo "🗑️  Resetting PostgreSQL schema 'public'..."
if docker ps | grep -q de_postgres; then
    docker exec de_postgres psql -U postgres -d data_extraction -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    echo "   ✅ (Done)"
else
    echo "❌ Container 'de_postgres' not running! Please start docker-compose."
fi

echo "──────────────────────────────────────────────"
echo "✨ CLEANUP COMPLETE: Environment is fully reset"
echo "──────────────────────────────────────────────"
