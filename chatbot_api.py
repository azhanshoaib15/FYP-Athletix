import faiss
import pickle
import numpy as np
from sentence_transformers import SentenceTransformer
from openai import OpenAI
import os

# -----------------------------
# CONFIG
# -----------------------------
os.environ["OPENAI_API_KEY"] = "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"
client = OpenAI()

# -----------------------------
# LOAD EMBEDDING MODEL
# -----------------------------
model = SentenceTransformer("all-MiniLM-L6-v2")

# -----------------------------
# LOAD FAISS INDEX
# -----------------------------
index = faiss.read_index("fitness_index.faiss")

with open("metadata.pkl", "rb") as f:
    documents = pickle.load(f)

# -----------------------------
# SEARCH FUNCTION
# -----------------------------
def search(query, k=5):
    query_vector = model.encode([query])
    distances, indices = index.search(
        np.array(query_vector).astype("float32"), k
    )

    results = []
    for idx in indices[0]:
        results.append(documents[idx])

    return results


# -----------------------------
# BUILD PROMPT
# -----------------------------
def build_prompt(query, retrieved_docs):
    context = "\n\n".join([doc["text"] for doc in retrieved_docs])

    return f"""
You are a certified professional AI fitness and nutrition trainer.

Use ONLY the provided context to answer.
If the answer is not in context, say:
"I need more information to provide an accurate recommendation."

Provide:
- Clear structure
- Bullet points when needed
- Practical advice
- No hallucination

Context:
{context}

User Question:
{query}

Answer:
"""


# -----------------------------
# LLM CALL
# -----------------------------
from groq import Groq

import os
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

from groq import Groq
import os

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def ask_llm(prompt):
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": "You are an expert virtual fitness and nutrition coach."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
    )

    return response.choices[0].message.content


# -----------------------------
# MAIN LOOP
# -----------------------------
if __name__ == "__main__":
    while True:
        query = input("\nAsk your virtual trainer (type 'exit' to quit): ")

        if query.lower() == "exit":
            break

        retrieved_docs = search(query, k=5)
        prompt = build_prompt(query, retrieved_docs)

        answer = ask_llm(prompt)

        print("\n--- AI Trainer Response ---\n")
        print(answer)