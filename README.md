# LECTRA — AI Academic Collaboration Platform

> **"One Classroom. Nine Sections. One Master Notebook."**

LECTRA is a production-ready AI academic collaboration platform for university students studying across multiple sections (Sections A through I).

The platform bridges the gap between classroom explanations, chalkboard derivations, professor-specific exam warnings, and official textbook/syllabus reference materials.

---

## 🚀 Key Modules & Capabilities

1. **Academic Dashboard**
   - Live database statistics: Total Master Notes, Uploaded Sources, Available Study Kits, Community Contributions.
   - Enrolled Courses & Section breakdown (Section A through I).
   - Recent Master Notes list with instant PDF/DOCX downloads.
   - One-click quick actions for whiteboard uploads, reference PDFs, study kit generation, and vault browsing.

2. **AI Notes Studio (Core Feature)**
   - Multi-source upload supporting:
     - Classroom Whiteboard & Blackboard photos
     - Handwritten student lecture notes
     - Official Professor Reference PDFs & Syllabi
     - Presentation slides (PPT / PPTX)
   - Real 6-Stage Multimodal AI Pipeline:
     1. Stage 1: Image Preprocessing (auto-crop, contrast enhancement, perspective correction)
     2. Stage 2: Classroom OCR & Vision Extraction (equations, diagrams, board annotations)
     3. Stage 3: Reference Document Analysis (syllabus structure, textbook definitions)
     4. Stage 4: Contextual Synthesis (fusing classroom explanations into reference foundations)
     5. Stage 5: Intelligent Prioritization (marking professor emphasis vs AI inferences, exam tips)
     6. Stage 6: Master Notes & Study Kit Generation (structured notes, digital diagrams, MCQs, flashcards, timed quizzes, revision sheets)

3. **Master Notes Viewer & Document Editor**
   - 3-Panel workspace:
     - Left: Chapter outline, sections navigation, and in-note search.
     - Center: Beautifully formatted master notes with LaTeX formulas, smart digital diagrams, professor verbal emphasis callouts, "Needs Verification" badges, and in-place auto-saving editor.
     - Right: Grounded AI Assistant (answering questions with source citations) and reference document citations.
   - Multi-format document export: Vector-sharp printable PDF, DOCX, and Markdown.

4. **The Nine-Section Vault (Sections A to I)**
   - Collaborative repository partitioned across all 9 sections.
   - Filter by Section (A, B, C, D, E, F, G, H, I), Subject, Professor, Date, and Verification Status.
   - **Cross-Section Comparison Engine**: Compares how different professors and sections covered the same chapter (e.g. Section A vs Section C).
   - Inaccuracy reporting and peer upvoting system.

5. **Interactive Study Kits**
   - **Multiple Choice Questions (MCQ)** with instant answer validation, difficulty tags, and detailed explanations.
   - **Interactive Flashcards** with 3D flip card, status tracking (Mastered / Needs Review), and progress counters.
   - **Timed Practice Quiz** with countdown timer (10 mins), question navigation bar, real score submission, and topic-by-topic analytics.
   - **Exam Revision Sheet** with high-yield definitions, critical formulas, high-probability questions, and printable cheat sheet.

6. **Professor Library**
   - Faculty dossiers: Dr. Aris Thorne, Prof. Elena Vance, Dr. Marcus Brody, etc.
   - Observable teaching styles, preferred terminology dictionaries, formatting preferences, and high-frequency exam topics.
   - One-click note synthesis configured to professor's profile.

7. **Community & Trust Verification System**
   - Three-tier trust hierarchy:
     - `Source Verified`: Matched against official textbook publications.
     - `Community Reviewed`: Audited and upvoted by peers across sections.
     - `Unverified`: Newly shared classroom raw notes.

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide React, Mermaid 12, Vite 8.
- **Backend**: FastAPI, Python 3.10+, SQLite with WAL journal mode, Pydantic v2.
- **AI Processing**: Multimodal Vision & OCR with local fallback pipeline for seamless offline execution.
- **Storage**: Local filesystem storage with static mount under `/uploads`.

---

## 🏃 Running the Application

### 1. Backend Server
```bash
cd NotebookLM-Lite
source .venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend API and Swagger docs will be accessible at `http://localhost:8000/docs`.

### 2. Frontend Development Server
```bash
cd NotebookLM-Lite/frontend
npm run dev
```
The frontend UI will be available at `http://localhost:5173`.

### 3. Running Automated Tests
```bash
# Backend pytest suite
cd NotebookLM-Lite
PYTHONPATH=. .venv/bin/pytest tests/test_lectra_platform.py

# Frontend TypeScript check
cd NotebookLM-Lite/frontend
npm run typecheck
```
# NotesGenerater
