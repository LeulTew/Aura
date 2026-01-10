# Client Project Plan: "Aura Pro"

**Target Release**: 2026 | **Stack**: Next.js, FastAPI, Supabase, WebUSB

## 🏗 Architecture Overview

We will evolve the existing Aura prototype into a robust, cloud-native application.

### 1. The Stack (Free & Unlimited Tier)

- **Frontend**: **Vercel** (Next.js 15).
  - _Why_: Best-in-class performance, generous free tier, edge functions.
- **Backend**: **Render** (Python FastAPI).
  - _Why_: Native Python support, free web services (spin down ok for MVP, or upgrade later).
  - _Alternative_: **Google Cloud Run** (Higher free limits, no spin down latency if optimized). **Decision**: **Cloud Run** for robust "unlimited" feel via free credits/tier.
- **Database**: **Supabase** (PostgreSQL + `pgvector`).
  - _Why_: Replaces local LanceDB. Persistent storage, Authentication (Auth), and Vector Search in one free platform (500MB DB is plenty for ~100k faces).
- **Object Storage**: **Supabase Storage**.
  - _Why_: Integrated with DB RLS (Row Level Security).
- **Client Persistence**: **Dexie.js**.
  - _Why_: Fast offline access for gallery thumbnails.

### 2. Key Features Implementation

#### A. "Detect Devices without Cable/Flash" (WebUSB)

- **Tech**: `tethr` (JavaScript PTP library).
- **Flow**: User connects camera via USB → Browser requests access → Photos sync directly to Browser → Upload to Supabase.
- **Fallback**: Wi-Fi SD card support logic (polling local IP).

#### B. QR Code

- **Tech**: `qrcode.react`.
- **Feature**: Admin generates unique Event QR. Guests scan → Open generic upload/view portal.

#### C. Login/Registration

- **Tech**: Supabase Auth (OTP/Phone + OAuth).
- **Face Login**:
  1. User scans face.
  2. Backend compares embedding against `users` table vector.
  3. If match < threshold → Issue JWT.

---

## 📅 Implementation Phases

### Phase 1: Foundation Upgrade (Backend) [BACKEND]

**Goal**: Move from ephemeral local CSV/LanceDB to Supabase.

- [ ] **Setup Supabase**: Init project, enable `vector` extension.
- [ ] **Schema Design**: Tables for `users`, `photos`, `bundles`, `embeddings`.
- [ ] **Migrate Logic**: rewriting `database.py` to use `vecs` or direct `psycopg` for Supabase.
- [ ] **Authentication API**: `POST /auth/face-login`.

> **Prompt**: "Set up a Supabase project structure for a Face Recognition app. Create a migration file for PostgreSQL that enables `pgvector`, creates a `photos` table with embedding columns, and a secure `users` table."

### Phase 2: Core UX & "No Cable" Sync [FRONTEND]

**Goal**: Build the Admin Capture Station.

- [ ] **WebUSB Integration**: Install `tethr`. Create `ConnectCamera` component.
- [ ] **Sync Pipeline**: Camera → Browser (Blob) → Supabase Storage (Upload).
- [ ] **Dexie Cache**: Store thumbnails locally for instant review.

> **Prompt**: "Create a React hook `useCameraConnect` using the `tethr` library. It should handle USB permission requests, list files on the DSLR, and offer a `transferPhoto` method that returns a Blob."

### Phase 3: Public Face (The "Good Front Page") [FRONTEND]

**Goal**: High-conversion landing page & Guest Experience.

- [ ] **Landing Page**: Hero section with "Find Your Photos" CTA.
- [ ] **Registration Flow**: Phone inputs, generic "Event Code" entry.
- [ ] **Gallery 2.0**: Virtualized grid (TanStack Virtual) for 10,000+ photos.
- [ ] **QR Generation**: Admin dashboard component.

> **Prompt**: "Design a high-converting Landing Page in Next.js. Use a dark-mode glassmorphism aesthetic. It should have a 'Scan Face' primary action and a 'Photographer Login' secondary action."

### Phase 4: Intelligence & Delivery [CORE]

**Goal**: Face Search 2.0 & Downloads.

- [ ] **Backend Search**: Optimize `search_faces` for Supabase `rpc` calls (cosine similarity).
- [ ] **Download Manager**: Zip generation on the fly (or client-side `jszip` to save bandwidth).

---

## 🛡 Security & Rules

- **RLS (Row Level Security)**: Users only see their matched photos.
- **Edge Caching**: Cache public event assets on Vercel Edge.
- **Sanitization**: All user inputs (names, phones) validated with Zod.
