import React, { useState, useCallback, useEffect, useRef } from 'react';
import { X, Loader2, Image as ImageIcon, Check, Camera, Upload, RefreshCw, ZoomIn } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
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
  const { productFieldSchema } = useRetailProfile();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
      setImageFile(null);
      setImagePreview(null);
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
      
      setFormData(initialData);
      setImagePreview(productToEdit.image_url || null);
    }
  }, [isOpen, productToEdit, productFieldSchema]);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  if (!isOpen) return null;

  const resizeImage = (file: File, cropPixels: {x: number, y: number, width: number, height: number}): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1000;
        canvas.height = 1000;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 1000, 1000);
        
        ctx.drawImage(
          img,
          cropPixels.x,
          cropPixels.y,
          cropPixels.width,
          cropPixels.height,
          0,
          0,
          1000,
          1000
        );
        
        canvas.toBlob((blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
            resolve(resizedFile);
          } else {
            reject(new Error('Canvas to Blob failed'));
          }
        }, 'image/jpeg', 0.9);
      };
      img.onerror = (error) => reject(error);
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmCrop = async () => {
    setIsCropping(false);
    if (imageFile && croppedAreaPixels) {
      try {
        const resized = await resizeImage(imageFile, croppedAreaPixels);
        setImagePreview(URL.createObjectURL(resized));
      } catch (e) {
        console.error("Error creating crop preview", e);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return alert('Shop ID not found');
    
    setLoading(true);
    try {
      let imageUrl = productToEdit ? productToEdit.image_url : null;

      if (imageFile && croppedAreaPixels) {
        const resizedFile = await resizeImage(imageFile, croppedAreaPixels);
        
        const fileExt = 'jpg';
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${shopId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, resizedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const attributes: Record<string, any> = {};
      const payload: Record<string, any> = {
          shop_id: shopId,
          name: formData.name,
          sku: formData.sku || null,
          brand: formData.brand || null,
          category: formData.category || null,
          price: parseFloat(formData.price) || 0,
          image_url: imageUrl,
          stock_status: formData.stock_status || 'in_stock'
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
      }

      onProductAdded();
      onClose();
    } catch (error: any) {
      console.error('Error adding product:', error);
      alert('Failed to add product: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface w-full max-w-2xl rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-textPrimary">{productToEdit ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose} className="p-2 text-textSecondary hover:bg-bgSecondary rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <form id="addProductForm" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Image Upload */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-textSecondary">Product Image (Required)</label>
              <div className="flex items-center justify-center w-full">
                {isCropping && imagePreview ? (
                  <div className="relative w-full h-[300px] bg-black rounded-xl overflow-hidden flex flex-col">
                    <div className="relative flex-1 w-full h-full">
                      <Cropper
                        image={imagePreview}
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
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-xl cursor-pointer bg-bgSecondary hover:bg-bgSecondary/80 transition-colors overflow-hidden relative">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <ImageIcon className="w-8 h-8 mb-3 text-textSecondary" />
                          <p className="mb-2 text-sm text-textSecondary"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                          <p className="text-xs text-textSecondary">PNG, JPG or WEBP (MAX. 5MB)</p>
                        </div>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                    {!imagePreview && (
                      <label className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-border bg-surface hover:bg-surfaceHover cursor-pointer text-sm font-medium text-textPrimary transition-colors">
                        <Camera size={18} />
                        Take Photo
                        <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleImageChange} />
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Info */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textSecondary">Name *</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-3 rounded-lg border border-border bg-bgSecondary text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Product Name" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textSecondary">Price (₹) *</label>
                <input required type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} className="w-full p-3 rounded-lg border border-border bg-bgSecondary text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary" placeholder="0.00" />
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
                <div className="space-y-2" key={field.key}>
                  <label className="block text-sm font-medium text-textSecondary">{field.label}</label>
                  {field.type === 'select' ? (
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
