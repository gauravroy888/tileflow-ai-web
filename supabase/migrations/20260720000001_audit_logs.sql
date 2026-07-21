CREATE TABLE public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs for their shop"
  ON public.audit_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.shop_id = audit_logs.shop_id
  ));

CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_shop_id uuid;
  v_old_data jsonb;
  v_new_data jsonb;
BEGIN
  v_user_id := auth.uid();
  
  IF (TG_OP = 'DELETE') THEN
    v_shop_id := OLD.shop_id;
    v_old_data := row_to_json(OLD)::jsonb;
    v_new_data := null;
    INSERT INTO public.audit_logs (shop_id, user_id, action, table_name, record_id, old_data, new_data)
    VALUES (v_shop_id, v_user_id, TG_OP, TG_TABLE_NAME, OLD.id, v_old_data, v_new_data);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_shop_id := NEW.shop_id;
    v_old_data := row_to_json(OLD)::jsonb;
    v_new_data := row_to_json(NEW)::jsonb;
    INSERT INTO public.audit_logs (shop_id, user_id, action, table_name, record_id, old_data, new_data)
    VALUES (v_shop_id, v_user_id, TG_OP, TG_TABLE_NAME, NEW.id, v_old_data, v_new_data);
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    v_shop_id := NEW.shop_id;
    v_old_data := null;
    v_new_data := row_to_json(NEW)::jsonb;
    INSERT INTO public.audit_logs (shop_id, user_id, action, table_name, record_id, old_data, new_data)
    VALUES (v_shop_id, v_user_id, TG_OP, TG_TABLE_NAME, NEW.id, v_old_data, v_new_data);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_products_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

CREATE TRIGGER audit_customers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

CREATE TRIGGER audit_quotes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
