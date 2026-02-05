# Aura Pro - Complete Setup & Testing Guide

**Last Updated**: 2026-02-06  
**For**: Developers, Testers, and Users  
**Covers**: Database → Backend → Frontend → Desktop → AI Cloud

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Database Setup (Supabase)](#2-database-setup-supabase)
3. [Backend Setup (Python/FastAPI)](#3-backend-setup-pythonfastapi)
4. [Frontend Setup (Next.js)](#4-frontend-setup-nextjs)
5. [Desktop App Setup (Tauri/Rust)](#5-desktop-app-setup-taurirust)
6. [Test Accounts & Role Testing](#6-test-accounts--role-testing)
7. [QR Code & Guest Scan Testing](#7-qr-code--guest-scan-testing)
8. [MFA (Two-Factor Auth) Testing](#8-mfa-two-factor-auth-testing)
9. [Billing & Subscription Testing](#9-billing--subscription-testing)
10. [Desktop Sync Testing](#10-desktop-sync-testing)
11. [AI/Cloud Run Deployment](#11-aicloud-run-deployment)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

### Required Software

| Software              | Version | Install Command                                                   |
| --------------------- | ------- | ----------------------------------------------------------------- |
| **Node.js**           | 20+     | [nodejs.org](https://nodejs.org)                                  |
| **pnpm**              | 9+      | `npm install -g pnpm`                                             |
| **Python**            | 3.11+   | [python.org](https://python.org)                                  |
| **Rust**              | 1.75+   | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| **Git**               | 2.40+   | `sudo apt install git`                                            |
| **PostgreSQL Client** | any     | `sudo apt install postgresql-client`                              |

### Cloud Accounts Needed

| Service                     | Purpose                   | Link                                         |
| --------------------------- | ------------------------- | -------------------------------------------- |
| **Supabase**                | Database + Auth + Storage | [supabase.com](https://supabase.com)         |
| **Stripe** (optional)       | Billing/Payments          | [stripe.com](https://stripe.com)             |
| **Google Cloud** (optional) | AI Backend hosting        | [cloud.google.com](https://cloud.google.com) |
| **Vercel** (optional)       | Frontend hosting          | [vercel.com](https://vercel.com)             |

---

## 2. Database Setup (Supabase)

### 2.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Note your **Project URL** and **API Keys** from Settings → API:
   - `Project URL` → `https://xxxxx.supabase.co`
   - `anon` public key → For frontend
   - `service_role` secret key → For backend (NEVER expose to frontend)

### 2.2 Run Database Migrations

Open **SQL Editor** in Supabase Dashboard and run these files **in order**:

```
Order | File                                          | Purpose
------|-----------------------------------------------|--------------------------------
1     | apps/core/supa_schema.sql                    | Core tables (photos, embeddings)
2     | apps/core/multitenant_schema.sql             | Organizations, profiles, RLS
3     | apps/core/seed_data.sql                      | Initial orgs + security trigger
4     | apps/core/migrations/006_multi_org_admin.sql | Multi-org admin support
5     | apps/core/migrations/007_fix_profile_role_security.sql | Role escalation prevention
6     | apps/core/migrations/008_stripe_billing.sql  | Billing tables (Stripe integration)
```

### 2.3 Enable Storage Bucket

1. Go to **Storage** in Supabase Dashboard
2. Click **New Bucket** → Name: `photos` → Set to **Public** (or private with signed URLs)
3. (Optional) For TUS uploads: **Storage → Settings → Enable TUS**

### 2.4 Create Test Users

Go to **Authentication → Users → Add User** and create:

| Email                     | Password           | Notes          |
| ------------------------- | ------------------ | -------------- |
| `superadmin@aura.dev`     | `AuraSuper2026!`   | Platform owner |
| `admin@addis-studio.com`  | `AddisAdmin2026!`  | Studio admin   |
| `photo1@addis-studio.com` | `AddisPhoto2026!`  | Photographer   |
| `admin@gondar-photos.com` | `GondarAdmin2026!` | Second tenant  |

After creating, copy each user's **UUID** from the Users table.

### 2.5 Link Profiles to Users

Run this SQL (replace UUIDs with actual values from step above):

```sql
-- SuperAdmin (no org_id)
INSERT INTO profiles (id, email, display_name, role, org_id)
VALUES ('YOUR-SUPERADMIN-UUID', 'superadmin@aura.dev', 'Platform Owner', 'superadmin', NULL);

-- Addis Studio Admin
INSERT INTO profiles (id, email, display_name, role, org_id)
VALUES ('YOUR-ADMIN-UUID', 'admin@addis-studio.com', 'Studio Owner', 'admin',
        (SELECT id FROM organizations WHERE slug = 'addis-studio'));

-- Photographer
INSERT INTO profiles (id, email, display_name, role, org_id)
VALUES ('YOUR-PHOTO-UUID', 'photo1@addis-studio.com', 'Lead Photographer', 'employee',
        (SELECT id FROM organizations WHERE slug = 'addis-studio'));
```

---

## 3. Backend Setup (Python/FastAPI)

### 3.1 Clone and Navigate

```bash
cd /home/leul/Documents/github/Aura/apps/core
```

### 3.2 Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# or: .\venv\Scripts\activate  # Windows
```

### 3.3 Install Dependencies

```bash
pip install -r requirements.txt
```

### 3.4 Create Environment File

Create `apps/core/.env`:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key  # NOT the anon key

# JWT
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars

# CORS (for local dev)
ALLOWED_ORIGINS=http://localhost:3000

# Stripe (optional - for billing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3.5 Run the Backend

```bash
uvicorn main:app --reload --port 8000
```

### 3.6 Verify Health

```bash
curl http://localhost:8000/health
# Expected: {"status": "ok"}
```

### 3.7 Run Backend Tests

```bash
# All tests
pytest tests/ -v

# Just billing tests
pytest tests/test_stripe_webhooks.py tests/test_subscription_enforcement.py -v
```

---

## 4. Frontend Setup (Next.js)

### 4.1 Navigate

```bash
cd /home/leul/Documents/github/Aura/apps/web
```

### 4.2 Install Dependencies

```bash
pnpm install
```

### 4.3 Create Environment File

Create `apps/web/.env.local`:

```bash
# Supabase (public keys only!)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Backend URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# App URL (for Stripe redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe (for checkout - optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID_PRO=price_xxx
STRIPE_PRICE_ID_ENTERPRISE=price_yyy
```

### 4.4 Run the Frontend

```bash
pnpm dev
```

→ Opens at **http://localhost:3000**

### 4.5 Run Frontend Tests

```bash
pnpm test
```

---

## 5. Desktop App Setup (Tauri/Rust)

### 5.1 Prerequisites

```bash
# Install Rust (if not done)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri CLI
cargo install tauri-cli
```

### 5.2 Navigate

```bash
cd /home/leul/Documents/github/Aura/apps/desktop
```

### 5.3 Install Frontend Dependencies

```bash
pnpm install
```

### 5.4 Build Rust Backend

```bash
cd src-tauri
cargo build
```

### 5.5 Run Desktop App (Development)

```bash
# From apps/desktop directory
pnpm tauri dev
```

### 5.6 Build for Production

```bash
pnpm tauri build
```

→ Outputs to `apps/desktop/src-tauri/target/release/`

### 5.7 Enable Local AI (Optional)

```bash
# Download ONNX models
cd apps/desktop/scripts
chmod +x download_models.sh
./download_models.sh

# Build with AI feature
cd ../src-tauri
cargo build --features ai
```

### 5.8 Run Desktop Tests

```bash
cd apps/desktop/src-tauri
cargo test --all
```

---

## 6. Test Accounts & Role Testing

### 6.1 Available Test Accounts

| Role           | Email                     | Password          | Portal        | Capabilities                   |
| -------------- | ------------------------- | ----------------- | ------------- | ------------------------------ |
| **SuperAdmin** | `superadmin@aura.dev`     | `AuraSuper2026!`  | `/superadmin` | All tenants, system health     |
| **Admin**      | `admin@addis-studio.com`  | `AddisAdmin2026!` | `/admin`      | Own org photos, team, settings |
| **Employee**   | `photo1@addis-studio.com` | `AddisPhoto2026!` | `/admin`      | Upload, view (no delete)       |
| **Guest**      | _(no account)_            | _(none)_          | `/scan`       | Face search only               |

### 6.2 Role Testing Workflow

#### Test SuperAdmin

1. Go to http://localhost:3000/login
2. Login with `superadmin@aura.dev`
3. Should redirect to `/superadmin`
4. Verify:
   - [x] See all organizations in list
   - [x] Platform stats dashboard loads
   - [x] Can click "Manage" → enters tenant admin view
   - [x] Logs tab shows audit history

#### Test Admin

1. Login with `admin@addis-studio.com`
2. Should redirect to `/admin`
3. Verify:
   - [x] Only see "Addis Studio" data
   - [x] Can upload photos
   - [x] Can manage team (invite/remove)
   - [x] Settings → Security → MFA enrollment works
   - [x] Settings → Billing shows subscription

#### Test Employee

1. Login with `photo1@addis-studio.com`
2. Should redirect to `/admin`
3. Verify:
   - [x] Can upload photos
   - [x] Cannot access Settings
   - [x] Cannot delete photos
   - [x] Cannot manage team

#### Test RLS Isolation

1. Login as `admin@addis-studio.com`
2. Upload a photo
3. Logout
4. Login as `admin@gondar-photos.com`
5. Verify: Should NOT see Addis Studio's photos

---

## 7. QR Code & Guest Scan Testing

### 7.1 Generate Event QR Code (Admin)

1. Login as Admin (`admin@addis-studio.com`)
2. Navigate to **Gallery** or **Sources**
3. Click **Generate QR Code** (or find in Settings)
4. A QR code appears encoding a URL like:
   ```
   http://localhost:3000/scan?org=addis-studio&event=summer-wedding
   ```
5. **Save the QR image** for testing

### 7.2 Test Guest Face Scan

1. **Open Incognito browser** (not logged in)
2. Go to http://localhost:3000/scan (or scan the QR)
3. You should see:
   - Camera permission request
   - "Find Your Photos" prompt
4. **Take a selfie or upload a photo**
5. Wait for AI processing
6. Verify:
   - [x] Face is detected
   - [x] Matching photos are returned (if any were uploaded)
   - [x] No login required
   - [x] Can download found photos

### 7.3 End-to-End QR Test

1. **Admin uploads** 5 photos containing Person A's face
2. **Guest (Person A)** scans QR, takes selfie
3. **Expected**: Guest sees the 5 photos containing their face

---

## 8. MFA (Two-Factor Auth) Testing

### 8.1 Enable MFA (User)

1. Login as any user (e.g., `admin@addis-studio.com`)
2. Go to **Settings → Security**
3. Click **Enable Two-Factor Authentication**
4. A QR code appears
5. Scan with **Google Authenticator** or **Authy**
6. Enter the 6-digit code shown in your authenticator
7. MFA is now enabled!

### 8.2 Test MFA Login Flow

1. Logout
2. Login with email/password
3. Should redirect to `/login/mfa`
4. Enter 6-digit code from authenticator app
5. Should redirect to dashboard

### 8.3 Disable MFA

1. Go to **Settings → Security**
2. Click **Disable 2FA**
3. Confirm with password
4. MFA is now disabled

---

## 9. Billing & Subscription Testing

> **Note**: Requires Stripe keys configured in `.env`

### 9.1 View Pricing Page

1. Go to http://localhost:3000/pricing (public, no login needed)
2. See three tiers: Free, Pro, Enterprise

### 9.2 Test Stripe Checkout

1. Login as `admin@addis-studio.com`
2. Go to `/pricing` OR `/admin/settings/billing`
3. Click **Upgrade to Pro**
4. Redirects to Stripe Checkout
5. Use Stripe test card: `4242 4242 4242 4242`
6. Complete checkout
7. Should redirect back and show "Pro" status

### 9.3 Test Subscription Enforcement

After upgrading:

1. Check `/admin/settings/billing` shows "Active" status
2. Downgrade or cancel in Stripe Dashboard
3. Wait for webhook (or run manually)
4. Try accessing `/admin` → Should show 402 if subscription is `past_due` or `canceled`

### 9.4 Test Stripe Webhooks Locally

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Forward webhooks to local
stripe listen --forward-to localhost:8000/webhooks/stripe

# Copy the webhook signing secret (whsec_...) to .env
```

---

## 10. Desktop Sync Testing

### 10.1 Configure Sync

1. Open Desktop App (`pnpm tauri dev`)
2. Login with your credentials
3. Click **Add Folder**
4. Select a local folder with photos (e.g., `~/Pictures/TestPhotos`)
5. Watch the sync status indicator

### 10.2 Test One-Way Sync (Local → Cloud)

1. Add a new photo to the watched folder
2. Desktop app should detect it within seconds
3. Photo uploads to Supabase Storage
4. Check web admin panel → Photo appears

### 10.3 Test Bi-Directional Sync

1. Delete a photo in the web admin panel
2. Desktop app should mark local file as "deleted on cloud"
3. Check Conflicts panel if resolution needed

### 10.4 Test Conflict Resolution

1. Edit a photo locally (change metadata)
2. Simultaneously edit the same photo in web UI
3. Desktop shows "Conflict Detected"
4. Choose: **Keep Local**, **Keep Cloud**, or **Keep Both**

---

## 11. AI/Cloud Run Deployment

### 11.1 Prerequisites

```bash
# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
gcloud init
```

### 11.2 Deploy Backend to Cloud Run

```bash
cd apps/core

# Deploy
gcloud run deploy aura-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# Set environment variables
gcloud run services update aura-backend \
  --set-env-vars="SUPABASE_URL=https://xxx.supabase.co" \
  --set-env-vars="SUPABASE_KEY=xxx" \
  --set-env-vars="JWT_SECRET=xxx" \
  --set-env-vars="ALLOWED_ORIGINS=https://your-frontend.vercel.app"
```

### 11.3 Configure Frontend for Production

Update `apps/web/.env.local`:

```bash
NEXT_PUBLIC_BACKEND_URL=https://aura-backend-xxx-uc.a.run.app
```

### 11.4 Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import GitHub repo
3. Set **Root Directory**: `apps/web`
4. Add environment variables
5. Deploy

### 11.5 Verify Deployment

```bash
# Health check
curl https://aura-backend-xxx-uc.a.run.app/health

# Face indexing test
curl -X POST https://aura-backend-xxx-uc.a.run.app/api/index-photo \
  -F "file=@test-image.jpg" \
  -H "Authorization: Bearer YOUR_JWT"
```

---

## 12. Troubleshooting

### Backend Issues

| Problem               | Solution                                            |
| --------------------- | --------------------------------------------------- |
| `ModuleNotFoundError` | Run `pip install -r requirements.txt`               |
| CORS errors           | Check `ALLOWED_ORIGINS` in `.env`                   |
| `insightface` fails   | Install `opencv-python-headless`, check ONNX models |
| 500 errors            | Check `uvicorn` logs, verify Supabase connection    |

### Frontend Issues

| Problem                       | Solution                                       |
| ----------------------------- | ---------------------------------------------- |
| `NEXT_PUBLIC_*` undefined     | Restart dev server after changing `.env.local` |
| Login redirects to wrong page | Check profile.role in database                 |
| MFA page infinite loading     | Wrap with Suspense (already fixed)             |
| Stripe checkout fails         | Check `STRIPE_SECRET_KEY` is set               |

### Desktop Issues

| Problem            | Solution                                                       |
| ------------------ | -------------------------------------------------------------- |
| Rust build fails   | Run `rustup update`, check Cargo.toml deps                     |
| Tauri doesn't open | Check for port conflicts, run `pnpm tauri dev --verbose`       |
| Sync stuck         | Check network, verify backend URL in settings                  |
| AI not working     | Run `./scripts/download_models.sh`, build with `--features ai` |

### Database Issues

| Problem        | Solution                                     |
| -------------- | -------------------------------------------- |
| RLS blocking   | Check `org_id` in profiles matches photos    |
| Trigger errors | Run `007_fix_profile_role_security.sql`      |
| Auth fails     | Create user in Supabase Auth Dashboard first |

---

## Quick Reference Commands

```bash
# Backend
cd apps/core && source venv/bin/activate && uvicorn main:app --reload

# Frontend
cd apps/web && pnpm dev

# Desktop
cd apps/desktop && pnpm tauri dev

# All tests
cd apps/core && pytest -v
cd apps/web && pnpm test
cd apps/desktop/src-tauri && cargo test

# Build production
cd apps/web && pnpm build
cd apps/desktop && pnpm tauri build
```

---

**You're all set!** 🎉 Follow this guide step-by-step to set up the complete Aura Pro system.
