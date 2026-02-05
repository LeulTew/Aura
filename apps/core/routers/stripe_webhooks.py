"""
Stripe Webhook Handler for Aura Pro.
Phase 8A: Commercialization

Handles Stripe events for subscription management with:
- Signature verification (security)
- Idempotent processing (stores event IDs in webhook_events table)
- Subscription status updates to organizations table
"""
import os
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, Header
import stripe

from database_supabase import get_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

# Initialize Stripe with API key
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")


def ensure_event_not_processed(event_id: str, event_type: str, payload: dict) -> bool:
    """
    Check if event was already processed. If not, mark as 'processing'.
    Returns True if event should be processed, False if already handled.
    """
    client = get_client()
    
    # Check existing
    existing = client.table("webhook_events").select("id, status").eq("id", event_id).execute()
    
    if existing.data and len(existing.data) > 0:
        status = existing.data[0].get("status", "")
        if status in ("completed", "processing"):
            logger.info(f"Skipping duplicate event {event_id} (status: {status})")
            return False
    
    # Insert or update to 'processing'
    client.table("webhook_events").upsert({
        "id": event_id,
        "type": event_type,
        "status": "processing",
        "payload": payload,
        "created_at": datetime.now(timezone.utc).isoformat()
    }).execute()
    
    return True


def mark_event_completed(event_id: str):
    """Mark an event as successfully processed."""
    client = get_client()
    client.table("webhook_events").update({
        "status": "completed",
        "processed_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", event_id).execute()


def mark_event_failed(event_id: str):
    """Mark an event as failed for retry/investigation."""
    client = get_client()
    client.table("webhook_events").update({
        "status": "failed"
    }).eq("id", event_id).execute()


def update_organization_subscription(
    stripe_customer_id: str,
    stripe_subscription_id: str | None,
    status: str,
    current_period_end: datetime | None
):
    """Update organization billing fields based on Stripe event."""
    client = get_client()
    
    update_data = {
        "subscription_status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if stripe_subscription_id:
        update_data["stripe_subscription_id"] = stripe_subscription_id
    
    if current_period_end:
        update_data["current_period_end"] = current_period_end.isoformat()
    
    result = client.table("organizations").update(update_data).eq(
        "stripe_customer_id", stripe_customer_id
    ).execute()
    
    if result.data:
        logger.info(f"Updated org subscription for customer {stripe_customer_id}: {status}")
    else:
        logger.warning(f"No organization found for stripe_customer_id: {stripe_customer_id}")


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature")
):
    """
    Stripe webhook endpoint.
    Verifies signature, ensures idempotency, and processes subscription events.
    """
    if not WEBHOOK_SECRET:
        logger.error("STRIPE_WEBHOOK_SECRET not configured")
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature header")
    
    # Get raw body for signature verification
    payload = await request.body()
    
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, WEBHOOK_SECRET
        )
    except ValueError as e:
        logger.error(f"Invalid payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    event_id = event["id"]
    event_type = event["type"]
    event_data = event["data"]["object"]
    
    logger.info(f"Received Stripe event: {event_type} ({event_id})")
    
    # Idempotency check
    if not ensure_event_not_processed(event_id, event_type, event):
        return {"status": "already_processed"}
    
    try:
        # Handle specific event types
        if event_type == "checkout.session.completed":
            # Customer completed checkout - subscription created
            customer_id = event_data.get("customer")
            subscription_id = event_data.get("subscription")
            
            if customer_id and subscription_id:
                # Fetch subscription details
                subscription = stripe.Subscription.retrieve(subscription_id)
                period_end = datetime.fromtimestamp(
                    subscription.current_period_end, tz=timezone.utc
                )
                
                update_organization_subscription(
                    stripe_customer_id=customer_id,
                    stripe_subscription_id=subscription_id,
                    status="active",
                    current_period_end=period_end
                )
        
        elif event_type == "customer.subscription.updated":
            customer_id = event_data.get("customer")
            subscription_id = event_data.get("id")
            status = event_data.get("status")  # active, past_due, canceled, etc.
            period_end_ts = event_data.get("current_period_end")
            
            period_end = datetime.fromtimestamp(period_end_ts, tz=timezone.utc) if period_end_ts else None
            
            update_organization_subscription(
                stripe_customer_id=customer_id,
                stripe_subscription_id=subscription_id,
                status=status,
                current_period_end=period_end
            )
        
        elif event_type == "customer.subscription.deleted":
            customer_id = event_data.get("customer")
            
            update_organization_subscription(
                stripe_customer_id=customer_id,
                stripe_subscription_id=None,
                status="canceled",
                current_period_end=None
            )
        
        elif event_type == "invoice.payment_failed":
            customer_id = event_data.get("customer")
            
            # Mark as past_due for failed payments
            update_organization_subscription(
                stripe_customer_id=customer_id,
                stripe_subscription_id=None,
                status="past_due",
                current_period_end=None
            )
        
        else:
            logger.info(f"Unhandled event type: {event_type}")
        
        mark_event_completed(event_id)
        return {"status": "success", "event_id": event_id}
        
    except Exception as e:
        logger.error(f"Error processing event {event_id}: {e}")
        mark_event_failed(event_id)
        raise HTTPException(status_code=500, detail=str(e))
