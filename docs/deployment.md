# Aura - One-Click Verification Deployment Guide

This guide details how to deploy Aura for free using **Render** (Backend) and **Vercel** (Frontend).

## 1. Database (Supabase)

_Prerequisite: You must have a Supabase project._

1.  Go to [Supabase](https://supabase.com).
2.  Create a new project.
3.  Go to **Project Settings > API**.
4.  Note down:
    - `Project URL`
    - `anon` public key
    - `service_role` secret key (Keep this safe!)
5.  Go to **SQL Editor** and run the contents of:
    - `apps/core/multitenant_schema.sql`
    - `apps/core/supa_schema.sql`

---

## 2. Backend (Google Cloud Run)

_Serverless Container for Python/FastAPI_

1.  Ensure you have a Google Cloud Project (e.g., `aura`).
2.  **Deploy via CLI** (Simplest):
    ```bash
    gcloud run deploy aura-backend --source . --platform managed --region us-central1 --allow-unauthenticated
    ```
3.  **Environment Variables**:
    Set these in the Cloud Run Console > Edit & Deploy New Revision > Variables:
    - `SUPABASE_URL`: (From Step 1)
    - `SUPABASE_KEY`: (Your `service_role` key from Step 1)
    - `JWT_SECRET`: (Generate a random string)
    - `ALLOWED_ORIGINS`: `*` (Or your Vercel URL)
4.  **Copy the Service URL** (e.g., `https://aura-backend-fkbpqh3hrq-uc.a.run.app`). You will need this for the Frontend.

---

## 3. Frontend (Vercel)

_Global CDN for Next.js_

1.  Create an account at [Vercel.com](https://vercel.com).
2.  Click **Add New...** -> **Project**.
3.  Import your GitHub repository.
4.  **Configuration**:
    - **Framework Preset**: Next.js
    - **Root Directory**: `apps/web` (Click Edit to change this!)
5.  **Environment Variables**:
    - `NEXT_PUBLIC_SUPABASE_URL`: (From Step 1)
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Your `anon` key from Step 1)
    - `NEXT_PUBLIC_BACKEND_URL`: `https://aura-backend-fkbpqh3hrq-uc.a.run.app` (Your Cloud Run Service)
    - `SUPABASE_SERVICE_ROLE_KEY`: (Your `service_role` key - Required for some server-side ops)
6.  Click **Deploy**.

---

## 4. Verification

1.  Open your **Vercel URL**.
2.  Go to `/login`.
3.  Sign up or Log in.
4.  Upload a photo (Selfie).
5.  Wait for the process path check.
6.  **Success!**

## 5. Troubleshooting Cloud Deployments

- **Render "Build Failed"**: Ensure `apps/core/requirements.txt` exists and you set the Root Directory to `apps/core`.
- **"Application Error" on Render**: Check the "Logs" tab. Common issues are missing Env Vars.
- **Vercel "500 Error"**: Check Vercel logs. Usually means `NEXT_PUBLIC_BACKEND_URL` is wrong or the Backend is sleeping (Render free tier sleeps after 15 mins of inactivity).
