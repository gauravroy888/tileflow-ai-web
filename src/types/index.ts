export interface Shop {
  id: string;
  name: string;
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
  created_at: string;
}
