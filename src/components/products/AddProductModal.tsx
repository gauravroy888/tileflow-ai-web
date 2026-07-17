import React, { useState, useCallback, useEffect } from 'react';
import { X, Loader2, Image as ImageIcon, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';

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
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{x: number, y: number, width: number, height: number} | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    brand: '',
    category: '',
    price: '',
    finish: '',
    size: '',
    material: '',
    color: '',
    stock_status: 'in_stock',
  });

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setFormData({
        name: '',
        sku: '',
        brand: '',
        category: '',
        price: '',
        finish: '',
        size: '',
        material: '',
        color: '',
        stock_status: 'in_stock',
      });
      setImageFile(null);
      setImagePreview(null);
      setIsCropping(false);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    } else if (productToEdit) {
      setFormData({
        name: productToEdit.name || '',
        sku: productToEdit.sku || '',
        brand: productToEdit.brand || '',
        category: productToEdit.category || '',
        price: productToEdit.price ? productToEdit.price.toString() : '',
        finish: productToEdit.finish || '',
        size: productToEdit.size || '',
        material: productToEdit.material || '',
        color: productToEdit.color || '',
        stock_status: productToEdit.stock_status || 'in_stock',
      });
      setImagePreview(productToEdit.image_url || null);
    }
  }, [isOpen, productToEdit]);

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
        
        // Draw the cropped area stretched to 1000x1000
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
      // Create a preview of the cropped area for the UI
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

      // Upload image if provided
      if (imageFile && croppedAreaPixels) {
        // Resize image to 1000x1000 before upload using the crop pixels
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

      const payload = {
          shop_id: shopId,
          name: formData.name,
          sku: formData.sku || null,
          brand: formData.brand || null,
          category: formData.category || null,
          price: parseFloat(formData.price) || 0,
          finish: formData.finish || null,
          size: formData.size || null,
          material: formData.material || null,
          color: formData.color || null,
          image_url: imageUrl,
          stock_status: formData.stock_status || 'in_stock'
      };

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
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Info */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textSecondary">Name *</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-3 rounded-lg border border-border bg-bgSecondary text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Kohler Veil Toilet" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textSecondary">Price ($) *</label>
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
                <input type="text" name="sku" value={formData.sku} onChange={handleChange} className="w-full p-3 rounded-lg border border-border bg-bgSecondary text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. K-5401-0" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textSecondary">Brand</label>
                <input type="text" name="brand" value={formData.brand} onChange={handleChange} className="w-full p-3 rounded-lg border border-border bg-bgSecondary text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Kohler" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textSecondary">Category</label>
                <select name="category" value={formData.category} onChange={handleChange} className="w-full p-3 rounded-lg border border-border bg-bgSecondary text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Select Category</option>
                  <option value="Toilets">Toilets</option>
                  <option value="Sinks">Sinks</option>
                  <option value="Faucets">Faucets</option>
                  <option value="Showers">Showers</option>
                  <option value="Bathtubs">Bathtubs</option>
                  <option value="Tiles">Tiles</option>
                  <option value="Accessories">Accessories</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textSecondary">Color</label>
                <input type="text" name="color" value={formData.color} onChange={handleChange} className="w-full p-3 rounded-lg border border-border bg-bgSecondary text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. White" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textSecondary">Finish</label>
                <input type="text" name="finish" value={formData.finish} onChange={handleChange} className="w-full p-3 rounded-lg border border-border bg-bgSecondary text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Matte, Glossy" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textSecondary">Size</label>
                <input type="text" name="size" value={formData.size} onChange={handleChange} className="w-full p-3 rounded-lg border border-border bg-bgSecondary text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. 12x24" />
              </div>
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
