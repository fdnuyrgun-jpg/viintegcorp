-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'news', 'task', 'wiki', 'file'
  title TEXT NOT NULL,
  message TEXT,
  reference_id UUID, -- ID of the related entity
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- System can insert notifications for any user (via service role or triggers)
CREATE POLICY "Authenticated users can receive notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create notifications for all users except the creator
CREATE OR REPLACE FUNCTION public.notify_all_users(
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_reference_id UUID,
  p_exclude_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, reference_id)
  SELECT e.user_id, p_type, p_title, p_message, p_reference_id
  FROM public.employees e
  WHERE e.user_id IS NOT NULL 
    AND e.user_id != p_exclude_user_id
    AND e.is_active = true;
END;
$$;