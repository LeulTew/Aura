
import pytest
from unittest.mock import MagicMock, patch
from main import invite_user, InviteRequest

# Mock Auth Context
def mock_auth_admin():
    return {
        "user_id": "admin_user",
        "role": "admin",
        "org_id": "test_org",
        "org_slug": "test_org_slug"
    }

def mock_auth_employee():
    return {
        "user_id": "emp_user",
        "role": "employee",
        "org_id": "test_org"
    }

@pytest.mark.asyncio
async def test_invite_success():
    # Mock the Supabase client and its chains
    mock_supabase = MagicMock()
    # Mock auth.admin.invite_user_by_email response
    mock_user = MagicMock()
    mock_user.id = "new_user_123"
    mock_invite_res = MagicMock()
    mock_invite_res.user = mock_user
    mock_supabase.auth.admin.invite_user_by_email.return_value = mock_invite_res
    
    # Mock table('profiles').upsert().execute()
    mock_supabase.table.return_value.upsert.return_value.execute.return_value = MagicMock()
    
    # Mock log_usage (table insert)
    mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock()

    with patch("database_supabase.get_client", return_value=mock_supabase):
        req = InviteRequest(email="newbie@test.com", role="employee")
        auth = mock_auth_admin()
        
        response = await invite_user(req, auth)
        
        assert response["success"] == True
        assert response["user_id"] == "new_user_123"
        
        # Verify invite called with correct args
        mock_supabase.auth.admin.invite_user_by_email.assert_called_once()
        args, kwargs = mock_supabase.auth.admin.invite_user_by_email.call_args
        assert args[0] == "newbie@test.com"
        assert kwargs["options"]["data"]["org_id"] == "test_org"
        assert kwargs["options"]["data"]["role"] == "employee"

@pytest.mark.asyncio
async def test_invite_forbidden_for_employee():
    from fastapi import HTTPException
    
    req = InviteRequest(email="hacker@test.com", role="admin")
    auth = mock_auth_employee()
    
    with pytest.raises(HTTPException) as excinfo:
        await invite_user(req, auth)
    
    assert excinfo.value.status_code == 403

@pytest.mark.asyncio
async def test_invite_fail_handling():
    from fastapi import HTTPException
    
    # Simulate an error from Supabase
    mock_supabase = MagicMock()
    mock_supabase.auth.admin.invite_user_by_email.side_effect = Exception("User already exists")
    
    with patch("database_supabase.get_client", return_value=mock_supabase):
        req = InviteRequest(email="exists@test.com", role="employee")
        auth = mock_auth_admin()
        
        with pytest.raises(HTTPException) as excinfo:
            await invite_user(req, auth)
        
        assert excinfo.value.status_code == 400
        assert "User already exists" in excinfo.value.detail
