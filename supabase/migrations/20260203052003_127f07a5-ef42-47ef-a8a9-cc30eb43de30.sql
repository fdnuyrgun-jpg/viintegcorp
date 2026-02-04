-- Add birthday column to employees table
ALTER TABLE public.employees 
ADD COLUMN birthday date NULL;

-- Create trigger to check birthdays daily and create news
CREATE OR REPLACE FUNCTION public.check_birthdays_and_notify()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp RECORD;
BEGIN
  -- Find employees with birthday today
  FOR emp IN 
    SELECT id, full_name, user_id
    FROM public.employees
    WHERE birthday IS NOT NULL 
      AND EXTRACT(MONTH FROM birthday) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY FROM birthday) = EXTRACT(DAY FROM CURRENT_DATE)
      AND is_active = true
  LOOP
    -- Check if birthday news already exists for today
    IF NOT EXISTS (
      SELECT 1 FROM public.news 
      WHERE title = 'День рождения: ' || emp.full_name
        AND DATE(created_at) = CURRENT_DATE
    ) THEN
      -- Create birthday news
      INSERT INTO public.news (author_id, title, content, is_official)
      VALUES (
        emp.user_id,
        'День рождения: ' || emp.full_name,
        '🎂 Сегодня день рождения у ' || emp.full_name || '! Поздравляем с праздником и желаем всего наилучшего!',
        true
      );
    END IF;
  END LOOP;
END;
$$;