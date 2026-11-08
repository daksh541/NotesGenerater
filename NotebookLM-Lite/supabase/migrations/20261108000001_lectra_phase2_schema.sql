-- ============================================================================
-- LECTRA PHASE 2: CORE POSTGRESQL DATABASE SCHEMA MIGRATION
-- Target: Supabase PostgreSQL 15+
-- Description: Complete relational schema for LECTRA Academic Platform
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. UNIVERSITIES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.universities (
    id TEXT PRIMARY KEY DEFAULT ('univ_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    name TEXT NOT NULL UNIQUE,
    domain TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_universities_name ON public.universities(name);

-- ----------------------------------------------------------------------------
-- 2. COURSES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.courses (
    id TEXT PRIMARY KEY DEFAULT ('crs_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    university_id TEXT NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    course_name TEXT NOT NULL,
    course_code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_courses_univ_code UNIQUE (university_id, course_code)
);

CREATE INDEX IF NOT EXISTS idx_courses_university_id ON public.courses(university_id);
CREATE INDEX IF NOT EXISTS idx_courses_code ON public.courses(course_code);

-- ----------------------------------------------------------------------------
-- 3. PROFESSORS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.professors (
    id TEXT PRIMARY KEY DEFAULT ('prof_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    university_id TEXT NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
    title TEXT NOT NULL DEFAULT 'Professor',
    department TEXT NOT NULL DEFAULT 'Computer Science',
    email TEXT,
    avatar_url TEXT,
    sections_taught JSONB NOT NULL DEFAULT '["A"]'::jsonb,
    teaching_style TEXT NOT NULL DEFAULT '',
    exam_focus_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    preferred_terminology JSONB NOT NULL DEFAULT '{}'::jsonb,
    formatting_preferences TEXT NOT NULL DEFAULT '',
    reference_materials_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_professors_university_id ON public.professors(university_id);
CREATE INDEX IF NOT EXISTS idx_professors_full_name ON public.professors(full_name);

-- ----------------------------------------------------------------------------
-- 4. SUBJECTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
    id TEXT PRIMARY KEY DEFAULT ('subj_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    subject_code TEXT NOT NULL,
    professor_id TEXT REFERENCES public.professors(id) ON DELETE SET NULL,
    teacher TEXT NOT NULL DEFAULT '',
    semester TEXT NOT NULL DEFAULT 'Fall 2026',
    description TEXT,
    color TEXT NOT NULL DEFAULT '#1E3A8A',
    chapters_count INTEGER NOT NULL DEFAULT 0,
    active_sections JSONB NOT NULL DEFAULT '["A","B","C","D","E","F","G","H","I"]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_subjects_course_code UNIQUE (course_id, subject_code)
);

CREATE INDEX IF NOT EXISTS idx_subjects_course_id ON public.subjects(course_id);
CREATE INDEX IF NOT EXISTS idx_subjects_code ON public.subjects(subject_code);
CREATE INDEX IF NOT EXISTS idx_subjects_professor_id ON public.subjects(professor_id);

-- ----------------------------------------------------------------------------
-- 5. CHAPTERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chapters (
    id TEXT PRIMARY KEY DEFAULT ('chp_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    chapter_name TEXT NOT NULL,
    chapter_number INTEGER NOT NULL CHECK (chapter_number > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_chapters_subject_number UNIQUE (subject_id, chapter_number)
);

CREATE INDEX IF NOT EXISTS idx_chapters_subject_id ON public.chapters(subject_id);

-- ----------------------------------------------------------------------------
-- 6. PROFILES (Linked to Supabase auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    university_id TEXT REFERENCES public.universities(id) ON DELETE SET NULL,
    course_id TEXT REFERENCES public.courses(id) ON DELETE SET NULL,
    subject_id TEXT REFERENCES public.subjects(id) ON DELETE SET NULL,
    university_name TEXT NOT NULL DEFAULT 'Stanford University',
    course_name TEXT NOT NULL DEFAULT 'B.S. Computer Science & AI',
    semester TEXT NOT NULL DEFAULT 'Semester 5 (Fall 2026)',
    section TEXT NOT NULL DEFAULT 'A' CHECK (section IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I')),
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'educator', 'admin')),
    avatar_url TEXT,
    bio TEXT,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_university_id ON public.profiles(university_id);
CREATE INDEX IF NOT EXISTS idx_profiles_section ON public.profiles(section);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ----------------------------------------------------------------------------
-- 7. WORKSPACES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
    id TEXT PRIMARY KEY DEFAULT ('ws_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id TEXT REFERENCES public.subjects(id) ON DELETE SET NULL,
    chapter_id TEXT REFERENCES public.chapters(id) ON DELETE SET NULL,
    professor_id TEXT REFERENCES public.professors(id) ON DELETE SET NULL,
    section TEXT NOT NULL DEFAULT 'A' CHECK (section IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I')),
    lecture_date DATE NOT NULL DEFAULT CURRENT_DATE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'uploading', 'ready', 'processing', 'completed', 'archived')),
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'section', 'public')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON public.workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_subject_id ON public.workspaces(subject_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_chapter_id ON public.workspaces(chapter_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_section ON public.workspaces(section);
CREATE INDEX IF NOT EXISTS idx_workspaces_status ON public.workspaces(status);

-- ----------------------------------------------------------------------------
-- 8. UPLOADED_SOURCES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.uploaded_sources (
    id TEXT PRIMARY KEY DEFAULT ('src_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    bucket_name TEXT NOT NULL DEFAULT 'private-student-uploads' CHECK (
        bucket_name IN (
            'private-student-uploads',
            'shared-academic-materials',
            'generated-documents',
            'generated-diagrams'
        )
    ),
    source_type TEXT NOT NULL DEFAULT 'whiteboard' CHECK (
        source_type IN (
            'whiteboard',
            'blackboard',
            'handwritten_notes',
            'reference_pdf',
            'professor_slides',
            'syllabus'
        )
    ),
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    page_number INTEGER NOT NULL DEFAULT 1,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared')),
    extracted_text_snippet TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploaded_sources_workspace_id ON public.uploaded_sources(workspace_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_sources_user_id ON public.uploaded_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_sources_source_type ON public.uploaded_sources(source_type);

-- ----------------------------------------------------------------------------
-- 9. MASTER_NOTES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.master_notes (
    id TEXT PRIMARY KEY DEFAULT ('mnote_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'verified', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_notes_workspace_id ON public.master_notes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_master_notes_user_id ON public.master_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_master_notes_status ON public.master_notes(status);

-- ----------------------------------------------------------------------------
-- 10. COMMUNITY_CONTRIBUTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_contributions (
    id TEXT PRIMARY KEY DEFAULT ('vlt_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    master_notes_id TEXT NOT NULL REFERENCES public.master_notes(id) ON DELETE CASCADE,
    contributor_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    visibility TEXT NOT NULL DEFAULT 'section' CHECK (visibility IN ('private', 'section', 'public')),
    verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (
        verification_status IN ('unverified', 'community_reviewed', 'source_verified')
    ),
    section TEXT NOT NULL DEFAULT 'A' CHECK (section IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I')),
    title TEXT NOT NULL DEFAULT '',
    chapter TEXT NOT NULL DEFAULT '',
    subject_id TEXT REFERENCES public.subjects(id) ON DELETE SET NULL,
    subject_name TEXT NOT NULL DEFAULT '',
    subject_code TEXT NOT NULL DEFAULT '',
    professor TEXT NOT NULL DEFAULT '',
    source_sections JSONB NOT NULL DEFAULT '["A"]'::jsonb,
    lecture_date TEXT NOT NULL DEFAULT '',
    contributor_name TEXT NOT NULL DEFAULT '',
    contributor_avatar TEXT,
    upvotes INTEGER NOT NULL DEFAULT 0 CHECK (upvotes >= 0),
    reports_count INTEGER NOT NULL DEFAULT 0 CHECK (reports_count >= 0),
    summary TEXT NOT NULL DEFAULT '',
    download_available BOOLEAN NOT NULL DEFAULT TRUE,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_contributions_master_notes_id ON public.community_contributions(master_notes_id);
CREATE INDEX IF NOT EXISTS idx_community_contributions_contributor_id ON public.community_contributions(contributor_id);
CREATE INDEX IF NOT EXISTS idx_community_contributions_section ON public.community_contributions(section);
CREATE INDEX IF NOT EXISTS idx_community_contributions_visibility ON public.community_contributions(visibility);
CREATE INDEX IF NOT EXISTS idx_community_contributions_verification ON public.community_contributions(verification_status);

-- ----------------------------------------------------------------------------
-- 11. STUDY_KITS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_kits (
    id TEXT PRIMARY KEY DEFAULT ('skit_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    master_notes_id TEXT NOT NULL REFERENCES public.master_notes(id) ON DELETE CASCADE,
    kit_type TEXT NOT NULL DEFAULT 'comprehensive' CHECK (
        kit_type IN ('comprehensive', 'flashcards', 'quiz', 'revision_sheet')
    ),
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_kits_master_notes_id ON public.study_kits(master_notes_id);

-- ----------------------------------------------------------------------------
-- 12. FLASHCARDS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.flashcards (
    id TEXT PRIMARY KEY DEFAULT ('fc_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    study_kit_id TEXT NOT NULL REFERENCES public.study_kits(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    explanation TEXT,
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    review_status TEXT NOT NULL DEFAULT 'new' CHECK (review_status IN ('new', 'needs_review', 'mastered')),
    topic_tag TEXT NOT NULL DEFAULT 'Core Concept',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flashcards_study_kit_id ON public.flashcards(study_kit_id);

-- ----------------------------------------------------------------------------
-- 13. QUIZ_QUESTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id TEXT PRIMARY KEY DEFAULT ('mcq_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    study_kit_id TEXT NOT NULL REFERENCES public.study_kits(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answer TEXT NOT NULL,
    correct_option_index INTEGER NOT NULL DEFAULT 0,
    explanation TEXT NOT NULL DEFAULT '',
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    topic_reference TEXT NOT NULL DEFAULT 'General',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_study_kit_id ON public.quiz_questions(study_kit_id);

-- ----------------------------------------------------------------------------
-- 14. SUPPORTING TABLES (Diagrams, Reviews, Notifications, Pipeline Jobs)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.smart_diagrams (
    id TEXT PRIMARY KEY DEFAULT ('diag_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    master_notes_id TEXT REFERENCES public.master_notes(id) ON DELETE CASCADE,
    diagram_type TEXT NOT NULL DEFAULT 'flowchart',
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    mermaid_code TEXT NOT NULL,
    svg_code TEXT,
    storage_path TEXT,
    uncertain_elements JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_valid_syntax BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smart_diagrams_workspace_id ON public.smart_diagrams(workspace_id);

CREATE TABLE IF NOT EXISTS public.community_reviews (
    id TEXT PRIMARY KEY DEFAULT ('rev_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    contribution_id TEXT NOT NULL REFERENCES public.community_contributions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_section TEXT NOT NULL DEFAULT 'A',
    rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    is_inaccuracy_report BOOLEAN NOT NULL DEFAULT FALSE,
    inaccuracy_details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_reviews_contribution_id ON public.community_reviews(contribution_id);

CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY DEFAULT ('notif_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'vault',
    link TEXT,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- ----------------------------------------------------------------------------
-- 15. SUPABASE AUTH TRIGGER FOR AUTOMATIC PROFILE CREATION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        university_id,
        semester,
        section,
        email_verified,
        onboarding_completed,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id::text,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'university_id',
        COALESCE(NEW.raw_user_meta_data->>'semester', 'Semester 5 (Fall 2026)'),
        COALESCE(NEW.raw_user_meta_data->>'section', 'A'),
        (NEW.email_confirmed_at IS NOT NULL),
        COALESCE((NEW.raw_user_meta_data->>'onboarding_completed')::boolean, FALSE),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        email_verified = (NEW.email_confirmed_at IS NOT NULL),
        updated_at = NOW();
    RETURN NEW;
END;
$$;
