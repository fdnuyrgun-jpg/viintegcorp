-- 1. Fix task_attachments: restrict to users who have access to the parent task
DROP POLICY IF EXISTS "Authenticated users can view task attachments" ON public.task_attachments;

CREATE POLICY "Authenticated users can view task attachments"
ON public.task_attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_attachments.task_id
    AND (
      t.creator_id = auth.uid()
      OR t.assignee_id = auth.uid()
      OR has_role(auth.uid(), 'admin')
    )
  )
);

-- 2. Re-verify employees policy is correct (drop any old permissive policies)
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;
DROP POLICY IF EXISTS "Everyone can view employees" ON public.employees;