-- Add configuration fields to shops
alter table shops add column if not exists retail_profile_id text;
alter table shops add column if not exists enabled_modules text[] default array[]::text[];
alter table shops add column if not exists branding jsonb default '{}'::jsonb;

-- Ensure products have attributes (already in generalize_retail but included for safety)
alter table products add column if not exists attributes jsonb default '{}'::jsonb;

-- RLS Policies for shops
-- All users can read their own shop
create policy "Users can read own shop" on shops
  for select using (id in (select shop_id from profiles where profiles.id = auth.uid()));

-- Only owners can update their own shop configuration
create policy "Owners can update own shop" on shops
  for update using (
    id in (
      select shop_id from profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'owner'
    )
  );
