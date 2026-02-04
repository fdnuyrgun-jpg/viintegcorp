-- Posts table for the live feed
CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Post likes
CREATE TABLE public.post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(post_id, user_id)
);

-- Post comments
CREATE TABLE public.post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks table with Kanban statuses
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');

CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'todo',
    priority task_priority NOT NULL DEFAULT 'medium',
    assignee_id UUID,
    creator_id UUID NOT NULL,
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- News/announcements
CREATE TABLE public.news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL,
    is_official BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wiki categories
CREATE TABLE public.wiki_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    icon TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wiki documents
CREATE TABLE public.wiki_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.wiki_categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT,
    author_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Files/documents storage
CREATE TABLE public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    uploader_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Posts policies
CREATE POLICY "Authenticated users can view posts"
ON public.posts FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can create posts"
ON public.posts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
ON public.posts FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
ON public.posts FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Post likes policies
CREATE POLICY "Authenticated users can view likes"
ON public.post_likes FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can like posts"
ON public.post_likes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
ON public.post_likes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Post comments policies
CREATE POLICY "Authenticated users can view comments"
ON public.post_comments FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can create comments"
ON public.post_comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
ON public.post_comments FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Tasks policies
CREATE POLICY "Authenticated users can view tasks"
ON public.tasks FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can create tasks"
ON public.tasks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update assigned tasks or own tasks"
ON public.tasks FOR UPDATE TO authenticated
USING (auth.uid() = creator_id OR auth.uid() = assignee_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tasks"
ON public.tasks FOR DELETE TO authenticated
USING (auth.uid() = creator_id OR has_role(auth.uid(), 'admin'));

-- News policies
CREATE POLICY "Authenticated users can view news"
ON public.news FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage news"
ON public.news FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Wiki categories policies
CREATE POLICY "Authenticated users can view categories"
ON public.wiki_categories FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage categories"
ON public.wiki_categories FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Wiki documents policies
CREATE POLICY "Authenticated users can view wiki"
ON public.wiki_documents FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can create wiki docs"
ON public.wiki_documents FOR INSERT TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors or admins can update wiki"
ON public.wiki_documents FOR UPDATE TO authenticated
USING (auth.uid() = author_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Authors or admins can delete wiki"
ON public.wiki_documents FOR DELETE TO authenticated
USING (auth.uid() = author_id OR has_role(auth.uid(), 'admin'));

-- Files policies
CREATE POLICY "Authenticated users can view files"
ON public.files FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can upload files"
ON public.files FOR INSERT TO authenticated
WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Uploaders or admins can delete files"
ON public.files FOR DELETE TO authenticated
USING (auth.uid() = uploader_id OR has_role(auth.uid(), 'admin'));

-- Add updated_at triggers
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_news_updated_at
BEFORE UPDATE ON public.news
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wiki_documents_updated_at
BEFORE UPDATE ON public.wiki_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for posts and comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;

-- Update employees RLS to allow all authenticated users to view
DROP POLICY IF EXISTS "Users can view own profile" ON public.employees;
CREATE POLICY "Authenticated users can view employees"
ON public.employees FOR SELECT TO authenticated
USING (true);

-- Insert default wiki categories
INSERT INTO public.wiki_categories (name, icon) VALUES
('Тех отдел', 'code'),
('Менеджеры', 'building'),
('Бухгалтер', 'file-text'),
('Генеральный директор', 'globe');