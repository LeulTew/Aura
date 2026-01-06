# Research Prompts for Aura

Here are the prompts you can copy and use in Gemini, ChatGPT, or Perplexity to help us confirm the best stack choices.

## 1. Face Recognition (Crucial)

> "Identify the best open-source (MIT/Apache 2.0 licensed) face recognition libraries available in 2024/2025 that meet these criteria:
>
> 1. **Offline Only**: Must run entirely locally without external API calls.
> 2. **Privacy First**: No data logged to cloud.
> 3. **Performance**: fast inference on standard consumer CPUs (no heavy GPU requirement, though GPU acceleration is a plus).
> 4. **Accuracy**: High accuracy on 'in-the-wild' photos (SOTA results).
>    Compare 'InsightFace', 'DeepFace', and 'dlib' specifically regarding installation difficulty and inference speed in Python."

## 2. Vector Database (Local & Lightweight)

> "What is the best embedded vector database for a local-first Python application?
> I need to store approx 10,000 - 50,000 face embeddings.
> comparison criteria:
>
> - **Speed**: Fast nearest neighbor search (HNSW).
> - **Simplicity**: Single file (SQLite-based) vs. Service based.
> - **Tech**: Compare 'ChromaDB' (local mode), 'LanceDB', and 'PostgreSQL with pgvector'. Use case is a local photo organizer app."

## 3. PWA for Local Network Files

> "How can a Next.js PWA access local network files served by a separate backend on the same LAN?
> specifically regarding:
>
> - **Mixed Content**: Dealing with HTTP (local IP) contexts on mobile devices.
> - **Service Workers**: Caching high-res images for offline viewing.
> - Best practices for a 'download all' feature for blobs generated from local URLs."
