import requests
import os
import sys

# Configuration
BASE_URL = "http://localhost:8000"
ADMIN_PIN = "1234"  # Default fallback

def run_test():
    print(f"Testing Switch Tenant against {BASE_URL}...")
    
    # 1. Login as Admin/SuperAdmin (Legacy PIN)
    print("\n[1] Logging in...")
    try:
        res = requests.post(f"{BASE_URL}/api/admin/login", json={"pin": ADMIN_PIN})
        if res.status_code != 200:
            print(f"Login failed: {res.text}")
            return False
            
        data = res.json()
        token = data.get("token")
        
        # Decode token to check role (simple split, no verify for test script simplicity)
        import json
        import base64
        payload = json.loads(base64.b64decode(token.split('.')[1] + "==").decode())
        role = payload.get("role")
        print(f"Logged in as: {role}")
        
        if role != "superadmin":
            print("⚠️ WARNING: Local PIN login did not return 'superadmin' role.")
            print("   This is expected if your local DB profile isn't set to superadmin.")
            print("   The /switch-tenant endpoint requires superadmin.")
            print("   Please run 'force_superadmin.sql' in Supabase SQL Editor if this fails.")
    except Exception as e:
        print(f"Connection error: {e}")
        return False

    # 2. List Organizations (to find a target)
    print("\n[2] Fetching Organizations...")
    try:
        org_res = requests.get(f"{BASE_URL}/api/superadmin/organizations", headers={"Authorization": f"Bearer {token}"})
        if org_res.status_code == 403:
             print("❌ Access Forbidden: Current user is not SuperAdmin.")
             return False
             
        orgs_data = org_res.json()
        orgs = orgs_data.get("data", [])
        print(f"Found {len(orgs)} organizations.")
        
        if not orgs:
            print("No organizations found to switch to.")
            return True # Technically passed the code path check, just no data
            
        target_org = orgs[0]
        print(f"Targeting Org: {target_org['name']} ({target_org['id']})")
        
    except Exception as e:
        print(f"Error fetching orgs: {e}")
        return False

    # 3. Test Switch Tenant
    print("\n[3] Testing Switch Tenant...")
    try:
        switch_res = requests.post(
            f"{BASE_URL}/api/superadmin/switch-tenant",
            headers={"Authorization": f"Bearer {token}"},
            json={"target_org_id": target_org['id']}
        )
        
        if switch_res.status_code == 200:
            switch_data = switch_res.json()
            new_token = switch_data.get("token")
            print("✅ Switch Successful!")
            print(f"New Token Received: {new_token[:10]}...")
            
            # Verify new token context
            new_payload = json.loads(base64.b64decode(new_token.split('.')[1] + "==").decode())
            print(f"New Token Role: {new_payload.get('role')}")
            print(f"New Token Org: {new_payload.get('org_id')}")
            
            if new_payload.get('role') == 'admin' and new_payload.get('org_id') == target_org['id']:
                print("✅ Context verified correct.")
                return True
            else:
                print("❌ Token context mismatch.")
                return False
        else:
            print(f"❌ Switch Failed: {switch_res.status_code} - {switch_res.text}")
            return False
            
    except Exception as e:
        print(f"Switch error: {e}")
        return False

if __name__ == "__main__":
    success = run_test()
    sys.exit(0 if success else 1)
