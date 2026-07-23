import Papa from 'papaparse';
import JSZip from 'jszip';
import { supabase } from './supabase';
import { uploadToR2 } from './r2Storage';
import type { Product, Customer } from '../types';

export const exportProductsToCSV = (products: Product[]) => {
  const csv = Papa.unparse(products.map(p => ({
    name: p.name,
    sku: p.sku || '',
    category: p.category || '',
    price: p.price,
    stock_status: p.stock_status || 'in_stock',
  })));

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const importProductsFromCSV = async (file: File, shopId: string): Promise<number> => {
  if (file.name.toLowerCase().endsWith('.zip')) {
    return handleZipImport(file, shopId);
  }
  return handleCsvImport(file, shopId);
};

const saveImportedProducts = async (newProducts: any[], shopId: string): Promise<number> => {
  if (newProducts.length === 0) return 0;

  // Fetch existing products for shop (including archived items)
  const { data: existingProducts } = await supabase
    .from('products')
    .select('id, sku, name')
    .eq('shop_id', shopId);

  const existingMap = new Map<string, string>();
  if (existingProducts) {
    for (const p of existingProducts) {
      if (p.sku) existingMap.set(`sku:${p.sku.toLowerCase().trim()}`, p.id);
      if (p.name) existingMap.set(`name:${p.name.toLowerCase().trim()}`, p.id);
    }
  }

  const toUpdate: any[] = [];
  const toInsert: any[] = [];

  for (const prod of newProducts) {
    const skuKey = prod.sku ? `sku:${prod.sku.toLowerCase().trim()}` : null;
    const nameKey = prod.name ? `name:${prod.name.toLowerCase().trim()}` : null;
    
    const existingId = (skuKey && existingMap.get(skuKey)) || (nameKey && existingMap.get(nameKey));

    if (existingId) {
      toUpdate.push({
        ...prod,
        id: existingId,
        is_archived: false, // Automatically un-archive restored products!
      });
    } else {
      toInsert.push({
        ...prod,
        is_archived: false,
      });
    }
  }

  if (toUpdate.length > 0) {
    const { error: updateErr } = await supabase.from('products').upsert(toUpdate);
    if (updateErr) throw updateErr;
  }

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase.from('products').insert(toInsert);
    if (insertErr) throw insertErr;
  }

  return toUpdate.length + toInsert.length;
};

const handleCsvImport = (file: File, shopId: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const newProducts = await processCsvData(results.data, shopId, null);
          const count = await saveImportedProducts(newProducts, shopId);
          resolve(count);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => reject(error)
    });
  });
};

const handleZipImport = async (file: File, shopId: string): Promise<number> => {
  const zip = new JSZip();
  const contents = await zip.loadAsync(file);
  
  let csvFile: JSZip.JSZipObject | undefined;
  for (const filename of Object.keys(contents.files)) {
    if (filename.toLowerCase().endsWith('.csv') && !filename.includes('__MACOSX')) {
      csvFile = contents.files[filename];
      break;
    }
  }

  if (!csvFile) throw new Error("Could not find a .csv file inside the ZIP.");

  const csvText = await csvFile.async('text');
  const results = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  
  const newProducts = await processCsvData(results.data, shopId, contents);
  return saveImportedProducts(newProducts, shopId);
};

const DEFAULT_RATES_TO_INR: Record<string, number> = {
  USD: 86.5,
  '$': 86.5,
  EUR: 93.2,
  '€': 93.2,
  GBP: 109.5,
  '£': 109.5,
  CAD: 62.1,
  AUD: 55.4,
  AED: 23.5,
  INR: 1.0,
  '₹': 1.0,
};

const rateCache: Record<string, number> = {};

const getRateToINR = async (currencyStr?: string): Promise<number> => {
  if (!currencyStr) return 1.0;
  const curr = currencyStr.toString().trim().toUpperCase();
  if (curr === 'INR' || curr === '₹') return 1.0;
  
  if (rateCache[curr]) return rateCache[curr];

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${curr}`);
    const data = await res.json();
    if (data && data.result === 'success' && data.rates && data.rates['INR']) {
      const rate = data.rates['INR'];
      rateCache[curr] = rate;
      return rate;
    }
  } catch (err) {
    console.warn(`Could not fetch live exchange rate for ${curr}, using preset:`, err);
  }

  const fallback = DEFAULT_RATES_TO_INR[curr] || 1.0;
  rateCache[curr] = fallback;
  return fallback;
};

const processCsvData = async (data: any[], shopId: string, zipContents: JSZip | null) => {
  const newProducts = [];
  
  for (const row of data) {
    const getVal = (keys: string[]) => {
      const foundKey = Object.keys(row).find(k => keys.includes(k.toLowerCase().trim()));
      return foundKey ? row[foundKey] : undefined;
    };

    const name = getVal(['name', 'product name', 'title']);
    const sku = getVal(['sku', 'ean', 'internal id', 'id']);
    const category = getVal(['category', 'type', 'department']);
    const price = getVal(['price', 'cost', 'amount']);
    const currency = getVal(['currency', 'curr', 'price_currency', 'currency_code']);
    const stock_status = getVal(['stock_status', 'availability', 'stock']);
    let image_url = getVal(['image_url', 'image url', 'image', 'picture']);

    const knownKeys = ['name', 'product name', 'title', 'sku', 'ean', 'internal id', 'id', 'category', 'type', 'department', 'price', 'cost', 'amount', 'currency', 'curr', 'price_currency', 'currency_code', 'stock_status', 'availability', 'stock', 'image', 'image_url', 'image url', 'picture', ''];
    
    const attributes: Record<string, any> = {};
    Object.keys(row).forEach(key => {
      if (key && !knownKeys.includes(key.toLowerCase().trim())) {
        attributes[key] = row[key];
      }
    });

    let rawPrice = parseFloat(price || '0');
    if (isNaN(rawPrice)) rawPrice = 0;

    let finalPriceInINR = rawPrice;
    if (currency) {
      const currStr = currency.toString().trim();
      const rateToINR = await getRateToINR(currStr);
      finalPriceInINR = Math.round(rawPrice * rateToINR);
      // Store currency as INR since price has been converted to Rupees
      attributes.currency = 'INR';
      attributes.original_currency = currStr;
      attributes.original_price = rawPrice;
    } else {
      attributes.currency = 'INR';
    }

    // Check if image refers to a local file in ZIP
    if (image_url && zipContents && !image_url.startsWith('http')) {
      // Find the file in the zip
      const imgFileName = Object.keys(zipContents.files).find(
        name => name.toLowerCase().endsWith(image_url!.toLowerCase()) && !name.includes('__MACOSX')
      );
      
      if (imgFileName) {
        const imgFile = zipContents.files[imgFileName];
        const blob = await imgFile.async('blob');
        const safeName = `${Date.now()}-${image_url.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        image_url = await uploadToR2(blob, safeName);
      }
    } else if (image_url && image_url.startsWith('http')) {
      // It's a public URL. Send to edge function to fetch and upload to R2
      try {
        const { data, error } = await supabase.functions.invoke('r2-fetch-image', {
          body: { imageUrl: image_url }
        });
        if (!error && data?.url) {
          image_url = data.url;
        }
      } catch (err) {
        console.error("Failed to fetch remote image", err);
      }
    } else {
      image_url = null;
    }

    newProducts.push({
      shop_id: shopId,
      name: name || 'Unnamed Product',
      sku: sku || null,
      category: category || 'General',
      price: finalPriceInINR,
      stock_status: stock_status || 'in_stock',
      image_url: image_url,
      attributes
    });
  }
  
  return newProducts;
};

export const exportCustomersToCSV = (customers: Customer[]) => {
  const csv = Papa.unparse(customers.map(c => ({
    name: c.name,
    phone: c.phone || '',
    budget: c.budget || '',
    location: c.location || '',
    project_type: c.project_type || '',
    status: c.visit_status || 'new',
    notes: c.notes || '',
    required_products: c.required_products || '',
    created_at: new Date(c.created_at).toLocaleDateString(),
  })));

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
