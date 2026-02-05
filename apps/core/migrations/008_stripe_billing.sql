-- Migration 008: Stripe Billing Schema
-- Phase 8A: Commercialization
-- Adds Stripe-related columns to organizations and creates webhook_events for idempotency.

-- ============================================
-- 1. ADD STRIPE COLUMNS TO ORGANIZATIONS
-- ============================================

ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none' 
        CHECK (subscription_status IN ('none', 'active', 'past_due', 'canceled', 'incomplete', 'trialing')),
    ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- Index for fast status lookups
CREATE INDEX IF NOT EXISTS organizations_subscription_status_idx 
    ON public.organizations(subscription_status);

-- ============================================
-- 2. WEBHOOK EVENTS TABLE (Idempotency)
-- ============================================
-- Stores processed Stripe event IDs to prevent duplicate processing.

CREATE TABLE IF NOT EXISTS public.webhook_events (
    id TEXT PRIMARY KEY,  -- Stripe event ID (e.g., evt_xxx)
    type TEXT NOT NULL,   -- Event type (e.g., checkout.session.completed)
    status TEXT DEFAULT 'received' CHECK (status IN ('received', 'processing', 'completed', 'failed')),
    payload JSONB,        -- Raw event data for audit/reprocessing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS webhook_events_created_at_idx 
    ON public.webhook_events(created_at);

-- ============================================
-- 3. RLS FOR WEBHOOK_EVENTS (Service Role Only)
-- ============================================

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service_role can access webhook_events (backend only)
-- No policies for authenticated/anon = they see nothing.
-- Service role bypasses RLS by default.

COMMENT ON TABLE public.webhook_events IS 
    'Stripe webhook events for idempotent processing. Access restricted to service_role.';

-- ============================================
-- 4. FUNCTION TO CHECK SUBSCRIPTION STATUS
-- ============================================

CREATE OR REPLACE FUNCTION public.is_subscription_active(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT subscription_status IN ('active', 'trialing')
    FROM public.organizations
    WHERE id = p_org_id;
$$;

COMMENT ON FUNCTION public.is_subscription_active IS 
    'Returns true if the organization has an active or trialing Stripe subscription.';
