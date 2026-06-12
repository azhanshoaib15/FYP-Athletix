import json
import faiss
import pickle
import numpy as np
from sentence_transformers import SentenceTransformer
import os

# -------------------------------
# CONFIGURATION
# -------------------------------

JSONL_FILES = [
    "exercises.jsonl",
    "desi_foods.jsonl",
    "foundational_foods.jsonl"
]

INDEX_OUTPUT = "fitness_index.faiss"
METADATA_OUTPUT = "metadata.pkl"

EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"


def load_multiple_jsonl(files):
    documents = []

    for path in files:
        if not os.path.exists(path):
            print(f"Warning: {path} not found. Skipping.")
            continue

        print(f"Loading {path}...")

        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    doc = json.loads(line)
                    if "text" in doc and doc["text"].strip():
                        documents.append(doc)
                except:
                    continue

    return documents


def build_index():
    print("Loading embedding model locally...")
    model = SentenceTransformer(EMBEDDING_MODEL_NAME)

    print("Loading JSONL documents...")
    documents = load_multiple_jsonl(JSONL_FILES)

    if len(documents) == 0:
        print("No documents found. Exiting.")
        return

    print(f"\nTotal loaded documents: {len(documents)}")

    texts = [doc["text"] for doc in documents]

    print("Generating embeddings...")
    embeddings = model.encode(
        texts,
        show_progress_bar=True,
        convert_to_numpy=True
    )

    dimension = embeddings.shape[1]

    print("Creating FAISS index...")
    index = faiss.IndexFlatL2(dimension)

    index.add(embeddings.astype("float32"))

    print("Saving FAISS index...")
    faiss.write_index(index, INDEX_OUTPUT)

    print("Saving metadata...")
    with open(METADATA_OUTPUT, "wb") as f:
        pickle.dump(documents, f)

    print("\nIndexing Complete.")
    print(f"FAISS index saved to: {INDEX_OUTPUT}")
    print(f"Metadata saved to: {METADATA_OUTPUT}")


if __name__ == "__main__":
    build_index()