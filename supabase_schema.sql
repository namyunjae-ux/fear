-- ==========================================================
-- Supabase Schema for Fear & Overcoming Community Platform
-- ==========================================================

-- 1. Create the posts table
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('fear', 'overcome')),
    content TEXT NOT NULL CHECK (length(trim(content)) > 0 AND length(content) <= 1000),
    hearts_count INTEGER DEFAULT 0 NOT NULL,
    author_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migration for existing tables
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS author_key TEXT;

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Anyone can read posts (Public Anonymous Read)
CREATE POLICY "Allow public read access"
ON public.posts
FOR SELECT
USING (true);

-- 4. Policy: Anyone can insert posts (Public Anonymous Insert)
CREATE POLICY "Allow public insert access"
ON public.posts
FOR INSERT
WITH CHECK (
    length(trim(content)) > 0 AND 
    length(content) <= 1000 AND 
    type IN ('fear', 'overcome')
);

-- 5. Policy: Anyone can update hearts_count (Public Reaction)
CREATE POLICY "Allow public update of reactions"
ON public.posts
FOR UPDATE
USING (true)
WITH CHECK (true);

-- 6. Enable Realtime updates for posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;

-- ==========================================================
-- 7. Create the comments table (Anonymous Replies)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(trim(content)) > 0 AND length(content) <= 300),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Enable Row Level Security (RLS) on comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 9. Comment Policies
CREATE POLICY "Allow public read comments"
ON public.comments
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert comments"
ON public.comments
FOR INSERT
WITH CHECK (
    length(trim(content)) > 0 AND 
    length(content) <= 300
);

-- 10. Enable Realtime updates for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

-- ==========================================================
-- Optional: Insert initial sample data
-- ==========================================================
INSERT INTO public.posts (type, content, hearts_count) VALUES
('fear', 'Terrified of failure in my new role. What if everyone realizes I don’t know what I’m doing?', 14),
('overcome', 'Faced my severe public speaking fear by doing small 1-minute daily presentations. Now I actually look forward to it.', 56),
('fear', 'The constant anxiety about the future is overwhelming. It feels like every decision could be a mistake.', 28),
('overcome', 'Learned that vulnerability is not weakness, but strength. Admitting my struggles saved my mental health.', 64);
