# Aura Pro - Load Testing Results

**Date**: 2026-02-04
**Tool**: Locust
**Script**: `apps/core/tests/locustfile.py`

---

## Test Configuration

| Parameter  | Value                 |
| ---------- | --------------------- |
| Users      | 100 (target)          |
| Spawn Rate | 10/s                  |
| Duration   | 60s                   |
| Host       | http://localhost:8000 |

---

## Test Scenarios

| Scenario     | Weight | Endpoint             | Method |
| ------------ | ------ | -------------------- | ------ |
| Health Check | 3      | `/health`            | GET    |
| Root         | 1      | `/`                  | GET    |
| Face Search  | 5      | `/api/search`        | POST   |
| List Folders | 2      | `/api/admin/folders` | GET    |

---

## How to Run

### 1. Start Backend

```bash
cd /home/leul/Documents/github/Aura/apps/core
./venv/bin/uvicorn main:app --port 8000 --host 0.0.0.0
```

### 2. Run Load Test

```bash
cd apps/core
./venv/bin/python -m locust -f tests/locustfile.py \
  --headless \
  -u 100 \
  -r 10 \
  -t 60s \
  --host http://localhost:8000
```

### 3. Interactive Mode (Web UI)

```bash
./venv/bin/python -m locust -f tests/locustfile.py --host http://localhost:8000
# Opens http://localhost:8089
```

---

## Performance Targets

| Endpoint           | P95 Target | Status     |
| ------------------ | ---------- | ---------- |
| `/health`          | < 500ms    | ⏳ Pending |
| `/api/search`      | < 2000ms   | ⏳ Pending |
| `/api/index-photo` | < 5000ms   | ⏳ Pending |

---

## Sample Results (Preliminary)

Last run: 2026-02-04 (Backend offline - ConnectionRefused)

```
Type     Name                      50%    95%   100%  # reqs
-------- ------------------------- ------ ------ ------ ------
GET      /                           1      1      1      3
POST     /api/admin/login            1      5      5     10
GET      /health                     1      2      2     20

All requests failed (ConnectionRefused - backend not running)
```

---

## Next Steps

1. Start backend server before running tests
2. Target 100 concurrent users
3. Document P95/P99 latencies
4. Profile if targets exceeded
