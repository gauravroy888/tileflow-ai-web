CREATE TABLE public.quotes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  subtotal numeric NOT NULL,
  tax numeric NOT NULL,
  total_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.quote_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity numeric NOT NULL,
  price_at_time numeric NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- Quotes Policies
CREATE POLICY "Users can view quotes in their shop"
  ON public.quotes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.shop_id = quotes.shop_id
  ));

CREATE POLICY "Users can insert quotes in their shop"
  ON public.quotes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.shop_id = quotes.shop_id
  ));

CREATE POLICY "Users can update quotes in their shop"
  ON public.quotes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.shop_id = quotes.shop_id
  ));

CREATE POLICY "Users can delete quotes in their shop"
  ON public.quotes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.shop_id = quotes.shop_id
  ));

-- Quote Items Policies
CREATE POLICY "Users can view quote items in their shop"
  ON public.quote_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.quotes
    JOIN public.profiles ON profiles.shop_id = quotes.shop_id
    WHERE quotes.id = quote_items.quote_id AND profiles.id = auth.uid()
  ));

CREATE POLICY "Users can insert quote items in their shop"
  ON public.quote_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quotes
    JOIN public.profiles ON profiles.shop_id = quotes.shop_id
    WHERE quotes.id = quote_items.quote_id AND profiles.id = auth.uid()
  ));

CREATE POLICY "Users can update quote items in their shop"
  ON public.quote_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.quotes
    JOIN public.profiles ON profiles.shop_id = quotes.shop_id
    WHERE quotes.id = quote_items.quote_id AND profiles.id = auth.uid()
  ));

CREATE POLICY "Users can delete quote items in their shop"
  ON public.quote_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.quotes
    JOIN public.profiles ON profiles.shop_id = quotes.shop_id
    WHERE quotes.id = quote_items.quote_id AND profiles.id = auth.uid()
  ));
