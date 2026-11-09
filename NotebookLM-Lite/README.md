# LECTRA — Core Backend & Platform Engine (NotebookLM-Lite Base)

LECTRA is powered by the NotebookLM-Lite multimodal intelligence engine, specialized into a production university academic collaboration platform.

For the comprehensive platform documentation, architecture diagram, deployment guide, and 21-step student demo workflow, refer to the root [README.md](../README.md).

---

## 🏃 Quick Start (Backend & Frontend)

### 1. Launch Platform
```bash
# From workspace root
./start.sh
```

### 2. Run Backend Tests (Pytest)
```bash
source .venv/bin/activate
pytest -v
```

### 3. Run 21-Step Student E2E Lifecycle
```bash
pytest tests/test_phase6_e2e_student_workflow.py -v
```

### 4. Frontend Typecheck & Build
```bash
cd frontend
npm run typecheck
npm test -- --run
npm run build
```

---

## 🔒 Security Highlights

- **Cryptographic Password Hashing**: PBKDF2-HMAC-SHA256 with 120,000 iterations.
- **Signed Storage URLs**: Strict HMAC-SHA256 signatures with TTL expiration.
- **Path Traversal Protection**: Bucket boundaries strictly enforced.
- **Row Level Security (RLS)**: Private workspaces and notes isolated from cross-user inspection.
- **CORS Hardening**: Strict origin whitelisting with Vercel deployment regex.
