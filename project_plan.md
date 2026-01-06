# Aura: Intelligent Photo Retrieval System

**Aura** is a modern, privacy-first photo retrieval platform designed for photo studios and events. It enables users to instantly access their photos via QR codes or secure face recognition, eliminating the need for physical media.

## 1. Executive Summary

Aura bridges the gap between high-volume photography and instant delivery. By utilizing local-first AI processing, it ensures photos are searchable by face usage without compromising privacy or relying on heavy cloud uploads for processing. The system scans local directories, indexes faces, and serves them via a sleek, mobile-optimized Progressive Web App (PWA).

## 2. Architecture & Tech Stack

### High-Level Architecture

1.  **Aura Scanner (Local Agent):** Runs on the photographer's machine (Windows/Mac/Linux). Watches specific folders, detects faces using local CPU/GPU, computes embeddings, and updates the local or cloud database.
2.  **Aura Core (Server/API):** Handles authentication, vector search, and image delivery.
3.  **Aura Client (PWA):** The consumer facing app. Scans QRs, takes selfies, and downloads images.

### Tech Stack

- **Frontend (Client):**
  - **Framework:** Next.js (React) - for server-side rendering and PWA capabilities.
  - **Styling:** Tailwind CSS + Framer Motion (Animations).
  - **State:** Zustand or TanStack Query.
- **Backend (Core):**
  - **Language:** Python (FastAPI) - best ecosystem for AI integration.
  - **Database:** PostgreSQL (Relational Data), pgvector or ChromaDB (Vector Data).
  - **Storage:** Local Filesystem served via Nginx/Go static server OR S3-compatible storage (MinIO) for flexibility.
- **AI Engine (Scanner):**
  - **Face Recognition:** `insightface` (SOTA, precise) or `deepface`.
  - **Processing:** OpenCV for image handling.

### Design System: "Obsidian & Neon"

- **Philosophy:** Premium, modern, focusing on the content (photos).
- **Palette:**
  - **Background:** Deepest Black `#050505`, Charcoal `#121212` (Cards).
  - **Primary Accent:** Electric Violet `#6366f1` to Neon Blue `#3b82f6` (Gradients).
  - **Text:** Pure White `#ffffff` (Headings), Light Gray `#9ca3af` (Body).
  - **Success:** Emerald Glow `#10b981`.
- **Typography:** `Outfit` (Headings), `Inter` (Body).
- **UI Elements:** Glassmorphism overlay on photo previews, pill-shaped buttons, thin stroke icons.

## 3. Phases & Roadmap

### Phase 1: Foundation (Current)

- [ ] **Repo Setup:** Initialize Git, structures for standard Monorepo (Client + Server).
- [ ] **Design:** Create basic Figma/Mockups (via prompts).
- [ ] **Prototype:** Basic FastAPI server + Next.js frontend connecting hello world.

### Phase 2: The Scanner (Backend/AI)

- [ ] **Face Models:** Integrate `insightface`.
- [ ] **Indexing Engine:** Python script to walk directories, hash images, detect faces, save embeddings to Vector DB.
- [ ] **Storage API:** Secure endpoints to serve local files or presigned URLs.

### Phase 3: The Experience (Frontend)

- [ ] **Landing Page:** "Scan to View".
- [ ] **Selfie Logic:** Browser camera API, canvas capture, send to API.
- [ ] **Gallery UI:** Masonry grid of matched photos. Watermarked preview -> Download original.

### Phase 4: Integration & Optimization

- [ ] **Vector Search:** Optimize thresholding for matching (Euclidean/Cosine distance).
- [ ] **QR Logic:** Generate QRs for specific "Events" (Folders).
- [ ] **Performance:** Redis caching for search results.

### Phase 5: Testing & Polish

- [ ] **White Box:** Unit tests for embedding generation (ensure determinism), API route coverage.
- [ ] **Black Box:** E2E Testing (Playwright) for face scan flow.
- [ ] **Security:** Rate limiting, temporary tokens for access.

## 4. Implementation Checklist

| ID      | Task                                          | Status | Branch              |
| ------- | --------------------------------------------- | ------ | ------------------- |
| **1.0** | **Setup**                                     |        |                     |
| 1.1     | Initialize Monorepo (Next.js + FastAPI)       | [ ]    | `feat/init`         |
| 1.2     | Configure Docker/Dev Environment              | [ ]    | `feat/infra`        |
| **2.0** | **Backend (Core + AI)**                       |        |                     |
| 2.1     | Setup FastAPI + PostgreSQL (Asyncpg)          | [ ]    | `feat/backend-core` |
| 2.2     | Implement `FaceProcessor` Class (InsightFace) | [ ]    | `feat/ai-engine`    |
| 2.3     | Create Directory Watcher/Indexer              | [ ]    | `feat/indexer`      |
| 2.4     | Vector Search Endpoint (`/search/face`)       | [ ]    | `feat/search-api`   |
| **3.0** | **Frontend (Client)**                         |        |                     |
| 3.1     | Setup Next.js + Tailwind + Theme              | [ ]    | `feat/ui-setup`     |
| 3.2     | Camera Component (react-webcam/custom)        | [ ]    | `feat/camera`       |
| 3.3     | Result Gallery & Download Flow                | [ ]    | `feat/gallery`      |
| 3.4     | QR Code Scanner Page                          | [ ]    | `feat/qr`           |
| **4.0** | **Verification**                              |        |                     |
| 4.1     | Unit Tests (Pytest + Jest)                    | [ ]    | `fix/tests`         |
| 4.2     | E2E Tests (Playwright)                        | [ ]    | `fix/e2e`           |

## 5. UI Design Prompts (For Image Gen)

1.  **Landing:** "App interface, dark mode, mobile view, hero center text 'Find Your Photos', sleek glowing 'Scan Face' button, minimalist abstract background, high fidelity, ui/ux design."
2.  **Scanning:** "App interface, mobile view, camera viewfinder loop with face scanning mesh overlay, futuristic hud elements, neon blue accents."
3.  **Gallery:** "App interface, mobile view, masonry grid of high quality portraits, dark background, glassmorphism bottom bar with download all button."

---

_Created by Aura Team._
