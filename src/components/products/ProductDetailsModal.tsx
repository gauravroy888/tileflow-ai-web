import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, PackageSearch } from 'lucide-react';
import type { Product } from '../../types';
import { useRetailProfile } from '../providers/RetailProfileProvider';

interface ProductDetailsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

const formatRupee = (value: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(value);

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ product, isOpen, onClose }) => {
  const { productFieldSchema } = useRetailProfile();
  const [currentImageIdx, setCurrentImageIdx] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentImageIdx(0);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const images = product.images && product.images.length > 0 
    ? product.images 
    : (product.image_url ? [product.image_url] : []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bgSecondary w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-surface sticky top-0 z-10">
          <h2 className="text-lg font-bold text-textPrimary">Product Details</h2>
          <button onClick={onClose} className="p-2 bg-bgSecondary hover:bg-surfaceHover rounded-full transition-colors">
            <X size={20} className="text-textSecondary" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Image Gallery */}
          {images.length > 0 ? (
            <div className="relative w-full aspect-square md:aspect-video bg-black flex items-center justify-center group">
              <img src={images[currentImageIdx]} alt={product.name} className="w-full h-full object-contain" />
              
              {images.length > 1 && (
                <>
                  <button 
                    onClick={() => setCurrentImageIdx(prev => prev === 0 ? images.length - 1 : prev - 1)}
                    className="absolute left-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button 
                    onClick={() => setCurrentImageIdx(prev => prev === images.length - 1 ? 0 : prev + 1)}
                    className="absolute right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ChevronRight size={24} />
                  </button>
                  <div className="absolute bottom-4 flex gap-2">
                    {images.map((_, idx) => (
                      <div key={idx} className={`w-2 h-2 rounded-full transition-colors ${idx === currentImageIdx ? 'bg-white' : 'bg-white/40'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
             <div className="w-full aspect-video bg-surface flex flex-col items-center justify-center text-textSecondary">
              <PackageSearch size={48} className="mb-2 opacity-50" />
              <p>No images available</p>
            </div>
          )}

          {/* Details */}
          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-black text-textPrimary">{product.name}</h1>
              <p className="text-xl font-bold text-primary mt-1">{formatRupee(product.price)}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-surface rounded-xl border border-border">
                <p className="text-xs font-medium text-textSecondary uppercase tracking-wider mb-1">Status</p>
                <p className="font-semibold text-textPrimary capitalize">{product.stock_status.replace('_', ' ')}</p>
              </div>
              {product.brand && (
                <div className="p-4 bg-surface rounded-xl border border-border">
                  <p className="text-xs font-medium text-textSecondary uppercase tracking-wider mb-1">Brand</p>
                  <p className="font-semibold text-textPrimary">{product.brand}</p>
                </div>
              )}
              {product.sku && (
                <div className="p-4 bg-surface rounded-xl border border-border">
                  <p className="text-xs font-medium text-textSecondary uppercase tracking-wider mb-1">SKU</p>
                  <p className="font-semibold text-textPrimary">{product.sku}</p>
                </div>
              )}
              {product.category && (
                <div className="p-4 bg-surface rounded-xl border border-border">
                  <p className="text-xs font-medium text-textSecondary uppercase tracking-wider mb-1">Category</p>
                  <p className="font-semibold text-textPrimary">{product.category}</p>
                </div>
              )}
              
              {productFieldSchema.map(field => {
                const val = (product as any)[field.key] || (product.attributes && product.attributes[field.key]);
                if (!val) return null;
                return (
                  <div key={field.key} className="p-4 bg-surface rounded-xl border border-border">
                    <p className="text-xs font-medium text-textSecondary uppercase tracking-wider mb-1">{field.label}</p>
                    <p className="font-semibold text-textPrimary">{val}</p>
                  </div>
                );
              })}

              {/* Dynamic Additional Attributes from CSV/Integrations */}
              {product.attributes && Object.entries(product.attributes)
                .filter(([key]) => !productFieldSchema.find(f => f.key === key))
                .map(([key, value]) => {
                  if (!value) return null;
                  return (
                    <div key={key} className="p-4 bg-surface rounded-xl border border-border">
                      <p className="text-xs font-medium text-textSecondary uppercase tracking-wider mb-1">{key.replace(/_/g, ' ')}</p>
                      <p className="font-semibold text-textPrimary">{String(value)}</p>
                    </div>
                  );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
