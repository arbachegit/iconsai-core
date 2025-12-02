-- Drop and recreate as PERMISSIVE policy
DROP POLICY IF EXISTS "Admins podem ler incrementos" ON public.system_increments;

CREATE POLICY "Admins podem ler incrementos" 
ON public.system_increments 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);