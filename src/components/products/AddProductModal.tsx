import React, { useState, useCallback, useEffect } from 'react';
import { X, Loader2, Image as ImageIcon, Check, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadToR2 } from '../../lib/r2Storage';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { getCroppedImg } from '../../utils/cropImage';
import { useRetailProfile } from '../providers/RetailProfileProvider';

import type { Product } from '../../types';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: () => void;
  shopId: string | null;
  productToEdit?: Product | null;
}

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white p-6 rounded text-red-500">
            <h1 className="font-bold">Modal Crashed!</h1>
            <pre className="text-sm mt-2">{this.state.error?.message}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AddProductModalInner: React.FC<AddProductModalProps> = ({ isOpen, onClose, onProductAdded, shopId, productToEdit }) => {
  const { productFieldSchema, labels } = useRetailProfile();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<{file?: File, url: string}[]>([]);
  const [tempImagePreview, setTempImagePreview] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{x: number, y: number, width: number, height: number} | null>(null);

  const [formData, setFormData] = useState<Record<string, any>>({
    name: '',
    sku: '',
    brand: '',
    category: '',
    price: '',
    stock_status: 'in_stock',
  });

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        sku: '',
        brand: '',
        category: '',
        price: '',
        stock_status: 'in_stock',
      });
      setImages([]);
      setTempImagePreview(null);
      setIsCropping(false);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    } else if (productToEdit) {
      const initialData: Record<string, any> = {
        name: productToEdit.name || '',
        sku: productToEdit.sku || '',
        brand: productToEdit.brand || '',
        category: productToEdit.category || '',
        price: productToEdit.price ? productToEdit.price.toString() : '',
        stock_status: productToEdit.stock_status || 'in_stock',
      };
      
      productFieldSchema.forEach(field => {
        initialData[field.key] = (productToEdit as any)[field.key] || (productToEdit.attributes && productToEdit.attributes[field.key]) || '';
      });

      if (productToEdit.attributes) {
        Object.entries(productToEdit.attributes).forEach(([key, value]) => {
          if (!productFieldSchema.find(f => f.key === key)) {
            initialData[key] = value || '';
          }
        });
      }
      
      setFormData(initialData);
      
      if (productToEdit.images && productToEdit.images.length > 0) {
        setImages(productToEdit.images.map(url => ({ url })));
      } else if (productToEdit.image_url) {
        setImages([{ url: productToEdit.image_url }]);
      }
    }
  }, [isOpen, productToEdit, productFieldSchema]);

  // Load draft on open
  useEffect(() => {
    if (isOpen && !productToEdit && shopId) {
      const saved = sessionStorage.getItem(`retailflow_draft_product_${shopId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && Object.keys(parsed).length > 0) {
            setFormData(prev => ({ ...prev, ...parsed }));
          }
        } catch (e) {
          console.error("Failed to parse draft", e);
        }
      }
    }
  }, [isOpen, productToEdit, shopId]);

  // Auto-save draft when formData changes
  useEffect(() => {
    if (isOpen && !productToEdit && shopId) {
      const timeout = setTimeout(() => {
        sessionStorage.setItem(`retailflow_draft_product_${shopId}`, JSON.stringify(formData));
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [formData, isOpen, productToEdit, shopId]);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (images.length >= 3) {
      toast.error('You can only upload up to 3 images.');
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImagePreview(reader.result as string);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
    // reset input
    e.target.value = '';
  };

  const handleConfirmCrop = async () => {
    setIsCropping(false);
    if (tempImagePreview && croppedAreaPixels) {
      try {
        const resized = await getCroppedImg(tempImagePreview, croppedAreaPixels, 1000);
        setImages(prev => [...prev, { file: resized, url: URL.createObjectURL(resized) }]);
      } catch (e) {
        console.error("Error creating crop preview", e);
      }
    }
    setTempImagePreview(null);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) { toast.error('Shop ID not found'); return; }
    
    setLoading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const img of images) {
        let uploadedUrl = '';
        if (img.file) {
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
          uploadedUrl = await uploadToR2(img.file, fileName);
          uploadedUrls.push(uploadedUrl);
        } else {
          uploadedUrls.push(img.url);
        }
      }

      const imageUrl = uploadedUrls.length > 0 ? uploadedUrls[0] : null;

      const attributes: Record<string, any> = {};
      const payload: Record<string, any> = {
        name: formData.name,
        shop_id: shopId,
        brand: formData.brand || null,
        sku: formData.sku || null,
        category: formData.category || null,
        price: (() => {
          const p = parseFloat(formData.price);
          if (isNaN(p) || p < 0) {
            throw new Error('Please enter a valid non-negative price');
          }
          return p;
        })(),
        stock_status: formData.stock_status || 'in_stock',
        image_url: imageUrl,
        images: uploadedUrls,
        attributes
      };

      productFieldSchema.forEach(field => {
        // Map native columns (like size, finish, material, color) to payload directly
        const nativeColumns = ['finish', 'size', 'material', 'color'];
        if (nativeColumns.includes(field.key)) {
          payload[field.key] = formData[field.key] || null;
        } else {
          attributes[field.key] = formData[field.key] || null;
        }
      });

      // Capture any dynamic extra attributes
      Object.keys(formData).forEach(key => {
        if (
          !['name', 'price', 'stock_status', 'sku', 'brand', 'category'].includes(key) &&
          !productFieldSchema.find(f => f.key === key)
        ) {
          attributes[key] = formData[key] || null;
        }
      });
      
      payload.attributes = attributes;

      if (productToEdit) {
        const { error: updateError } = await supabase
          .from('products')
          .update(payload)
          .eq('id', productToEdit.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('products')
          .insert([payload]);
        if (insertError) throw insertError;
        
        // Clear draft on successful insert
        sessionStorage.removeItem(`retailflow_draft_product_${shopId}`);
      }

      onProductAdded();
      onClose();
    } catch (error: any) {
      console.error('Error adding product:', error);
      if (error.message?.includes('RATE_LIMIT_PRODUCTS_HOURLY')) {
        toast.error('Rate limit exceeded: You can only add 100 products per hour. Please try again later.');
      } else if (error.message?.includes('RATE_LIMIT_PRODUCTS_TOTAL')) {
        toast.error('Plan limit reached: Your workspace has hit the maximum limit of 5000 active products.');
      } else {
        toast.error('Failed to add product: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface w-full max-w-2xl rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-textPrimary">{productToEdit ? (labels.productSingular ? `Edit ${labels.productSingular}` : 'Edit Product') : (labels.productAdd || 'Add New Product')}</h2>
          <button onClick={onClose} className="p-2 text-textSecondary hover:bg-bgSecondary rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <form id="addProductForm" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-textSecondary">{labels.productSingular ? `${labels.productSingular} Images (Max 3)` : 'Product Images (Max 3)'}</label>
              <div className="flex items-center justify-center w-full">
                {isCropping && tempImagePreview ? (
                  <div className="relative w-full h-[300px] bg-black rounded-xl overflow-hidden flex flex-col">
                    <div className="relative flex-1 w-full h-full">
                      <Cropper
                        image={tempImagePreview}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                      />
                    </div>
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10 gap-4 px-4">
                      <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-1/2"
                      />
                      <Button type="button" size="sm" onClick={handleConfirmCrop} className="whitespace-nowrap">
                        <Check size={16} className="mr-1" /> Confirm Crop
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {images.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {images.map((img, idx) => (
                          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                            <img src={img.url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {images.length < 3 && (
                      <>
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer bg-bgSecondary hover:bg-bgSecondary/80 transition-colors">
                          <ImageIcon className="w-6 h-6 mb-2 text-textSecondary" />
                          <p className="text-xs text-textSecondary font-medium">Click to upload ({3 - images.length} left)</p>
                          <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                        </label>
                        <label className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-border bg-surface hover:bg-surfaceHover cursor-pointer text-sm font-medium text-textPrimary transition-colors">
                          <Camera size={18} />
                          Take Photo
                          <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleImageChange} />
                        </label>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Info */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textSecondary">{labels.productSingular ? `${labels.productSingular} Name *` : 'Name *'}</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-3 rounded-lg border border-border bg-bgSecondary text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary" placeholder={labels.productSingular ? `e.g. ${labels.productSingular} Name` : 'e.g. Product Name'} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-textSecondary">Description</label>
                <textarea name="description" value={formData.description || ''} onChange={handleChange} className="w-full p-3 rounded-lg border border-border bg-bgSecondary text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]" placeholder="e.g. Description" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textSecondary">Price (₹) *</label>
                <input required type="number" step="0.01" min="0" name="price" value={formData.price} onChange={handleChange} className="w-full p-3 rounded-lg border border-border bg-bgSecondary text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textSecondary">Availability</label>
                <select name="stock_status" value={formData.stock_status} onChange={handleChange} className="w-full p-3 rounded-lg border border-border bg-bgSecondary text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                  <option value="discontinued">Discontinued</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textSecondary">SKU</label>
                <input type="text" name="sku" value={formData.sku} onChange={handleChange} className="w-full p-3 rounded-lg border border-border bg-bgSecondary text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. SKU-123" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textSecondary">Brand</label>
                <input type="text" name="brand" value={formData.brand} onChange={handleChange} className="w-full p-3 rounded-lg border border-border bg-bgSecondary text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Brand Name" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textSecondary">Category</label>
                <input type="text" name="category" value={formData.category} onChange={handleChange} className="w-full p-3 rounded-lg border border-border bg-bgSecondary text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Category Name" />
              </div>
              
              {/* Dynamic Profile Fields */}
              {productFieldSchema.map((field) => (
                <div className={`space-y-2 ${field.type === 'textarea' ? 'md:col-span-2' : ''}`} key={field.key}>
                  <label className="block text-sm font-medium text-textSecondary">{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea
                      name={field.key}
                      value={(formData as any)[field.key] || ''}
                      onChange={handleChange}
                      className="w-full p-3 rounded-lg border border-border bg-bgSecondary text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                      placeholder={`e.g. ${field.label}`}
                    />
                  ) : field.type === 'select' ? (
                    <select 
                      name={field.key} 
                      value={(formData as any)[field.key] || ''} 
                      onChange={handleChange} 
                      className="w-full p-3 rounded-lg border border-border bg-bgSecondary text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select {field.label}</option>
                      {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input 
                      type={field.type === 'number' ? 'number' : 'text'} 
                      name={field.key} 
                      value={(formData as any)[field.key] || ''} 
                      onChange={handleChange} 
                      className="w-full p-3 rounded-lg border border-border bg-bgSecondary text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary" 
                      placeholder={`e.g. ${field.label}`} 
                    />
                  )}
                </div>
              ))}

              {/* Dynamic Additional Attributes from CSV/Integrations */}
              {Object.keys(formData)
                .filter(key => 
                  !['name', 'price', 'stock_status', 'sku', 'brand', 'category'].includes(key) && 
                  !productFieldSchema.find(f => f.key === key)
                )
                .map(key => (
                  <div className="space-y-2" key={key}>
                    <label className="block text-sm font-medium text-textSecondary capitalize">{key.replace(/_/g, ' ')}</label>
                    <input 
                      type="text" 
                      name={key} 
                      value={(formData as any)[key] || ''} 
                      onChange={handleChange} 
                      className="w-full p-3 rounded-lg border border-border bg-bgSecondary text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary" 
                    />
                  </div>
                ))}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end gap-3 bg-surface rounded-b-2xl">
          <Button variant="outline" onClick={onClose} type="button" disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="addProductForm" disabled={loading} className="min-w-[120px]">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (productToEdit ? 'Save Changes' : 'Save Product')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const AddProductModal: React.FC<AddProductModalProps> = (props) => {
  return (
    <ErrorBoundary>
      <AddProductModalInner {...props} />
    </ErrorBoundary>
  );
};
