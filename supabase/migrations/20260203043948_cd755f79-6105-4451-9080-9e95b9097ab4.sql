-- Create news_reactions table
CREATE TABLE public.news_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  news_id UUID NOT NULL REFERENCES public.news(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction TEXT NOT NULL, -- 'like', 'heart', 'fire', 'celebrate', 'sad'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(news_id, user_id, reaction)
);

-- Create news_comments table
CREATE TABLE public.news_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  news_id UUID NOT NULL REFERENCES public.news(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.news_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for news_reactions
CREATE POLICY "Authenticated users can view reactions"
ON public.news_reactions FOR SELECT
USING (true);

CREATE POLICY "Users can add reactions"
ON public.news_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
ON public.news_reactions FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for news_comments
CREATE POLICY "Authenticated users can view comments"
ON public.news_comments FOR SELECT
USING (true);

CREATE POLICY "Users can add comments"
ON public.news_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users or admins can delete comments"
ON public.news_comments FOR DELETE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Set default for is_official to true in news table
ALTER TABLE public.news ALTER COLUMN is_official SET DEFAULT true;