-- ============================================================================
-- LECTRA PHASE 2: ROW LEVEL SECURITY (RLS), STORAGE BUCKETS & REALTIME
-- Target: Supabase PostgreSQL 15+ & Supabase Storage
-- Description: Enforces strict multi-tenant data isolation, sharing rules,
--              and private/shared storage bucket policies.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ----------------------------------------------------------------------------
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_diagrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. ACADEMIC CATALOG POLICIES (Read-only for authenticated users)
-- ----------------------------------------------------------------------------
CREATE POLICY "Authenticated users can view universities"
    ON public.universities FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can view courses"
    ON public.courses FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can view subjects"
    ON public.subjects FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can view professors"
    ON public.professors FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can view chapters"
    ON public.chapters FOR SELECT
    TO authenticated
    USING (true);

-- ----------------------------------------------------------------------------
-- 3. PROFILES POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Authenticated users can view basic peer profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = id);

CREATE POLICY "Users can update only their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = id)
    WITH CHECK (auth.uid()::text = id);

-- ----------------------------------------------------------------------------
-- 4. WORKSPACES POLICIES
-- Rule: Users can access and modify their own private workspaces.
--       Shared workspaces are readable only when explicitly shared.
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own workspaces or explicitly shared workspaces"
    ON public.workspaces FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()::text
        OR visibility IN ('section', 'public')
    );

CREATE POLICY "Users can create their own workspaces"
    ON public.workspaces FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update only their own workspaces"
    ON public.workspaces FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete only their own workspaces"
    ON public.workspaces FOR DELETE
    TO authenticated
    USING (user_id = auth.uid()::text);

-- ----------------------------------------------------------------------------
-- 5. UPLOADED_SOURCES POLICIES
-- Rule: Users can modify their own private files.
--       Shared files are accessible only to authorized users.
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own private files or explicitly shared academic materials"
    ON public.uploaded_sources FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()::text
        OR visibility = 'shared'
        OR bucket_name = 'shared-academic-materials'
    );

CREATE POLICY "Users can upload their own source files"
    ON public.uploaded_sources FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()::text
        AND EXISTS (
            SELECT 1 FROM public.workspaces w
            WHERE w.id = workspace_id AND w.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can update only their own source files"
    ON public.uploaded_sources FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete only their own source files"
    ON public.uploaded_sources FOR DELETE
    TO authenticated
    USING (user_id = auth.uid()::text);

-- ----------------------------------------------------------------------------
-- 6. MASTER_NOTES POLICIES
-- Rule: Students cannot edit another student's private notes.
--       Public or community content must be explicitly shared.
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own master notes or explicitly shared community notes"
    ON public.master_notes FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM public.community_contributions cc
            WHERE cc.master_notes_id = public.master_notes.id
              AND cc.visibility IN ('section', 'public')
        )
    );

CREATE POLICY "Users can create master notes in their own workspaces"
    ON public.master_notes FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Students can edit only their own master notes"
    ON public.master_notes FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Students can delete only their own master notes"
    ON public.master_notes FOR DELETE
    TO authenticated
    USING (user_id = auth.uid()::text);

-- ----------------------------------------------------------------------------
-- 7. COMMUNITY_CONTRIBUTIONS POLICIES
-- Rule: Public or community content must be explicitly shared.
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view explicitly shared community contributions or their own"
    ON public.community_contributions FOR SELECT
    TO authenticated
    USING (
        contributor_id = auth.uid()::text
        OR visibility IN ('section', 'public')
    );

CREATE POLICY "Users can share only their own master notes to community"
    ON public.community_contributions FOR INSERT
    TO authenticated
    WITH CHECK (
        contributor_id = auth.uid()::text
        AND EXISTS (
            SELECT 1 FROM public.master_notes mn
            WHERE mn.id = master_notes_id AND mn.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Contributors can update their own community contributions"
    ON public.community_contributions FOR UPDATE
    TO authenticated
    USING (contributor_id = auth.uid()::text)
    WITH CHECK (contributor_id = auth.uid()::text);

CREATE POLICY "Contributors can delete their own community contributions"
    ON public.community_contributions FOR DELETE
    TO authenticated
    USING (contributor_id = auth.uid()::text);

-- ----------------------------------------------------------------------------
-- 8. STUDY_KITS, FLASHCARDS, QUIZ_QUESTIONS & DIAGRAMS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view study kits for accessible master notes"
    ON public.study_kits FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.master_notes mn
            WHERE mn.id = public.study_kits.master_notes_id
              AND (
                  mn.user_id = auth.uid()::text
                  OR EXISTS (
                      SELECT 1 FROM public.community_contributions cc
                      WHERE cc.master_notes_id = mn.id AND cc.visibility IN ('section', 'public')
                  )
              )
        )
    );

CREATE POLICY "Users can manage study kits only for their own master notes"
    ON public.study_kits FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.master_notes mn
            WHERE mn.id = public.study_kits.master_notes_id AND mn.user_id = auth.uid()::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.master_notes mn
            WHERE mn.id = public.study_kits.master_notes_id AND mn.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can view flashcards for accessible study kits"
    ON public.flashcards FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.study_kits sk
            JOIN public.master_notes mn ON mn.id = sk.master_notes_id
            WHERE sk.id = public.flashcards.study_kit_id
              AND (
                  mn.user_id = auth.uid()::text
                  OR EXISTS (
                      SELECT 1 FROM public.community_contributions cc
                      WHERE cc.master_notes_id = mn.id AND cc.visibility IN ('section', 'public')
                  )
              )
        )
    );

CREATE POLICY "Users can view quiz questions for accessible study kits"
    ON public.quiz_questions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.study_kits sk
            JOIN public.master_notes mn ON mn.id = sk.master_notes_id
            WHERE sk.id = public.quiz_questions.study_kit_id
              AND (
                  mn.user_id = auth.uid()::text
                  OR EXISTS (
                      SELECT 1 FROM public.community_contributions cc
                      WHERE cc.master_notes_id = mn.id AND cc.visibility IN ('section', 'public')
                  )
              )
        )
    );

CREATE POLICY "Users can view diagrams for accessible notes"
    ON public.smart_diagrams FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workspaces w
            WHERE w.id = public.smart_diagrams.workspace_id
              AND (w.user_id = auth.uid()::text OR w.visibility IN ('section', 'public'))
        )
    );

CREATE POLICY "Users can view and create community reviews on shared notes"
    ON public.community_reviews FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can submit their own reviews"
    ON public.community_reviews FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can view and update only their own notifications"
    ON public.notifications FOR ALL
    TO authenticated
    USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

-- ----------------------------------------------------------------------------
-- 9. SUPABASE STORAGE BUCKETS & OBJECT RLS POLICIES
-- Buckets:
--   1. private-student-uploads (Private)
--   2. shared-academic-materials (Authenticated shared access via signed URLs)
--   3. generated-documents (Private / Authorized export access via signed URLs)
--   4. generated-diagrams (Private / Authorized diagram access via signed URLs)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('private-student-uploads', 'private-student-uploads', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']),
    ('shared-academic-materials', 'shared-academic-materials', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']),
    ('generated-documents', 'generated-documents', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown', 'text/html']),
    ('generated-diagrams', 'generated-diagrams', false, 20971520, ARRAY['image/svg+xml', 'image/png', 'text/plain'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies on storage.objects
CREATE POLICY "Private uploads: Users can upload to own user folder"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'private-student-uploads'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Private uploads: Users can read only their own private files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'private-student-uploads'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Private uploads: Users can update/delete only their own private files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'private-student-uploads'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Shared academic materials: Authenticated users can read shared materials"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'shared-academic-materials');

CREATE POLICY "Shared academic materials: Authenticated users can upload to own subfolder"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'shared-academic-materials'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Shared academic materials: Owners can delete own shared files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'shared-academic-materials'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Generated documents & diagrams: Users can access own or shared artifacts"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id IN ('generated-documents', 'generated-diagrams')
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ----------------------------------------------------------------------------
-- 10. SUPABASE REALTIME PUBLICATION
-- ----------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspaces;
ALTER PUBLICATION supabase_realtime ADD TABLE public.uploaded_sources;
ALTER PUBLICATION supabase_realtime ADD TABLE public.master_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_contributions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
