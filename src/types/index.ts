export interface Shop {
  id: string;
  name: string;
  shop_type?: string;
  onboarding_completed?: boolean;
  settings?: Record<string, any>;
  created_at: string;
}

export interface Profile {
  id: string;
  shop_id: string;
  role: 'owner' | 'sales_executive';
  full_name: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  shop_id: string;
  name: string;
  brand: string | null;
  sku: string | null;
  category: string | null;
  finish: string | null;
  size: string | null;
  thickness: number | null;
  material: string | null;
  color: string | null;
  texture: string | null;
  price: number;
  stock_status: string;
  tags: string[] | null;
  image_url: string | null;
  images?: string[];
  attributes: Record<string, any>;
  created_at: string;
}

export interface Customer {
  id: string;
  shop_id: string;
  name: string;
  phone: string | null;
  budget: number | null;
  project_type: string | null;
  location: string | null;
  visit_status: string;
  assigned_to: string | null;
  notes: string | null;
  required_products: string | null;
  ai_draft_message?: string | null;
  created_at: string;
  assigned_profile?: {
    full_name: string | null;
  } | null;
}

export interface Quote {
  id: string;
  shop_id: string;
  customer_id: string | null;
  subtotal: number;
  tax: number;
  total_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  product_id: string | null;
  quantity: number;
  price_at_time: number;
  created_at: string;
}

export interface ChatSession {
  id: string;
  shop_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  shop_id: string;
  title: string;
  message: string;
  type: 'feature' | 'alert' | 'follow_up' | 'info';
  is_read: boolean;
  created_at: string;
}

