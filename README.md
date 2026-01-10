# Aura

> **Intelligent Photo Retrieval** — Find your photos instantly with facial recognition.

## Features

- 📸 **Face Scanning** — Take a selfie to find all photos of yourself
- 🧠 **AI-Powered** — InsightFace (ONNX Runtime) with LanceDB vector search
- ⚡ **Instant Results** — Sub-second matching with thumbnail pre-loading
- 🚀 **Low Memory** — Optimized for free-tier hosting (<500MB RAM)
- 📅 **Smart Organization** — Auto-groups photos by date (EXIF/Time)
- 📦 **Bundle Sharing** — Curate photos into bundles and share via QR code
- 🎨 **Premium UI** — Dark mode, glassmorphism, and smooth shared-element transitions
- 📱 **Mobile-First** — Flip camera support, native share/save to camera roll

## Tech Stack

| Layer    | Technology                        |
| -------- | --------------------------------- |
| Frontend | Next.js 15, React 19, TailwindCSS |
| Backend  | FastAPI, Python 3.12, InsightFace |
| Database | LanceDB (vector embeddings)       |
| AI Model | Buffalo_L (ArcFace ONNX)          |

## 🧠 AI Architecture: Legacy vs Modern

We migrated from **DeepFace** to **InsightFace** to enable free-tier hosting without sacrificing accuracy.

| Feature       | 🐢 DeepFace (Legacy)      | 🚀 InsightFace (Current)           |
| :------------ | :------------------------ | :--------------------------------- |
| **Model**     | GhostFaceNet (TensorFlow) | Buffalo_L (ArcFace/ONNX)           |
| **RAM Usage** | ~1.5 GB (Heavy)           | **< 300 MB (Efficient)**           |
| **Speed**     | 2-3s initialization       | **< 0.5s initialization**          |
| **Accuracy**  | High (State-of-the-art)   | **High (Industry Standard)**       |
| **Platform**  | Requires VPS / Paid GPU   | **Runs on Free Tier (Render/One)** |

> **Why we chose Buffalo_L/ONNX:**
> While DeepFace offers excellent research-grade models, its TensorFlow backend is too heavy for standard free-tier containers (512MB RAM limit). Buffalo_L provides near-identical accuracy for real-world face retrieval but runs on a fraction of the resources, making Aura cost-effective to host.

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- pnpm

### Installation

```bash
# Clone
git clone https://github.com/LeulTew/Aura.git
cd Aura

# Frontend
cd apps/web && pnpm install

# Backend
cd ../core
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### Running Locally

```bash
# Terminal 1: Backend
cd apps/core
./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend
cd apps/web
pnpm dev -p 3000 -H 0.0.0.0
```

Open http://localhost:3000

---

## Mobile Access via Serveo (Important!)

Since the camera requires HTTPS on mobile browsers, use [Serveo](https://serveo.net) to expose your local dev server:

```bash
# Terminal 3: Tunnel
ssh -o StrictHostKeyChecking=no -R 80:localhost:3000 serveo.net
```

Serveo will output a URL like:

```
https://af256f8fc97c58f5-196-188-244-6.serveousercontent.com
```

### Add to Next.js Config

Update `apps/web/next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "http://localhost:3000",
    "YOUR_SERVEO_URL_HERE.serveousercontent.com",
  ],
  // ... rewrites
};
```

### Notes

- The backend runs on `localhost:8000` and is proxied via Next.js rewrites
- Serveo tunnels the frontend only; API calls go through the proxy
- Works on mobile with camera access via HTTPS

---

## ✅ Testing & Reliability

We believe in shipping code that works. Aura features a comprehensive test suite covering both the polished UI and the powerful AI backend, aiming for >90% code coverage.

### Running the Suite

**Frontend (Web)**
We use **Jest** and **React Testing Library** to verify every interaction, from the innovative "hold-to-scan" button to the complex gallery selection logic.

```bash
cd apps/web
npm test              # Run all tests
npm run test:watch    # Interactive dev mode
npm run test:coverage # Generate detailed coverage report
```

**Backend (Core)**
Our Python tests rely on **pytest** to ensure the facial recognition pipeline and vector database are rock-solid without needing a GPU.

```bash
cd apps/core
source venv/bin/activate
pytest                # Run all tests
pytest -v             # Verbose output with pass/fail
pytest --cov          # Check coverage percentage
```

### Philosophy

- **Mock Responsibly** — We simulate the webcam, file system, and neural network models during testing. This keeps our tests blazingly fast (seconds, not minutes) and determinstic.
- **Critical Paths First** — We prioritize testing user-critical flows like "scanning a face" and "downloading a bundle" to ensure the core experience never breaks.
- **Component Isolation** — Each UI component (like the `VoidBackground` or `CameraView`) is tested in isolation to catch visual logic bugs early.

---

## API Endpoints

| Endpoint        | Method | Description                  |
| --------------- | ------ | ---------------------------- |
| `/api/scan`     | POST   | Scan directory for faces     |
| `/api/search`   | POST   | Upload selfie → find matches |
| `/api/image`    | GET    | Serve image by path          |
| `/api/db/stats` | GET    | Database statistics          |
| `/health`       | GET    | Health check                 |

## Project Structure

```
Aura/
├── apps/
│   ├── core/          # FastAPI backend
│   │   ├── main.py    # API endpoints
│   │   ├── processor.py  # Face processing
│   │   └── database.py   # LanceDB integration
│   └── web/           # Next.js frontend
│       └── src/
│           ├── app/page.tsx  # Main app
│           └── components/   # UI components
└── project_plan.md    # Detailed roadmap
```

## License

MIT
