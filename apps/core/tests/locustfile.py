from locust import HttpUser, task, between
import json

class AuraUser(HttpUser):
    wait_time = between(1, 3)
    token = None
    
    def on_start(self):
        """Login at start of session to get JWT token."""
        # Try Admin Login (MVP PIN flow)
        # In production this might be disabled or changed, but for now it's our best entry point
        response = self.client.post("/api/admin/login", json={"pin": "1234"})
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("token")
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
    
    @task(3)
    def health_check(self):
        """Heavy traffic on health check (lightweight endpoint)."""
        self.client.get("/health")
        
    @task(1)
    def root_endpoint(self):
        """Check root endpoint."""
        self.client.get("/")

    @task(5)
    def search_faces_simulation(self):
        """Simulate face search (CPU intensive)."""
        if not self.token:
            return
            
        # Simulate face search with a random embedding
        # 512-dim vector for InsightFace
        dummy_embedding = [0.1] * 512
        
        self.client.post(
            "/api/search", 
            json={
                "embedding": dummy_embedding,
                "threshold": 0.6,
                "limit": 20
            }, 
            headers={"Authorization": f"Bearer {self.token}"}
        )
    
    @task(2)
    def list_folders(self):
        """List administrative folders."""
        if not self.token:
            return
            
        self.client.get(
            "/api/admin/folders?path=/", 
            headers={"Authorization": f"Bearer {self.token}"}
        )
