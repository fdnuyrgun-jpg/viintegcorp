-- Remove birthday functionality
-- Drop the birthday check function
DROP FUNCTION IF EXISTS public.check_birthdays_and_notify();

-- Remove birthday column from employees table
ALTER TABLE public.employees DROP COLUMN IF EXISTS birthday;