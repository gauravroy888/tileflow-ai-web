ALTER TABLE public.products ADD COLUMN is_archived boolean DEFAULT false NOT NULL;
ALTER TABLE public.customers ADD COLUMN is_archived boolean DEFAULT false NOT NULL;
ALTER TABLE public.quotes ADD COLUMN is_archived boolean DEFAULT false NOT NULL;
