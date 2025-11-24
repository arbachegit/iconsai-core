-- Function to automatically assign admin role to first user
CREATE OR REPLACE FUNCTION public.handle_first_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is the first user (no roles exist yet)
  IF NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) THEN
    -- Assign admin role to the first user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to execute the function after a new user is created
CREATE TRIGGER on_auth_user_created_assign_first_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_first_user();