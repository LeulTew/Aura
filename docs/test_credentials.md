# Aura Test Credentials

This document contains test account credentials for the multi-tenant Aura platform.

## Setup Instructions

1. **Run the database migrations** in Supabase SQL Editor:

   - First: `apps/core/supa_schema.sql`
   - Second: `apps/core/multitenant_schema.sql`
   - Third: `apps/core/seed_data.sql` (creates organizations and trigger)

2. **Create users in Supabase Dashboard**:

   - Go to Authentication → Users → Add User
   - Create each user with the email and password below
   - After creating, note their UUID from the users table

3. **Link profiles to users**:
   - Run the INSERT statements in `seed_data.sql` with the actual UUIDs

---

## Test Accounts

### Tenant Admin (Addis Studio)

- **Email:** `admin@addis.studio`
- **Password:** `password123`
- **Role:** `admin`
- **Org:** Addis Studio (Pro)

### SuperAdmin

(Platform Level)

| Field            | Value                       |
| ---------------- | --------------------------- |
| **Email**        | `superadmin@aura.dev`       |
| **Password**     | `AuraSuper2026!`            |
| **Role**         | `superadmin`                |
| **Organization** | None (platform-wide access) |
| **Redirect**     | `/superadmin`               |

---

### Addis Studio (Tenant 1)

**Organization Slug:** `addis-studio`  
**Plan:** Pro (50GB)

| Email                     | Password          | Role     | Display Name       | Redirect         |
| ------------------------- | ----------------- | -------- | ------------------ | ---------------- |
| `admin@addis-studio.com`  | `AddisAdmin2026!` | admin    | Studio Owner       | `/admin`         |
| `admin2@addis-studio.com` | `AddisAdmin2026!` | admin    | Operations Manager | `/admin`         |
| `photo1@addis-studio.com` | `AddisPhoto2026!` | employee | Lead Photographer  | `/admin/capture` |
| `photo2@addis-studio.com` | `AddisPhoto2026!` | employee | Event Photographer | `/admin/capture` |
| `editor@addis-studio.com` | `AddisEdit2026!`  | employee | Photo Editor       | `/admin/capture` |

---

### Gondar Photos (Tenant 2)

**Organization Slug:** `gondar-photos`  
**Plan:** Free (5GB)

| Email                     | Password           | Role  | Display Name | Redirect |
| ------------------------- | ------------------ | ----- | ------------ | -------- |
| `admin@gondar-photos.com` | `GondarAdmin2026!` | admin | Gondar Owner | `/admin` |

---

## Role Capabilities

| Role           | Capabilities                                                     |
| -------------- | ---------------------------------------------------------------- |
| **superadmin** | Full platform access, manage all tenants, view all organizations |
| **admin**      | Manage own organization's photos, bundles, employees             |
| **employee**   | Upload photos, create bundles within assigned organization       |

---

## Quick Test Flow

1. **SuperAdmin**: Login → `/superadmin` → See all tenants, create new orgs
2. **Tenant Admin**: Login → `/admin` → Upload photos, manage bundles for their studio only
3. **Photographer**: Login → `/admin/capture` → Connect camera, upload photos for their studio

---

## Environment Variables

Make sure these are set in your `.env`:

```bash
# Backend
ADMIN_PIN=1234                    # Legacy fallback
JWT_SECRET=your-secure-secret

# Frontend
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
