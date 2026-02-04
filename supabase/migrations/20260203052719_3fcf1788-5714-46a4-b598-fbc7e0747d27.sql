-- ============================================
-- FIX CRITICAL SECURITY ISSUES
-- ============================================

-- 1. EMPLOYEES TABLE - Restrict access to sensitive data
-- Drop existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;

-- Create new restrictive SELECT policy (own record or admin only for full data)
CREATE POLICY "Users can view own profile or admins all"
ON public.employees
FOR SELECT
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin')
);

-- Create a function to get public employee data (for team directory)
-- This bypasses RLS to show basic non-sensitive info to all authenticated users
CREATE OR REPLACE FUNCTION public.get_public_employees()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  "position" text,
  department text,
  avatar_url text,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, user_id, full_name, "position", department, avatar_url, is_active
  FROM public.employees
  WHERE is_active = true OR is_active IS NULL
  ORDER BY full_name
$$;

-- 2. TASKS TABLE - Restrict to creator, assignee, or admin
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.tasks;

CREATE POLICY "Users can view assigned or created tasks"
ON public.tasks
FOR SELECT
USING (
  auth.uid() = creator_id 
  OR auth.uid() = assignee_id 
  OR has_role(auth.uid(), 'admin')
);

-- 3. FILES TABLE - Restrict to uploader or admin
DROP POLICY IF EXISTS "Authenticated users can view files" ON public.files;

CREATE POLICY "Users can view own files or admins all"
ON public.files
FOR SELECT
USING (
  auth.uid() = uploader_id 
  OR has_role(auth.uid(), 'admin')
);