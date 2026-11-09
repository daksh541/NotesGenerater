# LECTRA — AI Academic Collaboration Platform

> **"One Classroom. Nine Sections. One Master Notebook."**

LECTRA is a production-grade AI academic collaboration platform designed specifically for university students studying across multiple lecture sections (Sections A through I).

The platform bridges classroom explanations, whiteboard and chalkboard handwritten derivations, professor-specific exam warnings, and official textbook/syllabus reference materials into verifiable Master Notes, Smart Reconstructed Diagrams, and Exam Study Kits.

---

## 🏛 System Architecture Overview

```mermaid
graph TD
    Client["University Student Browser / Mobile"] --> |HTTPS / JSON / Bearer JWT| Frontend["Frontend (Vercel SPA)"]
    Frontend --> |API Requests / Signed URLs| Backend["Backend API (FastAPI / Python 3.10)"]
    
    subgraph "LECTRA Core Services"
        Backend --> Synth["LECTRA Synthesis Service (10-Stage Pipeline)"]
        Backend --> Storage["Supabase Storage Manager (4 Buckets + Signed URLs)"]
        Backend --> Security["Crypto Layer (PBKDF2 Hashing, HS256 JWT, RLS)"]
        Backend --> Repo["Relational Persistence Layer"]
    end

    subgraph "Persistence & Cloud Infrastructure"
        Repo --> |Production| Postgres["Supabase PostgreSQL (13 Tables + RLS)"]
        Repo --> |Local Dev / Offline| SQLite["SQLite with WAL Journaling (lectra.db)"]
        Storage --> |Production Cloud| SupaStorage["Supabase Storage REST API"]
        Storage --> |Local Fallback| DiskStorage["Local Storage Root (./data/supabase_storage)"]
    end
```

### Preferred Production Topology
- **Frontend**: Hosted on **Vercel** with client-side rewrite handling (`vercel.json`), performance bundle code-splitting, and secure CSP/XSS headers.
- **Backend API**: Hosted on **Render**, **Railway**, **Google Cloud Run**, or a VPS via Docker (`Dockerfile`) or Procfile (`uvicorn backend.main:app`).
- **Database**: **Supabase PostgreSQL 15+** with 4 SQL migrations establishing schema, foreign keys, and Row Level Security (RLS) policies.
- **Storage**: **Supabase Storage** managing 4 dedicated buckets (`private-student-uploads`, `shared-academic-materials`, `generated-documents`, `generated-diagrams`) with time-limited HMAC-SHA256 signed URLs.

---

## 🚀 Key Modules & Capabilities

### 1. Authentication & Academic Onboarding
- **Strict Cryptography**: Passwords hashed with PBKDF2-HMAC-SHA256 (120,000 iterations); constant-time verification against timing attacks.
- **Supabase-Compatible JWTs**: HS256 access tokens and refresh tokens with strict session revocation in database.
- **1-Step Academic Onboarding**: University, Course, Semester, Subject, and Classroom Section (A–I) assignment.
- **Account Security**: Session expiration listeners, auto-logout on token revocation, and profile updating.

### 2. Academic Dashboard
- Live database statistics: Total Master Notes, Uploaded Sources, Available Study Kits, and Community Contributions.
- Quick navigation to enrolled subjects, recent master notes, workspaces, and upload history.
- Immediate one-click actions: Synthesize Master Notes, Browse Section Vault, Practice Timed Quizzes.

### 3. AI Notes Studio (Core Multimodal Engine)
- **Multi-Source Ingestion**:
  - Whiteboard and blackboard classroom photos (JPG, PNG, WEBP)
  - Handwritten student lecture notes
  - Official professor slides (PPT, PPTX)
  - Textbook and syllabus reference documents (PDF)
- **10-Stage Synthesis Pipeline**:
  1. *Upload Sources*: Validates file size (up to 50 MB), MIME headers, and sanitizes filenames.
  2. *Validate Files*: Enforces storage path traversal protections and RLS upload restrictions.
  3. *Extract Text*: Parses PDF and PPTX slide tables, bullets, and speaker notes.
  4. *Classroom OCR*: Detects board borders, enhances contrast, extracts mathematical equations, and records OCR confidence.
  5. *Analyze References*: Indexes formal textbook definitions, theorems, and chapter outline.
  6. *Contextual Merging*: Deduplicates repeated definitions while highlighting unique classroom derivations.
  7. *Generate Master Notes*: Synthesizes all 14 required sections, SVG diagrams, and Mermaid flowcharts.
  8. *Validate Output*: Audits accuracy, verifies citations, and flags potential conflicts.
  9. *Save to Database*: Atomically commits notes, diagrams, and study kits to the repository.
  10. *Display Notes*: Realtime notification dispatched to user interface.

### 4. Master Notes Viewer & Document Editor
- **3-Panel Workspace**:
  - *Left Panel*: Chapter outline, interactive table of contents, in-note keyword search, and note switcher.
  - *Center Panel*: 14-section structured notes, LaTeX equations ($Q = \lfloor N/2 \rfloor + 1$), interactive SVG/Mermaid diagrams, professor emphasis callouts, and in-place Markdown auto-saving editor.
  - *Right Panel*: Grounded AI Q&A Assistant providing answers with source citations and original image references.
- **Multi-Format Export**:
  - **PDF**: Vector-sharp, printable academic layout with professor dossier headers and citation footers.
  - **DOCX**: Real Word binary package with table formatting, callouts, and mathematical typography.
  - **Markdown (.md)**: Clean GitHub-Flavored Markdown for local Obsidian, Notion, or git archives.

### 5. Nine-Section Academic Vault (Sections A to I)
- Collaborative repository partitioned across all 9 classroom sections (A, B, C, D, E, F, G, H, I).
- Filter by Section, Subject, Chapter, Professor, Date, and Verification Status.
- **Cross-Section Comparison Engine**: Compares 7 pedagogical dimensions across multiple sections (e.g. Section A vs Section C):
  1. Topics covered
  2. Core definitions
  3. Governing formulas
  4. Classroom examples
  5. Whiteboard diagrams
  6. Professor verbal emphasis
  7. Additional lecture explanations
- **Explicit Permission Sharing**: Requires affirmative student consent before sharing private notes to the Vault.
- **Duplicate Detection**: Cosine/keyword analysis warns students of existing similar notes without auto-deletion.

### 6. Interactive Study Kits & AI Practice Engine
- **Multiple Choice Questions (MCQ)**: Instant feedback, explanation callouts, difficulty tags, and syllabus references.
- **Interactive Flashcards**: 3D animated flip cards, progress persistence (Mastered / Needs Review), and mastery counter.
- **Timed Practice Quizzes**: 10-minute exam countdown timer, question jumper, score submission, and topic-by-topic analytics.
- **Practice Question Evaluator**: Evaluates student free-form answers against model rubrics with formative feedback.
- **Exam Priority Analysis**: Ranks topics by midterm/final probability (Critical, High, Medium) based on professor emphasis.
- **Summary Sheets**: One-page summaries, detailed study notes, and last-minute revision cheat sheets.

### 7. Professor Library
- Pedagogical dossiers for university faculty (e.g., Dr. Aris Thorne, Prof. Elena Vance, Dr. Marcus Brody).
- Observable teaching styles, preferred terminology dictionaries, grading preferences, and high-frequency exam topics.
- One-click synthesis button configured to the professor's profile.

### 8. Community & Trust Verification System
- **Three-Tier Trust Hierarchy**:
  - `source_verified`: Cross-checked against official textbook publications.
  - `community_verified`: Audited, reviewed, and upvoted by peer scholars.
  - `unverified`: Newly uploaded raw classroom notes.
- Inaccuracy reporting mechanism and threaded peer replies.

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript 5.6, Tailwind CSS 3.4, Lucide React, Mermaid 12, Vite 8, Vitest 4 |
| **Backend API** | FastAPI, Python 3.10+, Pydantic v2, Uvicorn, Python-Multipart |
| **Database** | Supabase PostgreSQL 15+ (Production) / SQLite with WAL Mode (Local Development) |
| **File Storage** | Supabase Storage (4 Buckets with HMAC Signed URLs) / Local disk (`./data/supabase_storage`) |
| **Document Processing** | Docling, PyPDF, Python-PPTX, Python-Docx, Pillow, BeautifulSoup4 |
| **Vector & AI** | SeekDB / ChromaDB, LiteLLM, OpenAI / Gemini Vision OCR fallback |

---

## 📋 Environment Variables

Create a `.env` file in `NotebookLM-Lite/` based on `.env.example`:

```bash
# 1. Supabase Cloud Configuration (Set when connecting to Supabase)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_JWT_SECRET=your-32-character-or-longer-jwt-secret
SUPABASE_DB_URL=postgresql://postgres:your-db-password@db.your-project-ref.supabase.co:5432/postgres

# 2. Supabase Storage Buckets
SUPABASE_BUCKET_PRIVATE_UPLOADS=private-student-uploads
SUPABASE_BUCKET_SHARED_MATERIALS=shared-academic-materials
SUPABASE_BUCKET_GENERATED_DOCS=generated-documents
SUPABASE_BUCKET_GENERATED_DIAGRAMS=generated-diagrams
SUPABASE_SIGNED_URL_EXPIRES_IN=3600

# 3. Session Security
LECTRA_SESSION_TTL_SECONDS=86400
LECTRA_REFRESH_TTL_SECONDS=604800
LECTRA_PASSWORD_RESET_TTL_SECONDS=1800
LECTRA_EMAIL_VERIFY_TTL_SECONDS=86400

# 4. Local Development Fallbacks
LECTRA_DB_PATH=./data/lectra.db
LECTRA_STORAGE_DIR=./data/supabase_storage

# 5. Production CORS Settings
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://your-app.vercel.app
CORS_ORIGIN_REGEX=https://.*\.vercel\.app

# 6. AI Providers (Backend Only - NEVER expose to frontend)
OPENAI_API_KEY=sk-your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key

# 7. Frontend Environment (Set in Vercel project settings)
# VITE_API_BASE_URL=https://your-backend-api.onrender.com
```

> [!CAUTION]
> Never expose `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `OPENAI_API_KEY`, or `GEMINI_API_KEY` to frontend code or in public git commits. Frontend only needs `VITE_API_BASE_URL`.

---

## 🗄 Supabase Setup & Migration Guide

When deploying to Supabase PostgreSQL, execute the 4 migration scripts in order:

### Migration Execution Order
1. `supabase/migrations/20261108000001_lectra_phase2_schema.sql`  
   *Creates the 13 relational tables (`universities`, `courses`, `professors`, `subjects`, `chapters`, `workspaces`, `uploaded_sources`, `master_notes`, `community_contributions`, `study_kits`, `flashcards`, `quiz_questions`, `quiz_attempts`, `sessions`).*
2. `supabase/migrations/20261108000002_lectra_phase2_rls_and_storage.sql`  
   *Enables Row Level Security (RLS) on all tables and creates the 4 storage buckets.*
3. `supabase/migrations/20261108000000_lectra_phase4_section_vault_rls.sql`  
   *Configures cross-section access rules and community verification policies.*
4. `supabase/migrations/20261108000003_lectra_phase2_seed_catalog.sql`  
   *Seeds the catalog with Stanford University, CS-244, faculty profiles, and Section A–I metadata.*

### Running via Supabase CLI
```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

### Running via Supabase Web Dashboard
1. Go to your Supabase Project Dashboard -> **SQL Editor**.
2. Open and paste each migration file from `NotebookLM-Lite/supabase/migrations/` sequentially.
3. Click **Run**.
4. Navigate to **Storage** -> Verify the 4 buckets exist:
   - `private-student-uploads` (Private)
   - `shared-academic-materials` (Public/Section)
   - `generated-documents` (Private)
   - `generated-diagrams` (Private)

---

## 🏃 Local Development Instructions

### Quick Start (Single Command)
```bash
./start.sh
```
This activates the Python virtual environment, launches the FastAPI backend on port 8000, and starts the Vite frontend on port 5173.

### Manual Setup

#### 1. Backend Setup
```bash
cd NotebookLM-Lite
python3.10 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

#### 2. Frontend Setup
```bash
cd NotebookLM-Lite/frontend
npm install
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 🧪 Testing & Quality Assurance

### Run Full Backend Test Suite (Pytest)
```bash
cd NotebookLM-Lite
source .venv/bin/activate
pytest -v
```
*Current test suite: 220 tests (219 passed, 1 skipped, 0 failures).*

### Run the 21-Step Student E2E Workflow Test
```bash
cd NotebookLM-Lite
source .venv/bin/activate
pytest tests/test_phase6_e2e_student_workflow.py -v
```

### Run Frontend Typecheck & Vitest Suite
```bash
cd NotebookLM-Lite/frontend
npm run typecheck
npm test -- --run
```
*Current frontend tests: 3 test suites, 37 tests passing.*

### Run Production Build
```bash
cd NotebookLM-Lite/frontend
npm run build
```

---

## 🚢 Production Deployment Instructions

### 1. Frontend Deployment (Vercel)
1. Push your repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com), click **Add New** -> **Project**.
3. Set **Root Directory** to `NotebookLM-Lite/frontend`.
4. Framework Preset: **Vite**.
5. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://your-backend-api.onrender.com` (or your deployed backend URL).
6. Click **Deploy**.
7. The included `vercel.json` will automatically configure SPA rewrites and security headers.

### 2. Backend Deployment (Render / Railway / Cloud Run)

#### Using Render
1. In the [Render Dashboard](https://dashboard.render.com), create a **New Web Service**.
2. Connect your Git repository.
3. Set **Root Directory** to `NotebookLM-Lite`.
4. Environment: **Python 3**.
5. Build Command: `pip install -r requirements.txt`
6. Start Command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
7. In **Environment Variables**, provide:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`
   - `CORS_ORIGINS`: `https://your-frontend.vercel.app`
   - `OPENAI_API_KEY` (or `GEMINI_API_KEY`)

#### Using Docker (Cloud Run / Railway / Fly.io)
Deploy using the included multi-stage `NotebookLM-Lite/Dockerfile`:
```bash
docker build -t lectra-backend NotebookLM-Lite/
docker run -p 8000:8000 -e PORT=8000 lectra-backend
```

---

## 🎓 21-Step Demo Workflow Guide

For a live demonstration to university professors or students:

1. **Sign Up**: Register a student account (e.g. `maya.lin@stanford.edu`).
2. **Onboard**: Select Stanford University, B.S. Computer Science, Section A.
3. **Log In**: Authenticate with password; session token is securely stored.
4. **Create Workspace**: Create workspace *"CS244 - Consensus & Fault Tolerance"*.
5. **Upload Whiteboard**: In AI Notes Studio, drag-and-drop a whiteboard photo.
6. **Upload Reference**: Add an official chapter PDF or slides PPTX.
7. **Configure Synthesis**: Select Dr. Aris Thorne, Section A, Comprehensive style.
8. **Synthesize Notes**: Click *Synthesize Notes* and watch the 10-stage progress pipeline.
9. **Inspect & Edit**: Review structured formulas, LaTeX math, and edit in the Markdown tab.
10. **Export**: Click *Export* and download PDF, DOCX, and Markdown formats.
11. **Share with Consent**: Click *Share to Vault* and accept explicit permissions.
12. **Explore Vault**: Filter by Section B, C, D to see peer submissions.
13. **Compare Sections**: Click *Compare Sections* (Section A vs Section C) to see pedagogical differences.
14. **Generate Study Kit**: Click *Generate Study Kit* for MCQs, flashcards, and quizzes.
15. **Take MCQ Quiz**: Attempt questions with instant feedback and explanations.
16. **Timed Quiz**: Start the 10-minute quiz timer and submit answers.
17. **Review Results**: Inspect score breakdown and topic-by-topic analytics.
18. **Practice Flashcards**: Flip 3D cards and mark cards as *Mastered* to persist progress.
19. **AI Evaluation**: Submit a written answer to a practice question for formative rubric scoring.
20. **Log Out & Re-Login**: Verify token invalidation on logout and clean re-authentication.
21. **Persistence Verified**: Confirm all workspaces, notes, quiz attempts, and flashcard progress remain intact.

---

## 🔧 Troubleshooting Guide

| Issue | Cause | Resolution |
|---|---|---|
| **401 Unauthorized on API requests** | Expired JWT session or missing Bearer token | Call `/api/lectra/auth/login` or re-authenticate in the UI modal. |
| **403 Forbidden on notes or sources** | RLS policy prevents cross-user access to private data | Ensure user is accessing their own private resources or that the note has been shared to the Vault. |
| **Path Traversal Error (403)** | File path contains `..` or escapes storage directory | Path sanitization blocked an illegal path; use clean filenames. |
| **Vite Chunk Size Warning** | Monolithic client bundle | Resolved with Vite manual chunking for React, Lucide icons, and Mermaid. |
| **CORS Error in Browser** | Frontend origin not present in backend CORS list | Add frontend URL to `CORS_ORIGINS` environment variable or check `CORS_ORIGIN_REGEX`. |
| **PDF Export Formatting** | Browser print style media mismatch | LECTRA exports styled HTML with `@page` and `@media print` rules for clean printing and vector PDFs. |
| **Fallback to SQLite in Development** | `SUPABASE_URL` not configured in `.env` | Expected behavior: LECTRA seamlessly uses local SQLite (`lectra.db`) with complete schema when Supabase is not configured. |
