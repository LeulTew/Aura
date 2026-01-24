# Aura - Deployed Environment Guide

This guide details how to run, login, and verify the Aura stack in a **deployed environment** (e.g., Render, Vercel, Railway).

## 1. Get Your Deployment URLs

Before proceeding, ensure you have your production URLs ready. You should have:

1.  **Backend URL**: The URL of your deployed Google Cloud Run service (`https://aura-backend-fkbpqh3hrq-uc.a.run.app`).
2.  **Frontend URL**: The URL of your deployed Next.js site (`https://aura-theta-one.vercel.app`).

## 2. Configuration

### Backend (apps/core)

Ensure your deployed backend (Cloud Run) has the following Environment Variables set:

- `SUPABASE_URL`: Your Supabase Project URL.
- `SUPABASE_KEY`: Your Supabase Service Role Key.
- `JWT_SECRET`: A strong secret key.
- `ALLOWED_ORIGINS`: Your Frontend URL (e.g., `https://aura-theta-one.vercel.app`) to allow CORS.

### Frontend (apps/web)

Ensure your deployed frontend (Vercel) has these Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
- `NEXT_PUBLIC_BACKEND_URL`: **https://aura-backend-fkbpqh3hrq-uc.a.run.app**
- `SUPABASE_SERVICE_ROLE_KEY`: (Your `service_role` key)

_Note: If you are running the frontend locally against a remote backend, update your local `.env.local` file with these values._

### Sync Agent (apps/sync-agent)

> ⚠️ **Note**: The current version of the Sync Agent has a hardcoded backend URL (`http://localhost:8000`) in `src-tauri/src/sync_worker.rs`.
> To use it with production:
>
> 1. Modify `apps/sync-agent/src-tauri/src/sync_worker.rs`: Change `http://localhost:8000` to your **Backend URL**.
> 2. Rebuild the app: `npm run tauri:build`.

## 3. Login Instructions

1.  Navigate to your **Frontend URL** (e.g., `https://aura-web.vercel.app/login`).
2.  **Email/Password**: Log in with your production Supabase credentials.
    - _Tip: Ensure you have created a user in your production Supabase Auth dashboard._

## 4. "Test All" (Validation Strategy)

Since you are "testing with website on" (Production), perform the following verification steps:

### A. Automated Unit Tests (Verify Code Integrity)

Run these locally to ensure the codebase is stable:

1.  **Backend**: `cd apps/core && pytest`
2.  **Frontend**: `cd apps/web && npm test`
3.  **Sync Agent**: `cd apps/sync-agent/src-tauri && cargo test`

### B. Manual Integration Test (Verify Deployed System)

1.  **Health Check**:
    - Visit `YOUR_BACKEND_URL/health`. It should return `{"status": "ok"}`.
    - Visit `YOUR_BACKEND_URL/` (Root). It should show the welcome message.
2.  **Face Scan**:
    - On the website, go to "Scan Face" or upload a photo.
    - Verify it returns matches or confirms no face found.
3.  **Sync (Desktop)** (If configured):
    - Launch the Sync Agent.
    - Login and point it to a folder.
    - Verify photos appear in the web gallery.

## 5. Troubleshooting

- **CORS Errors**: If the website cannot talk to the backend, check that `ALLOWED_ORIGINS` in the Backend config includes your Frontend URL.
- **Login Failed**: specific `Invalid credentials` meant the user doesn't exist in the Prod Supabase project. Check the Auth tab in Supabase.
