# Client Project Plan: "Aura Neural Studio"

**Vision**: A Cloud-Native, Multi-Tenant Intelligent Photo Studio Platform.
**Target Release**: 2026
**Design Philosophy**: "Void 2.0" – Spatial, Adaptive, and Immersive.

---

## 🏗 Architecture Overview & "The Studio Narrative"

We are building a **Multi-Tenant Studio Operating System**.

### The Workflow Script (User Story)

1. **Login**: The Photostudio Admin logs into their secure portal.
2. **Ingest**: They connect their input source (Studio Camera via WebUSB, SD Card, or **Full Folder Selection**).
3. **Upload**: Images are uploaded to the cloud and instantly vectorized. **Filesystem structure is preserved** via relative path metadata.
4. **Distribute (Two Ways)**:
   - **Method A (Private)**: The Admin selects a specific set of photos (a "Bundle") and generates a unique QR for a specific client/event.
   - **Method B (Public)**: A "Public QR" is displayed at the venue. Any customer can scan this QR to access the **Neural Instance**, scan their face, and find their matched photos instantly.

### Architecture Components

- **Marketplace (Landing)**: The root website (`/`) for Studio admins and employees to log in.
- **Neural Instance (Scan Page)**: A dedicated, lightweight page (`/scan`) triggered by the Public QR, optimized for guest mobile devices.
- **Multi-Tenancy**: Organization -> Admin -> Employees.

---

## 📅 Implementation Phases

### Phase 1: Foundation & Backend [DONE]

**Goal**: Core Cloud & AI Infrastructure.

- [x] **Supabase Setup**: Database with `pgvector` for face embeddings.
- [x] **Cloud Run Backend**: FastAPI service for `insightface` vectorization.
- [x] **Auth System**: PIN/JWT based access for Admins.

### Phase 2: The Studio OS (Admin Tools) [DONE]

**Goal**: "The Photostudio logs in and connects devices."

- [x] **Cloud Command Center**: `/admin` Refactor (Drag & Drop -> Supabase).
- [x] **WebUSB Pipeline**: Direct Camera -> Browser -> Cloud sync.
- [x] **Mass Ingest**: Recursive folder upload support with path preservation.

### Phase 3: The Guest Experience (Public Face) [DONE]

**Goal**: "Customers scan their face."

- [x] **Void 2.0 Landing Page**: Professional marketing portal (`/`) replacing the old scanner.
- [x] **Neural Instance**: Dedicated `/scan` route for the public QR target.
- [x] **Bundling UI**: Select photos in matrix and create private shareable links.

### Phase 4: Intelligence & Scale [IN PROGRESS]

**Goal**: Advanced Revenue & Optimization features.

- [ ] **Multi-Tenant RLS**: Enforce strict data isolation between different Studios (Org ID).
- [ ] **Auto-Culling**: AI detects blurry/closed-eye photos before indexing.
- [ ] **Revenue**: Stripe integration for "Pay per Photo" or "Pay per Gallery".
- [ ] **Employee Roles**: Granular permissions (Editor vs. Shooter).

---

## 🎨 UI/UX Design: "Best Practices 2026"

- **Spatial Interface**: Depth-based layering (Z-index 200+ navigation, glassmorphic floating panels).
- **Bento Grids**: Admin dashboard uses dynamic, resizing grid tiles for efficient data visualization.
- **Path Awareness**: UI shows breadcrumbs or folder paths for ingested material.
