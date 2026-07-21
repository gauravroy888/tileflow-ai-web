-- Add has_full_access column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_full_access BOOLEAN DEFAULT FALSE;

-- Allow Owners to update other profiles in their shop (e.g. to toggle has_full_access)
-- Since 'Users can update own profile' exists, we add a new policy for owners.
CREATE POLICY "Owners can update shop profiles" ON public.profiles
FOR UPDATE USING (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
);

-- Drop the existing open delete policy on products
DROP POLICY IF EXISTS "Users can delete shop products" ON public.products;

-- Create the restricted delete policy on products
CREATE POLICY "Restricted users can delete shop products" ON public.products
FOR DELETE USING (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
    OR
    (SELECT has_full_access FROM public.profiles WHERE id = auth.uid()) = true
  )
);
