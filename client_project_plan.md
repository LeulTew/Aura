# Client Project Plan: "Aura Pro"

**Vision**: A Multi-Tenant SaaS Platform for Photo Studios  
**Target Release**: 2026  
**Stack**: Next.js 15, FastAPI, Supabase (PostgreSQL + pgvector), WebUSB

---

## 🏗 Architecture Overview

### System Architecture

```mermaid
flowchart TB
    subgraph LP["Landing Page (/)"]
        LOGIN[Unified Login]
    end
    
    LOGIN --> ROLE{User Role?}
    
    ROLE -->|superadmin| SA["/superadmin<br/>Platform Control"]
    ROLE -->|admin| AD["/admin<br/>Studio Command"]
    ROLE -->|employee| EM["/capture<br/>Photographer Station"]
    ROLE -->|guest| GU["/scan<br/>Face Search"]
    
    subgraph DB["Supabase Backend"]
        ORG[(organizations)]
        PRO[(profiles)]
        PHO[(photos)]
        BUN[(bundles)]
        RLS{{Row Level Security}}
    end
    
    SA --> DB
    AD --> DB
    EM --> DB
    GU --> PHO
    
    style LP fill:#000,color:#fff
    style SA fill:#7C3AED,color:#fff
    style AD fill:#3B82F6,color:#fff
    style EM fill:#10B981,color:#fff
    style GU fill:#F59E0B,color:#fff
    style RLS fill:#EF4444,color:#fff
```

The Aura Pro platform follows a multi-tenant architecture where all users authenticate through a unified login on the landing page. Based on their role stored in the `profiles` table, users are redirected to their respective portals:

- **SuperAdmin Portal** (`/superadmin`): Platform operators (us) manage all tenants, monitor usage metrics, set billing limits, and control system health.
- **Studio Admin** (`/admin`): Tenant administrators manage their studio's photos, employees, sources, and bundles. All queries are scoped to their `org_id`.
- **Photographer Station** (`/capture`): Employees upload photos, create bundles, and view assigned events. Limited permissions (no delete/settings access).
- **Guest Scan** (`/scan`): Event attendees find their photos via face recognition. No account required.

### User Roles & Permissions

| Role | Portal | Capabilities |
|------|--------|--------------|
| **SuperAdmin** | `/superadmin` | Full platform access: Manage tenants, view all usage metrics, set billing limits, system health monitoring, audit logs |
| **Admin** | `/admin` | Studio management: Employees, sources, photos, bundles, settings. Can invite employees and manage storage |
| **Employee** | `/capture` | Upload photos, create bundles, view assigned events. Cannot delete photos or access settings |
| **Guest** | `/scan` | Face-scan to find their photos in a specific event. No account required, session-based |

### Storage Architecture (Ethiopia-Optimized)

```mermaid
flowchart LR
    subgraph EVENT["At Event"]
        CAM[📷 Camera]
        LAP[💻 Laptop/Phone]
        TEMP[(Event Temp<br/>Cloud Storage)]
    end
    
    subgraph STUDIO["At Studio"]
        NAS[🗄️ Local NAS/PC]
        AGENT[Sync Agent]
        CLOUD[(Supabase<br/>Cloud)]
    end
    
    CAM -->|"Mobile Data"| LAP
    LAP -->|"Fast Upload"| TEMP
    
    NAS <-->|"Watch"| AGENT
    AGENT -->|"Delta Sync<br/>WiFi Only"| CLOUD
    TEMP -->|"Review & Move"| CLOUD
    
    subgraph FEATURES["Sync Agent Features"]
        F1[✓ Offline Queue]
        F2[✓ Bandwidth Limit]
        F3[✓ Local Search]
    end
    
    AGENT --- FEATURES
    
    style TEMP fill:#F59E0B,color:#000
    style CLOUD fill:#3B82F6,color:#fff
    style AGENT fill:#10B981,color:#fff
```

Designed for Ethiopian market conditions where internet connectivity can be unreliable and expensive, the hybrid storage architecture supports multiple workflows:

1. **Event Photography (Mobile)**: Photographers at events upload directly to "Event Temp Storage" using mobile data. Photos are marked as temporary and can be reviewed/archived later at the studio.

2. **Studio Workflow (Local Primary)**: Studios register local folders (e.g., `D:\Photos\2026`) as sources. The Sync Agent monitors these folders and performs:
   - **Offline Queue**: Actions queued in IndexedDB when offline
   - **Delta Sync**: Only changed files synced, reducing bandwidth
   - **Bandwidth Limit**: Configurable upload speed to avoid saturating connection
   - **Local Search**: Vector index maintained locally for offline face search

3. **Hybrid Search**: API can search both cloud and local sources, with results merged and deduplicated.

### Database Schema

```sql
-- Core Multi-Tenant Tables
organizations (id, name, slug, plan, storage_limit_gb, storage_used_bytes, is_active, created_at)
profiles      (id → auth.users, email, display_name, role, org_id → organizations, created_at)
photos        (id, path, full_path, embedding, org_id, source_type, photo_date, metadata, created_at)
bundles       (id, name, photo_ids[], org_id, created_by, created_at)
usage_logs    (id, org_id, user_id, action, bytes_processed, metadata, created_at)

-- Key Constraints
• profiles.role IN ('superadmin', 'admin', 'employee')
• photos.source_type IN ('cloud', 'local_sync', 'event_temp')
• organizations.plan IN ('free', 'pro', 'enterprise')
```

### RLS Policy Summary

| Table | SuperAdmin | Admin | Employee |
|-------|------------|-------|----------|
| organizations | ALL | SELECT own | SELECT own |
| profiles | ALL | SELECT org | SELECT org |
| photos | ALL | ALL org | SELECT/INSERT org |
| bundles | ALL | ALL org | SELECT/INSERT org |
| usage_logs | ALL | SELECT org | - |

### Authentication Flow

1. User visits `/` (Landing Page)
2. Enters credentials (PIN for MVP, email/password planned)
3. Backend validates credentials and fetches profile from `profiles` table
4. JWT token generated with claims: `{role, org_id, org_slug, exp}`
5. Response includes `redirect` path based on role
6. Frontend stores token in sessionStorage and navigates to appropriate portal

---

## 📅 Implementation Phases

### Phase 1: Foundation Upgrade (Backend) [DONE]

**Goal**: Migrate from ephemeral local CSV/LanceDB to cloud-native Supabase.

- [x] **Setup Supabase**: Initialize project, enable `pgvector` extension for vector similarity search
- [x] **Schema Design**: Create tables for `users`, `photos`, `bundles`, `embeddings` with proper indexes
- [x] **Migrate Logic**: Rewrite `database.py` to use Supabase client instead of local LanceDB
- [x] **Authentication API**: Implement `POST /auth/face-login` for face-based authentication

> **Tech Details**: Using `pgvector` with HNSW index for sub-100ms similarity search on 100k+ embeddings.

### Phase 2: Core UX & "No Cable" Sync [FRONTEND] [DONE]

**Goal**: Build the Admin Capture Station with direct camera connection.

- [x] **WebUSB Integration**: Implement `tethr` library for PTP protocol camera communication
- [x] **Sync Pipeline**: Camera → Browser (Blob) → Supabase Storage with progress tracking
- [x] **Dexie Cache**: Local IndexedDB caching for instant thumbnail preview

> **Tech Details**: WebUSB requires HTTPS. Camera detection via `navigator.usb.requestDevice()`.

### Phase 3: Public Face [FRONTEND] [DONE]

**Goal**: Professional landing page and seamless guest experience.

- [x] **Landing Page**: Editorial design with bold typography, professional photography focus
- [x] **Gallery 2.0**: Virtualized grid using TanStack Virtual for 10,000+ photos
- [x] **QR Generation**: Admin can generate unique event QR codes for guests

> **Design**: Bold typography, clean borders, no glassmorphism - professional editorial style.

### Phase 4: Intelligence & Delivery [CORE] [DONE]

**Goal**: Advanced face search and efficient download management.

- [x] **Backend Search**: `match_faces` RPC function using cosine similarity with configurable threshold
- [x] **Download Manager**: Client-side zip generation using `jszip` to reduce server load

> **Performance**: HNSW index enables ~50ms search across 100k embeddings.

### Phase 5: Multi-Tenant Platform [IN PROGRESS]

**Goal**: Role-based access control and SuperAdmin management portal.

#### 5A: Database Foundation [DONE]
- [x] **Organizations Table**: Tenants with plan limits and storage tracking
- [x] **Profiles Table**: Users with roles (superadmin/admin/employee)
- [x] **RLS Policies**: Strict tenant isolation via `org_id` filtering
- [x] **Role-Based JWT**: Login returns token with role, org_id, org_slug claims
- [x] **SuperAdmin Portal**: `/superadmin` route with tenant CRUD and stats dashboard

#### 5B: SuperAdmin Portal Enhancements [TODO]
- [ ] **Usage Dashboard**: API calls per tenant, searches/day, chart visualizations
- [ ] **Billing Management**: Upgrade plans, set custom limits, overage alerts
- [ ] **Audit Logging**: Track all superadmin actions with timestamps
- [ ] **Tenant Onboarding**: Email workflow for new tenant invites

#### 5C: Tenant Admin Scoping [TODO]
- [ ] **Scoped Queries**: All `/admin` queries filtered by `org_id` from JWT
- [ ] **Employee Management**: Invite via email, assign roles, remove access
- [ ] **Usage Tracking**: Middleware to log API calls and storage usage

### Phase 6: Hybrid Storage [PLANNED]

**Goal**: Local + Cloud sources optimized for Ethiopian market conditions.

#### 6A: Cloud Enhancements [TODO]
- [ ] **Source Types**: Add `source_type` column (cloud/local_sync/event_temp)
- [ ] **Sources UI**: Admin can register and manage storage sources
- [ ] **Event Temp Tier**: Auto-cleanup after 30 days, convert to permanent on approval

#### 6B: Sync Agent (Desktop App) [TODO]
- [ ] **Desktop App**: Electron/Tauri application for Windows/Mac
- [ ] **Folder Watch**: Monitor registered local directories for changes
- [ ] **Offline Queue**: IndexedDB-based queue for actions during offline periods
- [ ] **Delta Sync**: Only sync file changes, not full files
- [ ] **Bandwidth Throttle**: Configurable upload speed limit (KB/s)
- [ ] **Local Vector Index**: Face embeddings stored locally for offline search
- [ ] **Conflict Resolution**: Last-write-wins with manual override option

---

## 🛡 Security & Compliance

| Concern | Solution |
|---------|----------|
| **Tenant Data Isolation** | RLS policies with `org_id` on all queries, tested extensively |
| **SuperAdmin Abuse Prevention** | Audit logging for all superadmin actions with IP and timestamp |
| **Sync Agent Security** | Scoped API keys per tenant (not service_role), rotatable |
| **Rate Limiting** | Per-tenant quotas enforced at API level, configurable limits |
| **Guest Privacy** | Face embeddings computed client-side, never stored for guests |
| **Data at Rest** | Supabase encryption, optional customer-managed keys (enterprise) |

---

## 🔧 Tech Stack Summary

| Layer | Technology | Notes |
|-------|------------|-------|
| **Frontend** | Next.js 15, React 18 | App Router, Server Components |
| **Styling** | Vanilla CSS | Editorial design system |
| **Backend** | FastAPI (Python 3.11) | Async, auto-docs with OpenAPI |
| **ML** | InsightFace | 512-dim embeddings, ~50ms/face |
| **Database** | Supabase PostgreSQL + pgvector | RLS, realtime, edge functions |
| **Storage** | Supabase Storage | S3-compatible, CDN, signed URLs |
| **Auth** | Supabase Auth + Custom JWT | Role-based, org-scoped |
| **Desktop** | Electron/Tauri | Phase 6 - Sync Agent |
| **Deployment** | Vercel + Cloud Run | Frontend + Backend |
