import { MessageSquare, Paintbrush, Box, ImageIcon, Wrench, Tv, PlusCircle, FileText, AlertTriangle, Pill, User, Shirt, Scissors } from 'lucide-react';

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

export type AIFeatureType = 'chat' | 'vision_no_image' | 'vision_with_image' | 'image_generation';

export type AIFeature = {
  id: string;
  type: 'chat' | 'vision_with_image' | 'vision_no_image' | 'image_generation';
  title: string;
  description: string;
  icon: any;
  color: string;
  isHero?: boolean;
  systemPrompt: string;
  buttonText?: string;
};

export type ThemePalette = {
  primary: string;
  primaryHover: string;
  accent: string;
  accentSoft: string;
  success: string;
  warning: string;
  error: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  sand: string;
  stone: string;
};

export interface RetailProfile {
  id: string;
  displayName: string;
  recommendedModules: ModuleId[];
  iconKey: string;
  copy: {
    dashboardTitle: string;
    productAdd: string;
    customerVisit: string;
    metrics: {
      total: string;
      active: string;
      pending: string;
    };
  };
  productFieldSchema: {
    key: string;
    label: string;
    type: 'text' | 'number' | 'boolean' | 'date' | 'select';
    options?: string[];
  }[];
  calculatorKey: 'area_wastage' | 'generic' | 'service_booking' | 'delivery_installation';
  aiProfileKey: string;
  aiFeatures: AIFeature[];
  theme: ThemePalette;
}

const themeShowroom: ThemePalette = {
  primary: '#0D2D4D',
  primaryHover: '#0A243D',
  accent: '#C96C45',
  accentSoft: '#F8E8E0',
  success: '#177B63',
  warning: '#B86D13',
  error: '#C63C3C',
  background: '#F7F5F0',
  surface: '#FFFFFF',
  textPrimary: '#17212B',
  textSecondary: '#67727E',
  border: '#E7E2DA',
  sand: '#F1ECE3',
  stone: '#D7CFC2',
};

const themeTiles: ThemePalette = {
  primary: '#4A3B32',
  primaryHover: '#382D26',
  accent: '#D97746',
  accentSoft: '#FAEDE6',
  success: '#4F7959',
  warning: '#C18931',
  error: '#B54949',
  background: '#F8F6F4',
  surface: '#FFFFFF',
  textPrimary: '#2D241E',
  textSecondary: '#7A6B63',
  border: '#E8DFD8',
  sand: '#F2EBE5',
  stone: '#D4C8BF',
};

const themeFurniture: ThemePalette = {
  primary: '#1F3C34',
  primaryHover: '#152C25',
  accent: '#C58C5D',
  accentSoft: '#F8F3EE',
  success: '#177B63',
  warning: '#B86D13',
  error: '#C63C3C',
  background: '#F6F7F6',
  surface: '#FFFFFF',
  textPrimary: '#15201D',
  textSecondary: '#667470',
  border: '#E2E6E4',
  sand: '#EDF0EE',
  stone: '#C9D1CE',
};

const themeBathware: ThemePalette = {
  primary: '#1E4C6B',
  primaryHover: '#143851',
  accent: '#5AB0D2',
  accentSoft: '#EBF6FA',
  success: '#177B63',
  warning: '#B86D13',
  error: '#C63C3C',
  background: '#F5FAFC',
  surface: '#FFFFFF',
  textPrimary: '#122635',
  textSecondary: '#637A8C',
  border: '#DCEBF2',
  sand: '#EAF3F8',
  stone: '#BDD4E0',
};

const themeLighting: ThemePalette = {
  primary: '#13151A',
  primaryHover: '#0A0C10',
  accent: '#F2C94C',
  accentSoft: '#332B14',
  success: '#27AE60',
  warning: '#F2994A',
  error: '#EB5757',
  background: '#0B0D11',
  surface: '#13151A',
  textPrimary: '#F2F4F7',
  textSecondary: '#8B949E',
  border: '#30363D',
  sand: '#1C2128',
  stone: '#444C56',
};

const themeElectronics: ThemePalette = {
  primary: '#0EA5E9',
  primaryHover: '#0284C7',
  accent: '#38BDF8',
  accentSoft: '#E0F2FE',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  sand: '#F1F5F9',
  stone: '#CBD5E1',
};

const themePharmacy: ThemePalette = {
  primary: '#0B6B4C',
  primaryHover: '#084F38',
  accent: '#319777',
  accentSoft: '#E8F5F1',
  success: '#177B63',
  warning: '#B86D13',
  error: '#C63C3C',
  background: '#F4FBF9',
  surface: '#FFFFFF',
  textPrimary: '#11221C',
  textSecondary: '#5A756B',
  border: '#D8EBE5',
  sand: '#EBF4F1',
  stone: '#C5DCD4',
};

const themeSalon: ThemePalette = {
  primary: '#6B4C7A',
  primaryHover: '#533B5F',
  accent: '#D492A7',
  accentSoft: '#F6EBF0',
  success: '#177B63',
  warning: '#B86D13',
  error: '#C63C3C',
  background: '#FCF9FA',
  surface: '#FFFFFF',
  textPrimary: '#2D1E31',
  textSecondary: '#856A8C',
  border: '#EADCE3',
  sand: '#F2E8EC',
  stone: '#D1B9C7',
};

const defaultShowroomFeatures: AIFeature[] = [
  {
    id: 'visualize',
    type: 'image_generation',
    title: 'Visualise a customer’s space',
    description: 'Start from a room idea and bring your own products into the concept.',
    icon: ImageIcon,
    color: 'bg-primary text-background',
    isHero: true,
    buttonText: 'Create a design',
    systemPrompt: 'You are an expert interior designer. The user wants to visualize a retail space. Based on this description, provide a very detailed, vivid written description of what this space looks like — as if you are describing the final result of the design to a client. Include colors, materials, lighting, layout, and atmosphere. Description: "{prompt}"'
  },
  {
    id: 'chat',
    type: 'chat',
    title: 'Retail chat',
    description: 'Ask about customers or stock',
    icon: MessageSquare,
    color: 'bg-[#E7EFF8] text-[#315B91]',
    systemPrompt: 'You are a helpful AI assistant for retail store owners...'
  },
  {
    id: 'style',
    type: 'vision_with_image',
    title: 'Restyle a room',
    description: 'Refresh an uploaded photo',
    icon: Paintbrush,
    color: 'bg-[#F3EBFA] text-[#7D3FB5]',
    systemPrompt: 'You are an expert interior designer. The user has uploaded a photo of a space and wants to change its style. Analyze the current space and then describe in vivid detail what it would look like after applying this style change: "{prompt}". Be specific about colors, materials, textures, and atmosphere.'
  },
  {
    id: 'object',
    type: 'vision_with_image',
    title: 'Place a product',
    description: 'Try a tile in a space',
    icon: Box,
    color: 'bg-[#F8ECD5] text-[#B86D13]',
    systemPrompt: 'You are an expert interior designer. The user has uploaded a photo of a space and wants to place an object in it. Analyze the current space carefully and describe in vivid detail what it would look like with this addition: "{prompt}". Mention exactly where the object would go, how it fits with the existing decor, and what impact it has on the overall look.'
  }
];

const electronicsFeatures: AIFeature[] = [
  {
    id: 'hometheater',
    type: 'vision_with_image',
    title: 'Home Theater Planner',
    description: 'Analyze room dimensions for TV size and placement.',
    icon: Tv,
    color: 'bg-primary text-background',
    isHero: true,
    buttonText: 'Plan Layout',
    systemPrompt: 'You are an expert AV installer. The user has uploaded a photo of a room and wants to set up a home theater. Based on this space, recommend the optimal TV size, viewing angle, and soundbar placement. Describe the final setup: "{prompt}"'
  },
  {
    id: 'chat',
    type: 'chat',
    title: 'Retail chat',
    description: 'Ask about customers or stock',
    icon: MessageSquare,
    color: 'bg-[#E7EFF8] text-[#315B91]',
    systemPrompt: 'You are a helpful AI assistant for retail store owners...'
  },
  {
    id: 'upgrade',
    type: 'vision_no_image',
    title: 'Upgrade Recommender',
    description: 'Suggest compatible accessories',
    icon: PlusCircle,
    color: 'bg-[#F3EBFA] text-[#7D3FB5]',
    systemPrompt: 'You are an expert electronics salesperson. The user is asking about an accessory upgrade or compatibility for a specific device: "{prompt}". Provide a highly detailed recommendation of 3 compatible accessories or upgrades, explaining why they are a perfect match.'
  },
  {
    id: 'setup',
    type: 'vision_no_image',
    title: 'Setup Guide Generator',
    description: 'Create a step-by-step setup guide',
    icon: Wrench,
    color: 'bg-[#F8ECD5] text-[#B86D13]',
    systemPrompt: 'You are an expert technical support specialist. Generate a clear, easy-to-follow, step-by-step setup guide for the following device or situation: "{prompt}". Format it in bullet points and include common troubleshooting tips.'
  }
];

const pharmacyFeatures: AIFeature[] = [
  {
    id: 'prescription',
    type: 'vision_with_image',
    title: 'Prescription Decoder',
    description: 'Read and match handwritten prescriptions.',
    icon: FileText,
    color: 'bg-primary text-background',
    isHero: true,
    buttonText: 'Scan Prescription',
    systemPrompt: 'You are an expert pharmacist AI. The user has uploaded an image of a handwritten medical prescription. Transcribe the medicines written on it accurately. Then, match those medicines to common stock availability. Format the output clearly. Instructions from user: "{prompt}"'
  },
  {
    id: 'chat',
    type: 'chat',
    title: 'Retail chat',
    description: 'Ask about customers or stock',
    icon: MessageSquare,
    color: 'bg-[#E7EFF8] text-[#315B91]',
    systemPrompt: 'You are a helpful AI assistant for retail store owners...'
  },
  {
    id: 'interaction',
    type: 'vision_no_image',
    title: 'Interaction Checker',
    description: 'Check for drug interactions',
    icon: AlertTriangle,
    color: 'bg-[#F3EBFA] text-[#7D3FB5]',
    systemPrompt: 'You are an expert clinical pharmacist. The user will provide a list of medications: "{prompt}". Analyze them and provide a concise report on any potential drug-drug interactions, contraindications, or severe side effects. Highlight any severe warnings.'
  },
  {
    id: 'substitute',
    type: 'vision_no_image',
    title: 'Generic Substitute',
    description: 'Find chemical equivalents',
    icon: Pill,
    color: 'bg-[#F8ECD5] text-[#B86D13]',
    systemPrompt: 'You are an expert pharmacist. The user is asking for a generic substitute or alternative for a specific branded medicine: "{prompt}". State the active chemical ingredients and provide 2-3 common generic alternatives that have the exact same composition.'
  }
];

const salonFeatures: AIFeature[] = [
  {
    id: 'tryon',
    type: 'image_generation',
    title: 'Virtual Try-On',
    description: 'Preview a hairstyle or color.',
    icon: User,
    color: 'bg-primary text-background',
    isHero: true,
    buttonText: 'Try On Look',
    systemPrompt: 'You are an expert hairstylist and digital artist. The user has uploaded their photo and wants to try a specific look: "{prompt}". Generate a realistic image showing the user with this exact new hairstyle, cut, or color.'
  },
  {
    id: 'chat',
    type: 'chat',
    title: 'Retail chat',
    description: 'Ask about customers or stock',
    icon: MessageSquare,
    color: 'bg-[#E7EFF8] text-[#315B91]',
    systemPrompt: 'You are a helpful AI assistant for retail store owners...'
  },
  {
    id: 'drape',
    type: 'vision_with_image',
    title: 'Fabric Drape Simulator',
    description: 'Visualize fabric on a mannequin',
    icon: Shirt,
    color: 'bg-[#F3EBFA] text-[#7D3FB5]',
    systemPrompt: 'You are an expert tailor. The user has uploaded an image of a specific fabric pattern. Describe in vivid detail how this fabric would look when stitched into a tailored suit, dress, or shirt as requested: "{prompt}".'
  },
  {
    id: 'trend',
    type: 'vision_no_image',
    title: 'Trend Matcher',
    description: 'Suggest latest styles',
    icon: Scissors,
    color: 'bg-[#F8ECD5] text-[#B86D13]',
    systemPrompt: 'You are a top-tier fashion and styling consultant. The user is asking for seasonal trend recommendations: "{prompt}". Provide 3 highly fashionable, trendy suggestions for cuts, colors, or tailoring styles currently popular this season.'
  }
];

export const retailProfiles: Record<string, RetailProfile> = {
  showroom: {
    id: 'showroom',
    displayName: 'Showroom',
    recommendedModules: [],
    iconKey: 'store',
    copy: {
      dashboardTitle: 'Dashboard',
      productAdd: 'Add Product',
      customerVisit: 'Visit',
      metrics: { total: 'Total Quotes', active: 'Active Leads', pending: 'Recent Sales' }
    },
    productFieldSchema: [],
    calculatorKey: 'generic',
    aiProfileKey: 'generic_retail',
    aiFeatures: defaultShowroomFeatures,
    theme: themeShowroom,
  },
  tiles: {
    id: 'tiles',
    displayName: 'Tile Showroom',
    recommendedModules: ['variants', 'project_sales', 'delivery'],
    iconKey: 'grid',
    copy: {
      dashboardTitle: 'Tiles Dashboard',
      productAdd: 'Add Tile',
      customerVisit: 'Site Measure',
      metrics: { total: 'Open Quotes Area', active: 'Project Leads', pending: 'Recent Orders' }
    },
    productFieldSchema: [
      { key: 'size', label: 'Size', type: 'text' },
      { key: 'finish', label: 'Finish', type: 'select', options: ['Matte', 'Glossy', 'Satin', 'Textured'] },
      { key: 'material', label: 'Material', type: 'text' },
    ],
    calculatorKey: 'area_wastage',
    aiProfileKey: 'tiles',
    aiFeatures: defaultShowroomFeatures,
    theme: themeTiles,
  },
  furniture: {
    id: 'furniture',
    displayName: 'Furniture Store',
    recommendedModules: ['variants', 'project_sales', 'delivery', 'installation'],
    iconKey: 'sofa',
    copy: {
      dashboardTitle: 'Furniture Dashboard',
      productAdd: 'Add Furniture',
      customerVisit: 'Consultation',
      metrics: { total: 'Pending Deliveries', active: 'Active Consultations', pending: 'Recent Sales' }
    },
    productFieldSchema: [
      { key: 'fabric', label: 'Fabric/Material', type: 'text' },
      { key: 'dimensions', label: 'Dimensions', type: 'text' },
      { key: 'color', label: 'Color', type: 'text' },
    ],
    calculatorKey: 'delivery_installation',
    aiProfileKey: 'furniture',
    aiFeatures: defaultShowroomFeatures,
    theme: themeFurniture,
  },
  bathware: {
    id: 'bathware',
    displayName: 'Bathware Showroom',
    recommendedModules: ['variants', 'project_sales', 'delivery'],
    iconKey: 'bath',
    copy: {
      dashboardTitle: 'Bathware Dashboard',
      productAdd: 'Add Product',
      customerVisit: 'Consultation',
      metrics: { total: 'Open Quotes', active: 'Project Leads', pending: 'Recent Sales' }
    },
    productFieldSchema: [
      { key: 'finish', label: 'Finish', type: 'select', options: ['Chrome', 'Matte Black', 'Brushed Nickel', 'Brass'] },
      { key: 'collection', label: 'Collection', type: 'text' },
    ],
    calculatorKey: 'generic',
    aiProfileKey: 'bathware',
    aiFeatures: defaultShowroomFeatures,
    theme: themeBathware,
  },
  lighting: {
    id: 'lighting',
    displayName: 'Lighting Store',
    recommendedModules: ['variants', 'project_sales', 'delivery'],
    iconKey: 'lightbulb',
    copy: {
      dashboardTitle: 'Lighting Dashboard',
      productAdd: 'Add Light',
      customerVisit: 'Consultation',
      metrics: { total: 'Open Quotes', active: 'Project Leads', pending: 'Recent Sales' }
    },
    productFieldSchema: [
      { key: 'wattage', label: 'Wattage', type: 'text' },
      { key: 'lumens', label: 'Lumens', type: 'text' },
      { key: 'color_temp', label: 'Color Temperature', type: 'text' },
    ],
    calculatorKey: 'generic',
    aiProfileKey: 'lighting',
    aiFeatures: defaultShowroomFeatures,
    theme: themeLighting,
  },
  electronics: {
    id: 'electronics',
    displayName: 'Electronics Store',
    recommendedModules: ['variants', 'serialized', 'warranty', 'installation'],
    iconKey: 'monitor',
    copy: {
      dashboardTitle: 'Electronics Dashboard',
      productAdd: 'Add Device',
      customerVisit: 'Consultation',
      metrics: { total: 'Active Warranties', active: 'Support Tickets', pending: 'Recent Sales' }
    },
    productFieldSchema: [
      { key: 'serial', label: 'Serial Number', type: 'text' },
      { key: 'warranty', label: 'Warranty (Months)', type: 'number' },
    ],
    calculatorKey: 'generic',
    aiProfileKey: 'electronics',
    aiFeatures: electronicsFeatures,
    theme: themeElectronics,
  },
  pharmacy: {
    id: 'pharmacy',
    displayName: 'Pharmacy',
    recommendedModules: ['batch_expiry', 'variants'],
    iconKey: 'pill',
    copy: {
      dashboardTitle: 'Pharmacy Dashboard',
      productAdd: 'Add Medicine',
      customerVisit: 'Prescription',
      metrics: { total: 'Expiring Soon', active: 'Low Stock', pending: 'Recent Sales' }
    },
    productFieldSchema: [
      { key: 'batch', label: 'Batch Number', type: 'text' },
      { key: 'expiry', label: 'Expiry Date', type: 'date' },
      { key: 'prescription', label: 'Prescription Required', type: 'boolean' }
    ],
    calculatorKey: 'generic',
    aiProfileKey: 'pharmacy',
    aiFeatures: pharmacyFeatures,
    theme: themePharmacy,
  },
  salon: {
    id: 'salon',
    displayName: 'Salon / Tailoring',
    recommendedModules: ['service'],
    iconKey: 'scissors',
    copy: {
      dashboardTitle: 'Salon Dashboard',
      productAdd: 'Add Service',
      customerVisit: 'Appointment',
      metrics: { total: 'Today\'s Appointments', active: 'Active Clients', pending: 'Completed Services' }
    },
    productFieldSchema: [
      { key: 'duration', label: 'Duration (Mins)', type: 'number' },
      { key: 'category', label: 'Category', type: 'select', options: ['Hair', 'Nails', 'Spa', 'Alteration', 'Tailoring'] }
    ],
    calculatorKey: 'service_booking',
    aiProfileKey: 'salon',
    aiFeatures: salonFeatures,
    theme: themeSalon,
  }
};
