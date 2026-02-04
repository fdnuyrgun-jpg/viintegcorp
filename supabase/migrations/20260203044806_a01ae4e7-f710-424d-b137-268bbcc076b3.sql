-- Drop overly permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can receive notifications" ON public.notifications;

-- Create more restrictive INSERT policy - only authenticated users can insert
CREATE POLICY "Users can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);