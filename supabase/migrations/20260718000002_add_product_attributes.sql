-- Add attributes column to products for dynamic profile fields
alter table products add column if not exists attributes jsonb default '{}'::jsonb;
