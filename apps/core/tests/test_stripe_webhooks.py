"""
Unit tests for Stripe webhook handler.
Phase 8A: Commercialization

Tests cover:
1. Signature verification (security)
2. Idempotent event processing
3. Subscription status updates
"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import json
import time
import hmac
import hashlib

# We need to mock environment variables before importing the app
import os
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-key")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_xxx")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_test_secret")

from main import app


client = TestClient(app)


def generate_stripe_signature(payload: str, secret: str) -> str:
    """Generate a valid Stripe webhook signature for testing."""
    timestamp = str(int(time.time()))
    signed_payload = f"{timestamp}.{payload}"
    signature = hmac.new(
        secret.encode("utf-8"),
        signed_payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return f"t={timestamp},v1={signature}"


class TestStripeWebhookSecurity:
    """Test signature verification and security measures."""
    
    @patch("routers.stripe_webhooks.WEBHOOK_SECRET", "whsec_test_secret")
    def test_missing_signature_header(self):
        """Webhook without signature should be rejected."""
        response = client.post(
            "/api/webhooks/stripe",
            json={"type": "test.event", "id": "evt_test"}
        )
        assert response.status_code == 400
        assert "Missing Stripe-Signature" in response.json()["detail"]
    
    @patch("routers.stripe_webhooks.WEBHOOK_SECRET", "whsec_test_secret")
    def test_invalid_signature(self):
        """Webhook with invalid signature should be rejected."""
        response = client.post(
            "/api/webhooks/stripe",
            content=json.dumps({"type": "test.event", "id": "evt_test"}),
            headers={
                "Stripe-Signature": "t=123,v1=invalid_signature",
                "Content-Type": "application/json"
            }
        )
        assert response.status_code == 400
        assert "Invalid" in response.json()["detail"]


class TestIdempotency:
    """Test idempotent event processing."""
    
    @patch("routers.stripe_webhooks.WEBHOOK_SECRET", "whsec_test_secret")
    @patch("routers.stripe_webhooks.get_client")
    @patch("routers.stripe_webhooks.stripe.Webhook.construct_event")
    def test_duplicate_event_skipped(self, mock_construct, mock_client):
        """Duplicate events should be skipped."""
        mock_event = {
            "id": "evt_duplicate_123",
            "type": "checkout.session.completed",
            "data": {"object": {"customer": "cus_xxx", "subscription": "sub_xxx"}}
        }
        mock_construct.return_value = mock_event
        
        # Mock database to return existing event
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "evt_duplicate_123", "status": "completed"}]
        )
        mock_client.return_value = mock_db
        
        response = client.post(
            "/api/webhooks/stripe",
            content=json.dumps(mock_event),
            headers={
                "Stripe-Signature": "t=123,v1=test",
                "Content-Type": "application/json"
            }
        )
        
        assert response.status_code == 200
        assert response.json()["status"] == "already_processed"


class TestSubscriptionEvents:
    """Test subscription status update logic."""
    
    @patch("routers.stripe_webhooks.WEBHOOK_SECRET", "whsec_test_secret")
    @patch("routers.stripe_webhooks.get_client")
    @patch("routers.stripe_webhooks.stripe.Webhook.construct_event")
    @patch("routers.stripe_webhooks.stripe.Subscription.retrieve")
    def test_checkout_completed_updates_org(self, mock_sub, mock_construct, mock_client):
        """checkout.session.completed should update organization to active."""
        mock_event = {
            "id": "evt_checkout_123",
            "type": "checkout.session.completed",
            "data": {"object": {"customer": "cus_abc", "subscription": "sub_xyz"}}
        }
        mock_construct.return_value = mock_event
        
        # Mock subscription retrieval
        mock_sub.return_value = MagicMock(current_period_end=1700000000)
        
        # Mock database - first query for idempotency (no existing event)
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_db.table.return_value.upsert.return_value.execute.return_value = MagicMock()
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "org_123"}]
        )
        mock_client.return_value = mock_db
        
        response = client.post(
            "/api/webhooks/stripe",
            content=json.dumps(mock_event),
            headers={
                "Stripe-Signature": "t=123,v1=test",
                "Content-Type": "application/json"
            }
        )
        
        assert response.status_code == 200
        assert response.json()["status"] == "success"
    
    @patch("routers.stripe_webhooks.WEBHOOK_SECRET", "whsec_test_secret")
    @patch("routers.stripe_webhooks.get_client")
    @patch("routers.stripe_webhooks.stripe.Webhook.construct_event")
    def test_subscription_deleted_marks_canceled(self, mock_construct, mock_client):
        """customer.subscription.deleted should mark org as canceled."""
        mock_event = {
            "id": "evt_cancel_456",
            "type": "customer.subscription.deleted",
            "data": {"object": {"customer": "cus_def"}}
        }
        mock_construct.return_value = mock_event
        
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_db.table.return_value.upsert.return_value.execute.return_value = MagicMock()
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "org_456"}]
        )
        mock_client.return_value = mock_db
        
        response = client.post(
            "/api/webhooks/stripe",
            content=json.dumps(mock_event),
            headers={
                "Stripe-Signature": "t=123,v1=test",
                "Content-Type": "application/json"
            }
        )
        
        assert response.status_code == 200


class TestPaymentFailure:
    """Test invoice.payment_failed handling."""
    
    @patch("routers.stripe_webhooks.WEBHOOK_SECRET", "whsec_test_secret")
    @patch("routers.stripe_webhooks.get_client")
    @patch("routers.stripe_webhooks.stripe.Webhook.construct_event")
    def test_payment_failed_marks_past_due(self, mock_construct, mock_client):
        """invoice.payment_failed should mark org as past_due."""
        mock_event = {
            "id": "evt_fail_789",
            "type": "invoice.payment_failed",
            "data": {"object": {"customer": "cus_ghi"}}
        }
        mock_construct.return_value = mock_event
        
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_db.table.return_value.upsert.return_value.execute.return_value = MagicMock()
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "org_789"}]
        )
        mock_client.return_value = mock_db
        
        response = client.post(
            "/api/webhooks/stripe",
            content=json.dumps(mock_event),
            headers={
                "Stripe-Signature": "t=123,v1=test",
                "Content-Type": "application/json"
            }
        )
        
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
