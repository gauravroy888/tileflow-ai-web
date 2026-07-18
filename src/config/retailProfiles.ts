export type ModuleId =
  | 'variants'
  | 'serialized'
  | 'batch_expiry'
  | 'project_sales'
  | 'service'
  | 'delivery'
  | 'installation'
  | 'warranty'
  | 'wholesale'
  | 'multi_store';

export type ProductFieldSchema = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  options?: string[]; // For select type
};

export type RetailProfile = {
  id: string;
  displayName: string;
  recommendedModules: ModuleId[];
  copy: {
    dashboardWidget1: string;
    dashboardWidget2: string;
    dashboardWidget3: string;
    customerVisitLabel: string;
    emptyStateIcon: string;
  };
  iconKey: string;
  productFieldSchema: ProductFieldSchema[];
  calculatorKey: 'generic' | 'area_wastage' | 'service_booking' | 'delivery_installation';
  aiProfileKey: string;
};

export const retailProfiles: Record<string, RetailProfile> = {
  showroom: {
    id: 'showroom',
    displayName: 'Showroom',
    recommendedModules: [],
    copy: {
      dashboardWidget1: 'Total Quotes',
      dashboardWidget2: 'Active Leads',
      dashboardWidget3: 'Recent Sales',
      customerVisitLabel: 'Visit',
      emptyStateIcon: 'Store',
    },
    iconKey: 'store',
    productFieldSchema: [],
    calculatorKey: 'generic',
    aiProfileKey: 'generic_retail',
  },
  tiles: {
    id: 'tiles',
    displayName: 'Tile Showroom',
    recommendedModules: ['variants', 'project_sales', 'delivery'],
    copy: {
      dashboardWidget1: 'Open Quotes Area',
      dashboardWidget2: 'Project Leads',
      dashboardWidget3: 'Recent Orders',
      customerVisitLabel: 'Site Measure',
      emptyStateIcon: 'Grid',
    },
    iconKey: 'grid',
    productFieldSchema: [
      { key: 'size', label: 'Size', type: 'text' },
      { key: 'finish', label: 'Finish', type: 'select', options: ['Matte', 'Glossy', 'Satin', 'Textured'] },
      { key: 'material', label: 'Material', type: 'text' },
    ],
    calculatorKey: 'area_wastage',
    aiProfileKey: 'tiles',
  },
  furniture: {
    id: 'furniture',
    displayName: 'Furniture Store',
    recommendedModules: ['variants', 'project_sales', 'delivery', 'installation'],
    copy: {
      dashboardWidget1: 'Pending Deliveries',
      dashboardWidget2: 'Active Consultations',
      dashboardWidget3: 'Recent Sales',
      customerVisitLabel: 'Consultation',
      emptyStateIcon: 'Sofa',
    },
    iconKey: 'sofa',
    productFieldSchema: [
      { key: 'fabric', label: 'Fabric/Material', type: 'text' },
      { key: 'dimensions', label: 'Dimensions', type: 'text' },
      { key: 'color', label: 'Color', type: 'text' },
    ],
    calculatorKey: 'delivery_installation',
    aiProfileKey: 'furniture',
  },
  bathware: {
    id: 'bathware',
    displayName: 'Bathware Showroom',
    recommendedModules: ['variants', 'project_sales', 'delivery'],
    copy: {
      dashboardWidget1: 'Open Quotes',
      dashboardWidget2: 'Project Leads',
      dashboardWidget3: 'Recent Sales',
      customerVisitLabel: 'Consultation',
      emptyStateIcon: 'Bath',
    },
    iconKey: 'bath',
    productFieldSchema: [
      { key: 'finish', label: 'Finish', type: 'select', options: ['Chrome', 'Matte Black', 'Brushed Nickel', 'Brass'] },
      { key: 'collection', label: 'Collection', type: 'text' },
    ],
    calculatorKey: 'generic',
    aiProfileKey: 'bathware',
  },
  lighting: {
    id: 'lighting',
    displayName: 'Lighting Store',
    recommendedModules: ['variants', 'project_sales', 'delivery'],
    copy: {
      dashboardWidget1: 'Open Quotes',
      dashboardWidget2: 'Project Leads',
      dashboardWidget3: 'Recent Sales',
      customerVisitLabel: 'Consultation',
      emptyStateIcon: 'Lightbulb',
    },
    iconKey: 'lightbulb',
    productFieldSchema: [
      { key: 'wattage', label: 'Wattage', type: 'text' },
      { key: 'lumens', label: 'Lumens', type: 'text' },
      { key: 'color_temp', label: 'Color Temperature', type: 'text' },
    ],
    calculatorKey: 'generic',
    aiProfileKey: 'lighting',
  },
  electronics: {
    id: 'electronics',
    displayName: 'Electronics Store',
    recommendedModules: ['variants', 'serialized', 'warranty', 'installation'],
    copy: {
      dashboardWidget1: 'Active Warranties',
      dashboardWidget2: 'Support Tickets',
      dashboardWidget3: 'Recent Sales',
      customerVisitLabel: 'Consultation',
      emptyStateIcon: 'Monitor',
    },
    iconKey: 'monitor',
    productFieldSchema: [
      { key: 'serial', label: 'Serial Number', type: 'text' },
      { key: 'warranty', label: 'Warranty (Months)', type: 'number' },
    ],
    calculatorKey: 'generic', // Could have an electronics calculator later
    aiProfileKey: 'electronics',
  },
  pharmacy: {
    id: 'pharmacy',
    displayName: 'Pharmacy',
    recommendedModules: ['batch_expiry', 'variants'],
    copy: {
      dashboardWidget1: 'Expiring Soon',
      dashboardWidget2: 'Low Stock',
      dashboardWidget3: 'Recent Sales',
      customerVisitLabel: 'Consultation',
      emptyStateIcon: 'Pill',
    },
    iconKey: 'pill',
    productFieldSchema: [
      { key: 'batch_number', label: 'Batch Number', type: 'text' },
      { key: 'expiry_date', label: 'Expiry Date', type: 'text' }, // Can be date later
    ],
    calculatorKey: 'generic',
    aiProfileKey: 'pharmacy',
  },
  salon: {
    id: 'salon',
    displayName: 'Salon / Tailoring',
    recommendedModules: ['service'],
    copy: {
      dashboardWidget1: 'Today Appointments',
      dashboardWidget2: 'Active Clients',
      dashboardWidget3: 'Recent Services',
      customerVisitLabel: 'Booking',
      emptyStateIcon: 'Scissors',
    },
    iconKey: 'scissors',
    productFieldSchema: [
      { key: 'duration', label: 'Duration (mins)', type: 'number' },
      { key: 'service_type', label: 'Service Category', type: 'text' },
    ],
    calculatorKey: 'service_booking',
    aiProfileKey: 'salon',
  }
};
