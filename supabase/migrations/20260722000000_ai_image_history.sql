create table public.ai_generated_images (
    id uuid default gen_random_uuid() primary key,
    shop_id uuid references public.shops(id) on delete cascade not null,
    generated_image_url text not null,
    prompt text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.ai_generated_images enable row level security;

create policy "Users can view AI images for their shop"
    on public.ai_generated_images for select
    using (shop_id in (
        select shop_id from public.profiles where id = auth.uid()
    ));

create policy "Users can insert AI images for their shop"
    on public.ai_generated_images for insert
    with check (shop_id in (
        select shop_id from public.profiles where id = auth.uid()
    ));

create policy "Users can delete AI images for their shop"
    on public.ai_generated_images for delete
    using (shop_id in (
        select shop_id from public.profiles where id = auth.uid()
    ));
