-- Fix task_comments security: restrict to task creator, assignee, or admin
DROP POLICY IF EXISTS "Authenticated users can view task comments" ON public.task_comments;

CREATE POLICY "Authenticated users can view task comments"
ON public.task_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_comments.task_id
    AND (
      t.creator_id = auth.uid()
      OR t.assignee_id = auth.uid()
      OR has_role(auth.uid(), 'admin')
    )
  )
);