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

const handleCsvImport = (file: File, shopId: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const newProducts = await processCsvData(results.data, shopId, null);
          if (newProducts.length === 0) return resolve(0);

          const { error } = await supabase.from('products').insert(newProducts);
          if (error) throw error;
          resolve(newProducts.length);
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
  if (newProducts.length === 0) return 0;

  const { error } = await supabase.from('products').insert(newProducts);
  if (error) throw error;
  
  return newProducts.length;
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
    const stock_status = getVal(['stock_status', 'availability', 'stock']);
    let image_url = getVal(['image_url', 'image url', 'image', 'picture']);

    const knownKeys = ['name', 'product name', 'title', 'sku', 'ean', 'internal id', 'id', 'category', 'type', 'department', 'price', 'cost', 'amount', 'stock_status', 'availability', 'stock', 'image', 'image_url', 'image url', 'picture', ''];
    
    const attributes: Record<string, any> = {};
    Object.keys(row).forEach(key => {
      if (key && !knownKeys.includes(key.toLowerCase().trim())) {
        attributes[key] = row[key];
      }
    });

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
      price: Math.round(parseFloat(price || '0')),
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
