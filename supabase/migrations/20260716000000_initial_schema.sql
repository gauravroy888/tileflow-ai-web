-- Enable pgvector
create extension if not exists vector;

-- Shops Table (Multi-tenant)
create table shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Profiles Table (Extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  shop_id uuid references shops(id) on delete cascade,
  role text not null check (role in ('owner', 'sales_executive')),
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Products Table
create table products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  name text not null,
  brand text,
  sku text,
  category text,
  finish text,
  size text,
  thickness numeric,
  material text,
  color text,
  texture text,
  price numeric not null default 0,
  stock_status text default 'in_stock',
  tags text[],
  image_url text,
  embedding vector(1536),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Customers Table
create table customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  name text not null,
  phone text,
  budget numeric,
  project_type text,
  location text,
  visit_status text default 'new',
  assigned_to uuid references profiles(id) on delete set null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Quotations Table
create table quotations (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  total_amount numeric not null,
  discount numeric default 0,
  gst numeric default 0,
  transport numeric default 0,
  validity_days integer default 15,
  pdf_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Quotation Items
create table quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid references quotations(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  quantity numeric not null,
  unit_price numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS)
alter table shops enable row level security;
alter table profiles enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table quotations enable row level security;
alter table quotation_items enable row level security;

-- RLS Policies
-- Profiles: Users can read profiles in their shop
create policy "Users can read profiles in their shop" on profiles
  for select using (shop_id in (select shop_id from profiles where id = auth.uid()));

-- Profiles: Users can update their own profile
create policy "Users can update own profile" on profiles
  for update using (id = auth.uid());

-- Products: Users can read/write products in their shop
create policy "Users can read shop products" on products
  for select using (shop_id in (select shop_id from profiles where id = auth.uid()));
create policy "Users can insert shop products" on products
  for insert with check (shop_id in (select shop_id from profiles where id = auth.uid()));
create policy "Users can update shop products" on products
  for update using (shop_id in (select shop_id from profiles where id = auth.uid()));
create policy "Users can delete shop products" on products
  for delete using (shop_id in (select shop_id from profiles where id = auth.uid()));

-- Customers: Users can read/write customers in their shop
create policy "Users can read shop customers" on customers
  for select using (shop_id in (select shop_id from profiles where id = auth.uid()));
create policy "Users can insert shop customers" on customers
  for insert with check (shop_id in (select shop_id from profiles where id = auth.uid()));
create policy "Users can update shop customers" on customers
  for update using (shop_id in (select shop_id from profiles where id = auth.uid()));

-- Quotations
create policy "Users can read shop quotations" on quotations
  for select using (shop_id in (select shop_id from profiles where id = auth.uid()));
create policy "Users can insert shop quotations" on quotations
  for insert with check (shop_id in (select shop_id from profiles where id = auth.uid()));

create policy "Users can read shop quotation items" on quotation_items
  for select using (quotation_id in (select id from quotations where shop_id in (select shop_id from profiles where id = auth.uid())));
create policy "Users can insert shop quotation items" on quotation_items
  for insert with check (quotation_id in (select id from quotations where shop_id in (select shop_id from profiles where id = auth.uid())));

-- Initial trigger to create a shop and profile on user signup
create or replace function public.handle_new_user() 
returns trigger as $$
declare
  new_shop_id uuid;
begin
  insert into public.shops (name) values ('My Shop') returning id into new_shop_id;
  insert into public.profiles (id, shop_id, role, full_name)
  values (new.id, new_shop_id, 'owner', new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
