-- Drop existing restrictive policy and create a more permissive one for authenticated admins
DROP POLICY IF EXISTS "Admins podem ler incrementos" ON public.system_increments;

-- Create policy that allows any authenticated admin to read
CREATE POLICY "Admins podem ler incrementos" 
ON public.system_increments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);