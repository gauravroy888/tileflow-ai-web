-- Notifications Table
create table notifications (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade not null,
  title text not null,
  message text not null,
  type text not null check (type in ('feature', 'alert', 'follow_up', 'info')),
  is_read boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table notifications enable row level security;

create policy "Users can view notifications for their shop"
  on notifications for select
  using (
    shop_id in (
      select shop_id from profiles where id = auth.uid()
    )
  );

create policy "Users can update notifications for their shop"
  on notifications for update
  using (
    shop_id in (
      select shop_id from profiles where id = auth.uid()
    )
  );

-- Enable real-time for notifications
alter publication supabase_realtime add table notifications;
