import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from routers.superadmin import list_organizations, create_tenant, require_superadmin
from routers.owner import get_my_organizations, switch_organization, SwitchOrgRequest

# Mock dependencies
@pytest.fixture
def mock_client():
    with patch("routers.superadmin.get_client") as m1, \
         patch("routers.owner.get_client") as m2:
        # Return same mock for both
        client = MagicMock()
        m1.return_value = client
        m2.return_value = client
        yield client

@pytest.fixture
def superadmin_auth():
    return {"user_id": "u1", "role": "superadmin"}

@pytest.fixture
def owner_auth():
    return {"user_id": "u2", "role": "admin"}

@pytest.fixture
def employee_auth():
    return {"user_id": "u3", "role": "employee"}

# --- SuperAdmin Tests ---

@pytest.mark.asyncio
async def test_superadmin_access_control(employee_auth):
    """Verify non-superadmins are rejected."""
    with pytest.raises(HTTPException) as exc:
        require_superadmin(employee_auth)
    assert exc.value.status_code == 403

@pytest.mark.asyncio
async def test_list_orgs_success(mock_client, superadmin_auth):
    """Verify superadmin can list orgs."""
    mock_client.table.return_value.select.return_value.order.return_value.execute.return_value.data = [{"id": "o1"}]
    
    res = await list_organizations(superadmin_auth)
    assert res["data"][0]["id"] == "o1"

# --- Owner Tests ---

@pytest.mark.asyncio
async def test_get_owner_orgs(mock_client, owner_auth):
    """Verify owner retrieves their organizations via RPC."""
    mock_client.rpc.return_value.execute.return_value.data = [
        {"org_id": "o1", "org_name": "Studio A", "role": "admin"}
    ]
    
    res = await get_my_organizations(owner_auth)
    assert res["success"] is True
    assert len(res["organizations"]) == 1
    assert res["organizations"][0]["org_id"] == "o1"

@pytest.mark.asyncio
async def test_switch_org_success(mock_client, owner_auth):
    """Verify owner can switch to an org they belong to."""
    
    # We need to handle multiple distinct calls.
    # The code relies on chaining: table().select()...execute()
    # Since we can't easily distinguish chains by args in simple mocks, 
    # we'll use side_effect on the final `execute()` call to return sequence of datas.
    
    # Sequence of calls in switch_organization:
    # 1. access_check (execute called) -> returns [{"role": "admin"}]
    # 2. org_result (execute called) -> returns {"id": "o2", "name": "B", "slug": "b"}
    # 3. profile update (execute called) -> returns whatever (not used)
    # 4. profile fetch (execute called) -> returns {"email": "e@e.com"}
    
    mock_execute = mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute
    # Note: The chain lengths vary slightly but eventually they all hit 'execute'.
    # A robust way is to mock the `execute` method of ANY chain.
    
    # Let's try a simpler approach: Mocking the `data` attribute lookup
    # But `access_check.data` is accessed. 
    
    # Let's mock the `execute` return values in order.
    # We need to catch all possible chain paths.
    
    # Common final object mock
    mock_response = MagicMock()
    
    # Valid response datas in order
    responses = [
        MagicMock(data=[{"role": "admin"}]), # 1. Access Check (List)
        MagicMock(data={"id": "o2", "name": "B", "slug": "b"}), # 2. Org Details (Single)
        MagicMock(data={}), # 3. Update (ignored)
        MagicMock(data={"email": "e@e.com"}) # 4. Profile (Single)
    ]
    
    # We set side_effect on the `execute` method.
    # The challenge is finding *which* execute method.
    # client.table(...) returns a QueryBuilder.
    # We can make client.table return the SAME builder, and its .execute returns from list.
    
    txn_mock = MagicMock()
    txn_mock.execute.side_effect = responses
    
    # Chain setup to ensure all paths eventually lead to txn_mock
    # This is a bit "catch-all" for the fluent API
    mock_client.table.return_value = txn_mock
    txn_mock.select.return_value = txn_mock
    txn_mock.update.return_value = txn_mock
    txn_mock.eq.return_value = txn_mock
    txn_mock.single.return_value = txn_mock
    
    req = SwitchOrgRequest(org_id="o2")
    res = await switch_organization(req, owner_auth)
    
    assert res["success"] is True
    assert "token" in res
    assert res["organization"]["id"] == "o2"

@pytest.mark.asyncio
async def test_switch_org_forbidden(mock_client, owner_auth):
    """Verify owner cannot switch to random org."""
    # 1. Mock access check (empty = no access)
    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
    
    req = SwitchOrgRequest(org_id="o3")
    with pytest.raises(HTTPException) as exc:
        await switch_organization(req, owner_auth)
    assert exc.value.status_code == 403
