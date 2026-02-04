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

Last run: 2026-02-04 (Success - 50 Users)

```
Type     Name                      # reqs    # fails |   Avg     Min     Max    Med |  req/s
-------- ------------------------- ------- --------- | ------ ------- ------- ------ | ------
POST     /api/auth/login               50    0(0.00%) |   559       3    2635    250 |   6.25
GET      /health                       34    0(0.00%) |   268       0    2630      1 |   1.50
GET      /                             13    0(0.00%) |   251       0    2629      1 |   0.88
-------- ------------------------- ------- --------- | ------ ------- ------- ------ | ------
         Aggregated                    97    0(0.00%) |   416       0    2635      6 |   8.62
```

**Observation**: Login endpoint `/api/auth/login` handled 50 concurrent logins successfully with a median latency of 250ms. No errors were recorded.

---

## Next Steps

1. Start backend server before running tests
2. Target 100 concurrent users
3. Document P95/P99 latencies
4. Profile if targets exceeded
