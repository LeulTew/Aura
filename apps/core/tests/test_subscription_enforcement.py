"""
Unit tests for subscription enforcement middleware.
Phase 8A: Commercialization

Tests that:
1. Active subscriptions are allowed
2. Past due subscriptions are blocked with 402
3. Canceled subscriptions are blocked with 402
4. Superadmins bypass the check
"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException

import os
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-key")
os.environ.setdefault("JWT_SECRET", "test-secret")

from dependencies import require_active_subscription, get_auth_context


class TestSubscriptionEnforcement:
    """Test subscription status enforcement."""
    
    @patch("dependencies.get_auth_context")
    @patch("database_supabase.get_client")
    def test_active_subscription_allowed(self, mock_client, mock_auth):
        """Active subscriptions should be allowed."""
        mock_auth.return_value = {"role": "admin", "org_id": "org-123"}
        
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"subscription_status": "active"}
        )
        mock_client.return_value = mock_db
        
        result = require_active_subscription("Bearer test-token")
        
        assert result["role"] == "admin"
        assert result["org_id"] == "org-123"
    
    @patch("dependencies.get_auth_context")
    @patch("database_supabase.get_client")
    def test_past_due_subscription_blocked(self, mock_client, mock_auth):
        """Past due subscriptions should return 402."""
        mock_auth.return_value = {"role": "admin", "org_id": "org-456"}
        
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"subscription_status": "past_due"}
        )
        mock_client.return_value = mock_db
        
        with pytest.raises(HTTPException) as exc_info:
            require_active_subscription("Bearer test-token")
        
        assert exc_info.value.status_code == 402
        assert "past_due" in exc_info.value.detail
    
    @patch("dependencies.get_auth_context")
    @patch("database_supabase.get_client")
    def test_canceled_subscription_blocked(self, mock_client, mock_auth):
        """Canceled subscriptions should return 402."""
        mock_auth.return_value = {"role": "employee", "org_id": "org-789"}
        
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"subscription_status": "canceled"}
        )
        mock_client.return_value = mock_db
        
        with pytest.raises(HTTPException) as exc_info:
            require_active_subscription("Bearer test-token")
        
        assert exc_info.value.status_code == 402
        assert "canceled" in exc_info.value.detail
    
    @patch("dependencies.get_auth_context")
    def test_superadmin_bypasses_check(self, mock_auth):
        """Superadmins should bypass subscription check."""
        mock_auth.return_value = {"role": "superadmin", "org_id": None}
        
        result = require_active_subscription("Bearer test-token")
        
        assert result["role"] == "superadmin"
    
    @patch("dependencies.get_auth_context")
    def test_guest_bypasses_check(self, mock_auth):
        """Guests (no org) should bypass subscription check."""
        mock_auth.return_value = {"role": "guest", "org_id": None}
        
        result = require_active_subscription("Bearer test-token")
        
        assert result["role"] == "guest"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
