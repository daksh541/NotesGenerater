-- ============================================================================
-- LECTRA PHASE 2: ACADEMIC CATALOG SEED DATA
-- Target: Supabase PostgreSQL 15+
-- Description: Seeds universities, courses, professors, subjects, and chapters
-- ============================================================================

INSERT INTO public.universities (id, name, domain)
VALUES
    ('univ_stanford', 'Stanford University', 'stanford.edu'),
    ('univ_mit', 'Massachusetts Institute of Technology', 'mit.edu'),
    ('univ_berkeley', 'UC Berkeley', 'berkeley.edu')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.courses (id, university_id, course_name, course_code)
VALUES
    ('crs_cs_ai', 'univ_stanford', 'B.S. Computer Science & AI', 'BS-CSAI'),
    ('crs_ee_sys', 'univ_stanford', 'M.S. Computer Systems & Networks', 'MS-CSN'),
    ('crs_eecs', 'univ_mit', 'B.S. Electrical Engineering & Computer Science', '6-3')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.professors (
    id, university_id, full_name, subjects, title, department, email,
    sections_taught, teaching_style, exam_focus_topics, preferred_terminology,
    formatting_preferences, reference_materials_count
)
VALUES
    (
        'prof_thorne',
        'univ_stanford',
        'Dr. Aris Thorne',
        '["Distributed Systems & Cloud Computing", "Operating Systems Architecture"]'::jsonb,
        'Associate Professor',
        'Computer Science & Systems',
        'athorne@stanford.edu',
        '["A", "C", "E"]'::jsonb,
        'Deep structural proofs, whiteboard consensus diagrams, emphasizes edge failure modes',
        '["Raft Invariants & Leader Election", "Split-Brain Resolution", "Byzantine Fault Tolerance", "CAP Theorem trade-offs"]'::jsonb,
        '{"consensus": "Distributed State Machine Agreement", "heartbeat": "Periodic Leader Liveness Probe", "term": "Monotonically Increasing Epoch Identifier"}'::jsonb,
        'Always numbers state-machine invariants (I1..In) and draws log index tables',
        14
    ),
    (
        'prof_vance',
        'univ_stanford',
        'Prof. Elena Vance',
        '["Deep Neural Architectures & Attention", "Statistical Machine Learning"]'::jsonb,
        'Full Professor & Chair',
        'Computer Science & Machine Intelligence',
        'evance@stanford.edu',
        '["B", "D", "F", "G"]'::jsonb,
        'Linear algebra geometric intuition, mathematical rigor, detailed forward/backward pass board layouts',
        '["Self-Attention Multi-Head Matrix Derivations", "Scaled Dot-Product Numerical Stability", "Positional Encodings in High Dimensions"]'::jsonb,
        '{"query_key_product": "Bilinear Semantic Alignment Matrix", "residual_connection": "Identity Gradient Highway", "layer_norm": "Per-Token Feature Normalization"}'::jsonb,
        'Detailed tensor shape annotations (e.g. [B, S, H, D]) on all matrix operations',
        22
    ),
    (
        'prof_brody',
        'univ_stanford',
        'Dr. Marcus Brody',
        '["Advanced Algorithms & Optimization", "Discrete Structures"]'::jsonb,
        'Distinguished Lecturer',
        'Computer Science & Theory',
        'mbrody@stanford.edu',
        '["H", "I"]'::jsonb,
        'Socratic problem reduction, blackboard recursion trees, amortized analysis tables',
        '["Dynamic Programming State Space Compression", "Network Flow Minimum Cut Reductions", "NP-Completeness 3-SAT Reductions"]'::jsonb,
        '{"dp_table": "Optimal Substructure Memoization Lattice", "reduction": "Polynomial Time Mapping Transformation"}'::jsonb,
        'Requires formal inductive recurrence relations before any pseudocode',
        18
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subjects (
    id, course_id, subject_name, subject_code, professor_id, teacher,
    semester, description, color, chapters_count, active_sections
)
VALUES
    (
        'subj_cs244',
        'crs_cs_ai',
        'Distributed Systems & Cloud Computing',
        'CS-244',
        'prof_thorne',
        'Dr. Aris Thorne',
        'Fall 2026',
        'Consensus algorithms, replication protocols, fault tolerance, Raft, Paxos, and large-scale cloud architectures.',
        '#0F172A',
        8,
        '["A","B","C","D","E","F","G","H","I"]'::jsonb
    ),
    (
        'subj_cs224n',
        'crs_cs_ai',
        'Deep Neural Architectures & Attention',
        'CS-224N',
        'prof_vance',
        'Prof. Elena Vance',
        'Fall 2026',
        'Transformer models, Multi-Head Self Attention, Vision Transformers, and modern foundation model pretraining.',
        '#1E3A8A',
        10,
        '["A","B","C","D","E","F","G","H","I"]'::jsonb
    ),
    (
        'subj_cs161',
        'crs_cs_ai',
        'Advanced Algorithms & Optimization',
        'CS-161',
        'prof_brody',
        'Dr. Marcus Brody',
        'Fall 2026',
        'Divide-and-conquer, graph algorithms, dynamic programming, network flow, and NP-completeness.',
        '#312E81',
        12,
        '["A","B","C","D","E","F","G","H","I"]'::jsonb
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.chapters (id, subject_id, chapter_name, chapter_number)
VALUES
    ('chp_cs244_1', 'subj_cs244', 'Chapter 1: Foundations of Distributed Time & Clocks', 1),
    ('chp_cs244_2', 'subj_cs244', 'Chapter 2: Primary-Backup Replication & Viewstamped Protocols', 2),
    ('chp_cs244_3', 'subj_cs244', 'Chapter 3: Paxos & Single-Decree Consensus', 3),
    ('chp_cs244_4', 'subj_cs244', 'Chapter 4: Consensus in Fault-Tolerant Clusters', 4),
    ('chp_cs244_5', 'subj_cs244', 'Chapter 5: Malicious Nodes & BFT', 5),
    ('chp_cs224n_1', 'subj_cs224n', 'Chapter 1: Word Vectors & Distributed Representations', 1),
    ('chp_cs224n_2', 'subj_cs224n', 'Chapter 2: Sequence-to-Sequence & Attention Bottlenecks', 2),
    ('chp_cs224n_3', 'subj_cs224n', 'Chapter 3: The Transformer Architecture', 3),
    ('chp_cs224n_4', 'subj_cs224n', 'Chapter 4: Scaled Parameter Architectures', 4),
    ('chp_cs161_6', 'subj_cs161', 'Chapter 6: Self-Adjusting Data Structures', 6),
    ('chp_cs161_8', 'subj_cs161', 'Chapter 8: Network Flow & Reductions', 8)
ON CONFLICT (id) DO NOTHING;
