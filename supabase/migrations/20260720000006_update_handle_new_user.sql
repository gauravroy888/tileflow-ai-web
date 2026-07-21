-- Update handle_new_user trigger to handle invited members
create or replace function public.handle_new_user() 
returns trigger as $$
declare
  new_shop_id uuid;
begin
  -- Check if the user was invited to a specific shop
  if new.raw_user_meta_data->>'invited_shop_id' is not null then
    -- Join existing shop as the specified role (default to sales_executive)
    insert into public.profiles (id, shop_id, role, full_name)
    values (
      new.id, 
      (new.raw_user_meta_data->>'invited_shop_id')::uuid, 
      coalesce(new.raw_user_meta_data->>'role', 'sales_executive'),
      new.raw_user_meta_data->>'full_name'
    );
  else
    -- Create a new shop for the owner
    insert into public.shops (name) values ('My Shop') returning id into new_shop_id;
    insert into public.profiles (id, shop_id, role, full_name)
    values (new.id, new_shop_id, 'owner', new.raw_user_meta_data->>'full_name');
  end if;
  return new;
end;
$$ language plpgsql security definer;
