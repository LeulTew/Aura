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
  - **Runtime:** **Bun** (Preferred for speed and developer experience).
  - **Package Manager:** **pnpm** (via Bun).
  - **Framework:** Next.js (React) - for server-side rendering and PWA capabilities.
  - **Styling:** Tailwind CSS + Framer Motion (Animations).
  - **State:** Zustand or TanStack Query.
- **Backend (Core):**
  - **Language:** Python (FastAPI) - selected for access to SOTA AI libraries.
    - _Note: Python is required for `deepface` + `GhostFaceNet`, which provides best-in-class accuracy with permissive licensing._
  - **Vector Database:** **LanceDB** (Embedded, Serverless).
    - Zero-copy disk-based indexing = instant startup, low RAM.
    - Native binary column storage for face crops alongside embeddings.
  - **Storage:** Local Filesystem (served via static file server or Next.js rewrites).
- **AI Engine (Scanner):**
  - **Wrapper:** `deepface` (MIT Licensed).
  - **Model:** `GhostFaceNet` (99.7% accuracy, CPU-optimized).
  - **Detector:** `YuNet` (Apache 2.0, ~50ms per face).

### Deployment Strategy (Free Tier Focused)

- **Frontend:** **Vercel** (Hobby Plan).
  - Zero-config deployment for Next.js.
  - Generous free limits for bandwidth and serverless functions.
- **Backend:** **Render** (Free Tier) or **Railway** (Trial).
  - _Constraint:_ Free tiers spin down after inactivity.
  - **Alternative (Recommended for Studios):** **Local Host + Tunnel**.
    - Host the backend on the studio's powerful machine.
    - Use **Cloudflare Tunnel** (Free) to expose the API securely to the web without port forwarding.
    - Ensures max performance for AI processing using local GPU/CPU.

### Design System: "Obsidian & Neon"

- **Philosophy:** Premium, modern, focusing on the content (photos).
- **Palette:**
  - **Background:** Deepest Black `#050505`, Charcoal `#121212` (Cards).
  - **Primary Accent:** Electric Violet `#6366f1` to Neon Blue `#3b82f6` (Gradients).
  - **Text:** Pure White `#ffffff` (Headings), Light Gray `#9ca3af` (Body).
  - **Success:** Emerald Glow `#10b981`.
- **Typography:** `Outfit` (Headings), `Inter` (Body).

## 3. Phases & Roadmap

### Phase 1: Foundation (Current)

- [x] **Repo Setup:** GitHub Repo Created.
- [x] **Environment Setup:** pnpm (Frontend), Python venv (Backend).
- [x] **Design:** Logo generated, Obsidian & Neon theme applied.
- [x] **Prototype:** Hello World connection verified.

### Phase 2: The Scanner (Backend/AI)

- [x] **Face Models:** Integrated `deepface` (GhostFaceNet + YuNet).
- [x] **Indexing Engine:** `FaceProcessor.scan_directory()` implemented.
- [x] **API:** `/api/embed` and `/api/scan` endpoints working.

### Phase 3: The Experience (Frontend)

- [ ] **Landing Page:** "Scan to View".
- [ ] **Selfie Logic:** Capture image, send to API.
- [ ] **Gallery UI:** Masonry grid of matched photos.

### Phase 4: Integration & Optimization

- [ ] **Vector Search:** Optimize thresholding.
- [ ] **QR Logic:** Generate QRs for specific "Events".

### Phase 5: Testing & Polish

- [ ] **White Box:** 100% Function Coverage for utils/helpers.
- [ ] **Black Box:** End-to-End flows (Scan -> Download).

## 4. Implementation Checklist

| ID      | Task                                         | Status | Branch           |
| ------- | -------------------------------------------- | ------ | ---------------- |
| **1.0** | **Setup**                                    |        |                  |
| 1.1     | Initialize Monorepo (Next.js/pnpm + FastAPI) | [x]    | `feat/init`      |
| 1.2     | Configure Dev Environment                    | [x]    | `feat/init`      |
| **2.0** | **Backend (Core + AI)**                      |        |                  |
| 2.1     | Setup FastAPI + Endpoints                    | [x]    | `feat/ai-engine` |
| 2.2     | Implement `FaceProcessor` (DeepFace)         | [x]    | `feat/ai-engine` |
| 2.3     | Create Directory Scanner                     | [x]    | `feat/ai-engine` |
| **3.0** | **Frontend (Client)**                        |        |                  |
| 3.1     | Setup Next.js + Tailwind + Theme (Bun)       | [ ]    | `feat/ui-setup`  |
| 3.2     | Camera Component (react-webcam/custom)       | [ ]    | `feat/camera`    |
| 3.3     | Result Gallery & Download Flow               | [ ]    | `feat/gallery`   |

## 5. UI Design Prompts (Ready for Generation)

**Subject:** A premium, dark-mode mobile web application for photo retrieval.

1.  **Landing Page:**
    > "Mobile app UI design, dark mode, landing page for 'Aura', ultra-minimalist, deep black background #050505, glowing neon blue #3b82f6 accents. Hero section text 'Your Photos, Instantly', center screen a holographic style scanning button. Premium, high-fidelity, 8k, dribbble style, sleek typography."
2.  **Face Scanning Overlay:**
    > "Mobile app UI design, camera viewfinder interface, user taking a selfie. Overlay graphics: futuristic face mesh topology in cyan, 'Align Face' instructions in white sans-serif font, frosted glass UI controls at bottom, dark environment, technological feel, bladerunner aesthetic."
3.  **Photo Gallery:**
    > "Mobile app UI design, photo gallery grid, masonry layout, high-fashion portraits, dark background, electric violet gradient buttons 'Download Connected'. Glassmorphism navigation bar at bottom. Clean, sharp, elegant, photography portfolio style."

## 6. Agent Rules (Antigravity & Co.)

**These rules must be followed by all AI agents working on this project:**

1.  **Environment Strictness:**
    - ALWAYS use `bun` for JavaScript/TypeScript execution and package management (e.g., `bun run dev`, `bun add`).
    - Do NOT use `npm` or `yarn` unless explicitly required by a specific legacy tool.
2.  **Code Quality & Typing:**
    - **No `any`**: Explicitly define interfaces and types. Use `unknown` with narrowing if necessary.
    - **Strict Mode**: TypeScript strict mode must be enabled.
    - **Error Handling**: Address errors proactively. No empty catch blocks. Use graceful degradation for UI.
3.  **Best Practices:**
    - **Senior Dev Mindset**: Do not use "hacky" workarounds. If a library is fighting you, understand why or swap it, don't patch it poorly.
    - **Comments**: Comment complex algorithmic logic (especially in the AI/Vector sections).
    - **Components**: Keep React components small and atomic.
4.  **Testing:**
    - Aim for robust coverage.
    - "White Box": Unit test logic (100% func coverage goal).
    - "Black Box": Verify critical user flows (Scanning, Downloading).

---

_Project Plan Last Updated: 2026-01-06_
