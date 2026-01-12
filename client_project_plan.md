# Client Project Plan: "Aura Pro"

**Vision**: A Multi-Tenant SaaS Platform for Photo Studios  
**Target Release**: 2026  
**Stack**: Next.js 15, FastAPI, Supabase (PostgreSQL + pgvector), WebUSB

---

## 🏗 Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LANDING PAGE (/)                                │
│                         ┌─────────────────────┐                             │
│                         │   Unified Login     │                             │
│                         └──────────┬──────────┘                             │
│                                    │                                         │
│              ┌─────────────────────┼─────────────────────┐                  │
│              ▼                     ▼                     ▼                  │
│    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐         │
│    │  /superadmin    │   │     /admin      │   │    /capture     │         │
│    │  Platform Ops   │   │  Studio Admin   │   │   Photographer  │         │
│    └────────┬────────┘   └────────┬────────┘   └────────┬────────┘         │
│             │                     │                     │                   │
└─────────────┼─────────────────────┼─────────────────────┼───────────────────┘
              │                     │                     │
              ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE BACKEND                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ organizations│  │   profiles   │  │    photos    │  │   bundles    │    │
│  │   (tenants)  │  │ (users+roles)│  │  (+ org_id)  │  │  (+ org_id)  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                         Row Level Security (RLS)                            │
└─────────────────────────────────────────────────────────────────────────────┘
              │                     │                     │
              ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HYBRID STORAGE LAYER                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │   Cloud Primary  │  │   Local Sync     │  │   Event Temp     │          │
│  │ (Supabase Store) │  │  (Sync Agent)    │  │ (Fast Upload)    │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### User Roles & Permissions

| Role | Portal | Capabilities |
|------|--------|--------------|
| **SuperAdmin** | `/superadmin` | Manage all tenants, view usage metrics, set billing limits, system health |
| **Admin** | `/admin` | Manage own studio: employees, sources, photos, bundles, settings |
| **Employee** | `/capture` | Upload photos, create bundles, view assigned events (no delete/settings) |
| **Guest** | `/scan` | Face-scan to find their photos in a specific event |

### Storage Architecture (Ethiopia-Optimized)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHOTOGRAPHER AT EVENT                         │
│  ┌─────────┐    ┌─────────────────┐    ┌─────────────────────┐  │
│  │ Camera  │───▶│ Laptop/Phone    │───▶│ Event Temp Storage  │  │
│  └─────────┘    │ (Mobile Data)   │    │ (Cloud - Fast)      │  │
│                 └─────────────────┘    └──────────┬──────────┘  │
└──────────────────────────────────────────────────┼──────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                         STUDIO                                   │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │ Local NAS/PC    │◀──▶│   Sync Agent    │───▶│   Cloud     │  │
│  │ D:\Photos\2026 │    │ (Delta Sync)    │    │  (Supabase) │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
│                              │                                   │
│                    ┌─────────┴─────────┐                        │
│                    │ Features:         │                        │
│                    │ • Offline Queue   │                        │
│                    │ • Bandwidth Limit │                        │
│                    │ • Local Search    │                        │
│                    └───────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- Core Tables
organizations (id, name, slug, plan, storage_limit_gb, storage_used_bytes, is_active)
profiles      (id → auth.users, email, role, org_id → organizations)
photos        (id, full_path, embedding, org_id, source_type, created_at)
bundles       (id, name, photo_ids[], org_id, created_at)
usage_logs    (id, org_id, action, bytes_processed, created_at)

-- RLS Policies
• SuperAdmin: Full access to all tables
• Admin/Employee: Access only rows where org_id matches their profile
• Guest: Read-only access to matched photos via face-search session
```

### Authentication Flow

```
1. User visits / (Landing Page)
2. Enters credentials (PIN for admin, or email/password)
3. Backend validates → fetches profile → builds JWT:
   {
     "sub": "user-uuid",
     "role": "admin",        // superadmin | admin | employee
     "org_id": "org-uuid",
     "org_slug": "studio-xyz"
   }
4. Frontend receives JWT + redirect path
5. Router directs to appropriate portal
```

---

## 📅 Implementation Phases

### Phase 1: Foundation Upgrade (Backend) [DONE]
- [x] Setup Supabase with pgvector
- [x] Schema Design (users, photos, bundles)
- [x] Authentication API

### Phase 2: Core UX & "No Cable" Sync [FRONTEND] [DONE]
- [x] WebUSB Integration
- [x] Sync Pipeline (Camera → Browser → Cloud)
- [x] Dexie Cache

### Phase 3: Public Face [FRONTEND] [DONE]
- [x] Landing Page
- [x] Gallery 2.0
- [x] QR Generation

### Phase 4: Intelligence & Delivery [CORE] [DONE]
- [x] Backend Search (Supabase RPC)
- [x] Download Manager (jszip)

### Phase 5: Multi-Tenant Platform [IN PROGRESS]

**Goal**: Role-based access + SuperAdmin portal

#### 5A: Database Foundation
- [ ] Create `organizations` table with plan limits
- [ ] Create `profiles` table with roles (superadmin/admin/employee)
- [ ] Add `org_id` column to `photos` and `bundles` tables
- [ ] Implement RLS policies for tenant isolation
- [ ] Role-based login with JWT claims + redirect

#### 5B: SuperAdmin Portal
- [ ] Create `/superadmin` route (protected)
- [ ] Tenant CRUD (create, view, suspend, delete)
- [ ] Usage dashboard (storage, API calls, searches)
- [ ] Billing/limits management UI

#### 5C: Tenant Admin Scoping
- [ ] Scope `/admin` queries to current `org_id`
- [ ] Employee management UI (invite, assign roles)
- [ ] Usage tracking middleware

### Phase 6: Hybrid Storage [PLANNED]

**Goal**: Local + Cloud sources for Ethiopian market conditions

#### 6A: Cloud Enhancements
- [ ] Add `source_type` column (cloud/local_sync/event_temp)
- [ ] Sources management UI in admin
- [ ] Event temp tier with auto-cleanup (30 days)

#### 6B: Sync Agent (Desktop App)
- [ ] Electron/Tauri app for Windows/Mac
- [ ] Local folder watch + IndexedDB queue
- [ ] Delta sync with bandwidth throttle
- [ ] Local vector index for offline search
- [ ] Conflict resolution (last-write-wins + manual)

---

## 🛡 Security & Compliance

| Concern | Solution |
|---------|----------|
| Tenant Data Isolation | RLS policies with `org_id` on all queries |
| SuperAdmin Abuse | Audit logging for all superadmin actions |
| Sync Agent Security | Scoped API keys (not service_role) |
| Rate Limiting | Per-tenant quotas enforced at API level |
| Guest Privacy | Face embeddings never stored for guests |

---

## 🔧 Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 18, TailwindCSS |
| Backend | FastAPI (Python 3.11), InsightFace |
| Database | Supabase PostgreSQL + pgvector |
| Storage | Supabase Storage (S3-compatible) |
| Auth | Supabase Auth + Custom JWT |
| Desktop | Electron/Tauri (Phase 6) |
| Deployment | Vercel (Frontend), Cloud Run (Backend) |
