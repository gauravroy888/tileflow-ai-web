-- Create a public storage bucket for PDF Quotes
insert into storage.buckets (id, name, public)
values ('quotes_pdfs', 'quotes_pdfs', true)
on conflict (id) do nothing;

-- Set up security policies for the bucket
-- Allow public access to view the quotes
create policy "Quotes Public Access"
  on storage.objects for select
  using ( bucket_id = 'quotes_pdfs' );

-- Allow authenticated users to upload new quotes to the bucket
create policy "Quotes Authenticated users can upload quotes"
  on storage.objects for insert
  with check (
    bucket_id = 'quotes_pdfs' and auth.role() = 'authenticated'
  );
  
-- Allow authenticated users to update their uploaded quotes
create policy "Quotes Authenticated users can update quotes"
  on storage.objects for update
  using (
    bucket_id = 'quotes_pdfs' and auth.role() = 'authenticated'
  );
