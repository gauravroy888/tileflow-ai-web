-- Create a type for the dashboard stats response
CREATE TYPE dashboard_stats_result AS (
  follow_ups_count bigint,
  project_leads_count bigint,
  open_quotes_total numeric,
  recent_sales_count bigint,
  follow_up_list jsonb
);

-- Create the RPC function
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_shop_id uuid)
RETURNS dashboard_stats_result AS $$
DECLARE
  v_follow_ups_count bigint;
  v_project_leads_count bigint;
  v_open_quotes_total numeric;
  v_recent_sales_count bigint;
  v_follow_up_list jsonb;
  v_result dashboard_stats_result;
BEGIN
  -- Count total customers (project leads)
  SELECT count(*) INTO v_project_leads_count
  FROM customers
  WHERE shop_id = p_shop_id;

  -- Count follow-ups
  SELECT count(*) INTO v_follow_ups_count
  FROM customers
  WHERE shop_id = p_shop_id AND visit_status = 'follow_up';

  -- Get top 5 recent follow-ups as JSON array
  SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb) INTO v_follow_up_list
  FROM (
    SELECT *
    FROM customers
    WHERE shop_id = p_shop_id AND visit_status = 'follow_up'
    ORDER BY created_at DESC
    LIMIT 5
  ) c;

  -- Calculate total value of quotes (let's assume 'open' means all quotes for now as per original code, or perhaps we want to sum total_amount)
  SELECT COALESCE(sum(total_amount), 0), count(*) INTO v_open_quotes_total, v_recent_sales_count
  FROM quotes
  WHERE shop_id = p_shop_id;

  v_result.follow_ups_count := v_follow_ups_count;
  v_result.project_leads_count := v_project_leads_count;
  v_result.open_quotes_total := v_open_quotes_total;
  v_result.recent_sales_count := v_recent_sales_count;
  v_result.follow_up_list := v_follow_up_list;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
