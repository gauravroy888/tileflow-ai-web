-- Add fields for generalized retail shop and onboarding
alter table shops add column if not exists shop_type text;
alter table shops add column if not exists onboarding_completed boolean default false;

-- Generalize products table by adding a JSONB attributes column
alter table products add column if not exists attributes jsonb default '{}'::jsonb;
