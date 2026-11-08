-- =============================================================================
-- PHASE 4: LECTRA NINE-SECTION VAULT AND ACADEMIC COLLABORATION
-- Supabase PostgreSQL Schema & Row-Level Security (RLS) Policies
-- Sections A, B, C, D, E, F, G, H, I
-- =============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enum Types for Nine Sections, Verification Status, and Sharing Scope
DO $$ BEGIN
    CREATE TYPE lectra_section_id AS ENUM ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lectra_verification_status AS ENUM ('unverified', 'community_reviewed', 'source_verified');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lectra_visibility_scope AS ENUM ('private', 'course', 'selected_sections', 'all_sections');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Users & Contributor Profiles Table
CREATE TABLE IF NOT EXISTS public.lectra_users (
    id TEXT PRIMARY KEY,
    auth_uid UUID UNIQUE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    university TEXT NOT NULL DEFAULT 'Stanford University',
    course TEXT NOT NULL DEFAULT 'B.S. Computer Science & AI',
    section lectra_section_id NOT NULL DEFAULT 'A',
    enrolled_subjects JSONB NOT NULL DEFAULT '["CS-244", "CS-224N", "CS-161"]'::jsonb,
    role TEXT NOT NULL DEFAULT 'student',
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Master Notes Table (Includes Private Student Workspaces & Shared Notes)
CREATE TABLE IF NOT EXISTS public.lectra_master_notes (
    id TEXT PRIMARY KEY,
    lecture_id TEXT UNIQUE NOT NULL,
    owner_id TEXT NOT NULL REFERENCES public.lectra_users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject_id TEXT,
    subject_name TEXT NOT NULL,
    subject_code TEXT NOT NULL,
    chapter TEXT NOT NULL,
    professor TEXT NOT NULL,
    section lectra_section_id NOT NULL DEFAULT 'A',
    source_sections JSONB NOT NULL DEFAULT '["A"]'::jsonb,
    lecture_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sources_count INTEGER NOT NULL DEFAULT 1,
    visibility lectra_visibility_scope NOT NULL DEFAULT 'private',
    allowed_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
    enrolled_course TEXT NOT NULL DEFAULT 'B.S. Computer Science & AI',
    explicit_permission_granted BOOLEAN NOT NULL DEFAULT FALSE,
    official_source_verified BOOLEAN NOT NULL DEFAULT FALSE,
    official_source_reference TEXT,
    summary TEXT NOT NULL,
    learning_objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
    sections JSONB NOT NULL DEFAULT '[]'::jsonb,
    key_definitions JSONB NOT NULL DEFAULT '[]'::jsonb,
    important_formulas JSONB NOT NULL DEFAULT '[]'::jsonb,
    important_examples JSONB NOT NULL DEFAULT '[]'::jsonb,
    key_takeaways JSONB NOT NULL DEFAULT '[]'::jsonb,
    exam_focused_concepts JSONB NOT NULL DEFAULT '[]'::jsonb,
    needs_verification JSONB NOT NULL DEFAULT '[]'::jsonb,
    citations JSONB NOT NULL DEFAULT '[]'::jsonb,
    raw_board_transcription TEXT NOT NULL DEFAULT '',
    ai_synthesized_markdown TEXT NOT NULL DEFAULT '',
    user_markdown_override TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Nine-Section Vault Notes Table
CREATE TABLE IF NOT EXISTS public.lectra_vault_notes (
    id TEXT PRIMARY KEY,
    lecture_id TEXT NOT NULL,
    title TEXT NOT NULL,
    chapter TEXT NOT NULL,
    subject_id TEXT,
    subject_name TEXT NOT NULL,
    subject_code TEXT NOT NULL,
    professor TEXT NOT NULL,
    section lectra_section_id NOT NULL,
    source_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
    lecture_date TEXT NOT NULL,
    contributor_id TEXT NOT NULL REFERENCES public.lectra_users(id) ON DELETE CASCADE,
    contributor_name TEXT NOT NULL,
    contributor_avatar TEXT,
    verification_status lectra_verification_status NOT NULL DEFAULT 'unverified',
    official_source_reference TEXT,
    sources_count INTEGER NOT NULL DEFAULT 1,
    visibility lectra_visibility_scope NOT NULL DEFAULT 'all_sections',
    allowed_sections JSONB NOT NULL DEFAULT '["A","B","C","D","E","F","G","H","I"]'::jsonb,
    enrolled_course TEXT NOT NULL DEFAULT 'B.S. Computer Science & AI',
    explicit_permission_granted BOOLEAN NOT NULL DEFAULT TRUE,
    upvotes INTEGER NOT NULL DEFAULT 0,
    reports_count INTEGER NOT NULL DEFAULT 0,
    summary TEXT NOT NULL,
    download_available BOOLEAN NOT NULL DEFAULT TRUE,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_explicit_permission_required CHECK (
        visibility = 'private' OR explicit_permission_granted = TRUE
    ),
    CONSTRAINT chk_source_verified_requires_official_ref CHECK (
        verification_status != 'source_verified' OR (official_source_reference IS NOT NULL AND length(trim(official_source_reference)) > 0)
    )
);

-- 6. Community Reviews & Feedback Table
CREATE TABLE IF NOT EXISTS public.lectra_community_reviews (
    id TEXT PRIMARY KEY,
    vault_note_id TEXT NOT NULL REFERENCES public.lectra_vault_notes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_section lectra_section_id NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    is_inaccuracy_report BOOLEAN NOT NULL DEFAULT FALSE,
    inaccuracy_details TEXT,
    verified_against_official_source BOOLEAN NOT NULL DEFAULT FALSE,
    official_source_citation TEXT,
    replies JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Contribution History Table
CREATE TABLE IF NOT EXISTS public.lectra_contribution_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_section lectra_section_id NOT NULL,
    action_type TEXT NOT NULL,
    target_note_id TEXT NOT NULL,
    target_title TEXT NOT NULL,
    subject_code TEXT NOT NULL,
    chapter TEXT NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Notifications Table
CREATE TABLE IF NOT EXISTS public.lectra_notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'vault',
    link TEXT,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Guarantees:
-- 1. Private student workspaces are NEVER exposed to other users.
-- 2. Shared notes require explicit_permission_granted = TRUE.
-- 3. Cross-section access respects 'all_sections', 'selected_sections', and 'course'.
-- =============================================================================

ALTER TABLE public.lectra_master_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectra_vault_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectra_community_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectra_notifications ENABLE ROW LEVEL SECURITY;

-- Policy 1: Master Notes SELECT
-- Owner can always view their own workspace notes.
-- Other authenticated students can ONLY view if explicit_permission_granted = TRUE and visibility matches their section/course.
CREATE POLICY "master_notes_select_rls" ON public.lectra_master_notes
    FOR SELECT
    USING (
        owner_id = current_setting('request.jwt.claim.sub', true)
        OR (
            explicit_permission_granted = TRUE
            AND visibility != 'private'
            AND (
                visibility = 'all_sections'
                OR (
                    visibility = 'course'
                    AND enrolled_course = (
                        SELECT u.course FROM public.lectra_users u
                        WHERE u.id = current_setting('request.jwt.claim.sub', true)
                    )
                )
                OR (
                    visibility = 'selected_sections'
                    AND allowed_sections ? (
                        SELECT u.section::text FROM public.lectra_users u
                        WHERE u.id = current_setting('request.jwt.claim.sub', true)
                    )
                )
            )
        )
    );

-- Policy 2: Master Notes INSERT / UPDATE / DELETE (Strictly Owner Only)
CREATE POLICY "master_notes_owner_write_rls" ON public.lectra_master_notes
    FOR ALL
    USING (owner_id = current_setting('request.jwt.claim.sub', true))
    WITH CHECK (owner_id = current_setting('request.jwt.claim.sub', true));

-- Policy 3: Vault Notes SELECT (Cross-Section Access Across Sections A-I)
CREATE POLICY "vault_notes_cross_section_select_rls" ON public.lectra_vault_notes
    FOR SELECT
    USING (
        contributor_id = current_setting('request.jwt.claim.sub', true)
        OR (
            explicit_permission_granted = TRUE
            AND visibility != 'private'
            AND (
                visibility = 'all_sections'
                OR (
                    visibility = 'course'
                    AND enrolled_course = (
                        SELECT u.course FROM public.lectra_users u
                        WHERE u.id = current_setting('request.jwt.claim.sub', true)
                    )
                )
                OR (
                    visibility = 'selected_sections'
                    AND allowed_sections ? (
                        SELECT u.section::text FROM public.lectra_users u
                        WHERE u.id = current_setting('request.jwt.claim.sub', true)
                    )
                )
            )
        )
    );

-- Policy 4: Vault Notes INSERT (Requires Explicit Permission & Authenticated Contributor)
CREATE POLICY "vault_notes_insert_rls" ON public.lectra_vault_notes
    FOR INSERT
    WITH CHECK (
        contributor_id = current_setting('request.jwt.claim.sub', true)
        AND (visibility = 'private' OR explicit_permission_granted = TRUE)
    );

-- Policy 5: Vault Notes UPDATE (Contributor can update sharing/content; peers can upvote/review via RPC)
CREATE POLICY "vault_notes_update_rls" ON public.lectra_vault_notes
    FOR UPDATE
    USING (contributor_id = current_setting('request.jwt.claim.sub', true))
    WITH CHECK (visibility = 'private' OR explicit_permission_granted = TRUE);

-- Policy 6: Notifications RLS (Users only see their own notifications)
CREATE POLICY "notifications_user_isolation_rls" ON public.lectra_notifications
    FOR ALL
    USING (user_id = current_setting('request.jwt.claim.sub', true));
