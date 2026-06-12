import faiss
import pickle
import numpy as np
from sentence_transformers import SentenceTransformer

# Load embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")

# Load FAISS index
index = faiss.read_index("fitness_index.faiss")

# Load metadata
with open("metadata.pkl", "rb") as f:
    documents = pickle.load(f)

import faiss
import pickle
import numpy as np
from sentence_transformers import SentenceTransformer

# Load embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")

# Load FAISS index
index = faiss.read_index("fitness_index.faiss")

# Load metadata
with open("metadata.pkl", "rb") as f:
    documents = pickle.load(f)


def search(query, k=5):
    query_lower = query.lower()
    
    # Identify Intent with more comprehensive keywords
    nutrition_keywords = ["diet", "food", "protein", "meal", "nutrition", "eat", "calorie", "fat loss", "weight loss", "carb", "breakfast", "lunch", "dinner", "snack"]
    exercise_keywords = ["workout", "exercise", "training", "gym", "lift", "cardio", "strength", "muscle building"]
    
    wants_nutrition = any(word in query_lower for word in nutrition_keywords)
    wants_exercise = any(word in query_lower for word in exercise_keywords)

    # Vector Search - retrieve more candidates for better filtering
    query_vector = model.encode([query])
    distances, indices = index.search(np.array(query_vector).astype("float32"), k * 6)

    scored_results = []
    for dist, idx in zip(distances[0], indices[0]):
        doc = documents[idx]
        doc_type = doc["metadata"].get("type")
        
        # Strong intent filtering: penalize mismatched types heavily
        if wants_nutrition and not wants_exercise:
            # User wants nutrition only
            if doc_type != "nutrition":
                continue  # Skip non-nutrition documents entirely
        elif wants_exercise and not wants_nutrition:
            # User wants exercise only
            if doc_type != "exercise":
                continue  # Skip non-exercise documents entirely
        
        # FAISS L2 distance: smaller = better
        base_score = 1 / (1 + dist)
        
        # Apply moderate boost for matching intent
        intent_boost = 0
        if wants_nutrition and doc_type == "nutrition":
            intent_boost += 0.3
        if wants_exercise and doc_type == "exercise":
            intent_boost += 0.3
            
        final_score = base_score + intent_boost
        scored_results.append((final_score, doc))

    # Sort by the combined score
    scored_results.sort(key=lambda x: x[0], reverse=True)
    return [doc for _, doc in scored_results[:k]]


if __name__ == "__main__":
    query = input("Enter test query: ")

    results = search(query, k=5)

    print("\nTop Retrieved Documents:\n")
    for i, r in enumerate(results):
        print(f"\nResult {i+1}:")
        print(r["text"])
        print("-" * 50)

def search(query, k=5):
    query_lower = query.lower()
    
    # Identify Intent with more comprehensive keywords
    nutrition_keywords = ["diet", "food", "protein", "meal", "nutrition", "eat", "calorie", "fat loss", "weight loss", "carb", "breakfast", "lunch", "dinner", "snack"]
    exercise_keywords = ["workout", "exercise", "training", "gym", "lift", "cardio", "strength", "muscle building"]
    
    wants_nutrition = any(word in query_lower for word in nutrition_keywords)
    wants_exercise = any(word in query_lower for word in exercise_keywords)

    # Vector Search - retrieve more candidates for better filtering
    query_vector = model.encode([query])
    distances, indices = index.search(np.array(query_vector).astype("float32"), k * 6)

    scored_results = []
    for dist, idx in zip(distances[0], indices[0]):
        doc = documents[idx]
        doc_type = doc["metadata"].get("type")
        
        # Strong intent filtering: penalize mismatched types heavily
        if wants_nutrition and not wants_exercise:
            # User wants nutrition only
            if doc_type != "nutrition":
                continue  # Skip non-nutrition documents entirely
        elif wants_exercise and not wants_nutrition:
            # User wants exercise only
            if doc_type != "exercise":
                continue  # Skip non-exercise documents entirely
        
        # FAISS L2 distance: smaller = better
        base_score = 1 / (1 + dist)
        
        # Apply moderate boost for matching intent
        intent_boost = 0
        if wants_nutrition and doc_type == "nutrition":
            intent_boost += 0.3
        if wants_exercise and doc_type == "exercise":
            intent_boost += 0.3
            
        final_score = base_score + intent_boost
        scored_results.append((final_score, doc))

    # Sort by the combined score
    scored_results.sort(key=lambda x: x[0], reverse=True)
    return [doc for _, doc in scored_results[:k]]

def build_prompt(query, retrieved_docs, intent):
    context = "\n\n".join([doc["text"] for doc in retrieved_docs])

    if intent == "diet":
        return f"""
You are a certified AI Nutrition Coach.

Using ONLY the provided context, create a structured 1-day fat loss diet plan.

Context:
{context}

User request:
{query}

Provide:
- Breakfast
- Lunch
- Dinner
- Optional Snack
- Estimated total calories
- Short explanation why this supports fat loss
"""

    elif intent == "complete":
        return f"""
You are a certified AI Virtual Fitness Trainer.

Using ONLY the provided context, create a complete plan including:

1. Workout Plan
2. Diet Plan
3. Safety notes

Context:
{context}

User request:
{query}

Provide structured sections.
"""

    else:
        return f"""
You are an AI fitness assistant.

Context:
{context}

User request:
{query}
"""

if __name__ == "__main__":
    query = input("Enter test query: ")

    results = search(query, k=5)

    print("\nTop Retrieved Documents:\n")
    for i, r in enumerate(results):
        print(f"\nResult {i+1}:")
        print(r["text"])
        print("-" * 50)