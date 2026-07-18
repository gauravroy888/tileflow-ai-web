export type QuoteItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  areaPerPiece?: number; // for area_wastage
  duration?: number; // for service_booking
};

export type CalculatorResult = {
  subtotal: number;
  tax: number;
  total: number;
  breakdown: Record<string, number | string>;
};

export type CalculatorConfig = {
  wastePercentage?: number;
  deliveryFee?: number;
  taxRate?: number;
};

export const genericCalculator = (items: QuoteItem[], config: CalculatorConfig = {}): CalculatorResult => {
  const { taxRate = 0.18 } = config;
  
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return {
    subtotal,
    tax,
    total,
    breakdown: {
      'Total Items': items.reduce((sum, item) => sum + item.quantity, 0),
    }
  };
};

export const areaWastageCalculator = (items: QuoteItem[], config: CalculatorConfig = {}): CalculatorResult => {
  const { wastePercentage = 10, taxRate = 0.18, deliveryFee = 1840 } = config;
  
  const totalArea = items.reduce((sum, item) => sum + item.quantity * (item.areaPerPiece || 1), 0);
  const materialValue = items.reduce((sum, item) => sum + item.quantity * (item.areaPerPiece || 1) * item.price, 0);
  
  const subtotal = materialValue * (1 + wastePercentage / 100);
  const tax = subtotal * taxRate;
  const transport = items.length ? deliveryFee : 0;
  const total = subtotal + tax + transport;

  return {
    subtotal,
    tax,
    total,
    breakdown: {
      'Total Area': `${totalArea.toFixed(2)} sq ft`,
      'Wastage': `${wastePercentage}%`,
      'Transport': transport,
    }
  };
};

export const serviceBookingCalculator = (items: QuoteItem[], config: CalculatorConfig = {}): CalculatorResult => {
  const { taxRate = 0.18 } = config;
  
  const totalDuration = items.reduce((sum, item) => sum + item.quantity * (item.duration || 60), 0);
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return {
    subtotal,
    tax,
    total,
    breakdown: {
      'Total Duration': `${totalDuration} mins`,
    }
  };
};

export const deliveryInstallationCalculator = (items: QuoteItem[], config: CalculatorConfig = {}): CalculatorResult => {
  const { taxRate = 0.18, deliveryFee = 2500 } = config;
  
  const itemsSubtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const installationFee = items.reduce((sum, item) => sum + item.quantity * 500, 0); // Flat 500 per item for example
  const subtotal = itemsSubtotal + installationFee;
  const tax = subtotal * taxRate;
  const transport = items.length ? deliveryFee : 0;
  const total = subtotal + tax + transport;

  return {
    subtotal,
    tax,
    total,
    breakdown: {
      'Items': itemsSubtotal,
      'Installation': installationFee,
      'Transport': transport,
    }
  };
};

export const calculators: Record<string, typeof genericCalculator> = {
  generic: genericCalculator,
  area_wastage: areaWastageCalculator,
  service_booking: serviceBookingCalculator,
  delivery_installation: deliveryInstallationCalculator,
};
