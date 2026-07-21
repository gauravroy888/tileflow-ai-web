-- Drop the old unused quotations/quotation_items tables from the initial schema.
-- The app uses the newer 'quotes' and 'quote_items' tables (added in 20260718000003_add_quotes.sql).
-- These old tables are empty and were never used by the app frontend.

DROP TABLE IF EXISTS public.quotation_items CASCADE;
DROP TABLE IF EXISTS public.quotations CASCADE;
