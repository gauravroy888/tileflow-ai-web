import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, PackageSearch } from 'lucide-react';
import type { Product } from '../../types';
import { useRetailProfile } from '../providers/RetailProfileProvider';

interface ProductDetailsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

import { formatCurrency } from '../../utils/formatCurrency';

const isUnitKey = (key: string) => {
  const k = key.toLowerCase().replace(/_/g, '');
  return k === 'dimensionunit' || k === 'dimensionunits' || k === 'unit' || k === 'unitofmeasure';
};

const getDimensionUnit = (product: Product): string => {
  const attrs = product.attributes || {};
  const u = (product as any).dimension_unit || attrs.dimension_unit || attrs.dimensionUnit || attrs.unit;
  return u ? String(u).trim() : 'mm';
};

const formatValueWithUnit = (key: string, value: any, unit: string): string => {
  const valStr = String(value).trim();
  const lowerKey = key.toLowerCase();
  const dimensionKeys = ['width', 'height', 'length', 'depth', 'thickness'];

  if (dimensionKeys.includes(lowerKey)) {
    if (/^\d+(\.\d+)?$/.test(valStr)) {
      return `${valStr} ${unit}`;
    }
  }
  return valStr;
};

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ product, isOpen, onClose }) => {
  const { productFieldSchema, labels } = useRetailProfile();
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

  const descriptionText = (product as any).description || product.attributes?.description;
  const unit = getDimensionUnit(product);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div className="bg-background w-full max-w-2xl rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-surface sticky top-0 z-10">
          <h2 className="text-lg font-bold text-textPrimary">
            {labels.productSingular ? `${labels.productSingular} Details` : 'Product Details'}
          </h2>
          <button onClick={onClose} className="p-2 bg-sand hover:bg-border rounded-full transition-colors">
            <X size={20} className="text-textSecondary" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 bg-background">
          {/* Image Gallery */}
          {images.length > 0 ? (
            <div className="relative w-full aspect-square md:aspect-video bg-black/90 flex items-center justify-center group">
              <img src={images[currentImageIdx]} alt={product.name} className="w-full h-full object-contain" />
              
              {images.length > 1 && (
                <>
                  <button 
                    onClick={() => setCurrentImageIdx(prev => prev === 0 ? images.length - 1 : prev - 1)}
                    className="absolute left-4 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button 
                    onClick={() => setCurrentImageIdx(prev => prev === images.length - 1 ? 0 : prev + 1)}
                    className="absolute right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ChevronRight size={24} />
                  </button>
                  <div className="absolute bottom-4 flex gap-2">
                    {images.map((_, idx) => (
                      <div key={idx} className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentImageIdx ? 'bg-white scale-110' : 'bg-white/40'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
             <div className="w-full aspect-video bg-surface flex flex-col items-center justify-center text-textSecondary border-b border-border">
              <PackageSearch size={48} className="mb-2 opacity-50" />
              <p className="text-sm font-medium">No images available</p>
            </div>
          )}

          {/* Details Container */}
          <div className="p-6 space-y-4 bg-background">
            {/* Title & Description Box */}
            <div className="p-5 bg-surface rounded-2xl border border-border shadow-sm">
              <h1 className="text-2xl font-black text-textPrimary">{product.name}</h1>
              <p className="text-xl font-extrabold text-primary mt-1">
                {formatCurrency(product.price, product.attributes?.currency || product.attributes?.Currency || (product as any).currency)}
              </p>
              
              {descriptionText && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Description</p>
                  <p className="text-sm font-normal text-textPrimary leading-relaxed whitespace-pre-wrap">
                    {descriptionText}
                  </p>
                </div>
              )}
            </div>

            {/* Spec Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-4 bg-surface rounded-2xl border border-border shadow-sm">
                <p className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">Status</p>
                <p className="font-semibold text-textPrimary capitalize">{product.stock_status.replace('_', ' ')}</p>
              </div>

              {product.brand && (
                <div className="p-4 bg-surface rounded-2xl border border-border shadow-sm">
                  <p className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">Brand</p>
                  <p className="font-semibold text-textPrimary">{product.brand}</p>
                </div>
              )}

              {product.sku && (
                <div className="p-4 bg-surface rounded-2xl border border-border shadow-sm">
                  <p className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">SKU</p>
                  <p className="font-semibold text-textPrimary">{product.sku}</p>
                </div>
              )}

              {product.category && (
                <div className="p-4 bg-surface rounded-2xl border border-border shadow-sm">
                  <p className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">Category</p>
                  <p className="font-semibold text-textPrimary">{product.category}</p>
                </div>
              )}
              
              {productFieldSchema.map(field => {
                if (isUnitKey(field.key)) return null;
                const rawVal = (product as any)[field.key] || (product.attributes && product.attributes[field.key]);
                if (!rawVal) return null;
                const formattedVal = formatValueWithUnit(field.key, rawVal, unit);
                return (
                  <div key={field.key} className={`p-4 bg-surface rounded-2xl border border-border shadow-sm ${field.type === 'textarea' ? 'col-span-2 md:col-span-3' : ''}`}>
                    <p className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">{field.label}</p>
                    <p className="font-semibold text-textPrimary whitespace-pre-wrap">{formattedVal}</p>
                  </div>
                );
              })}

              {/* Dynamic Additional Attributes */}
              {product.attributes && Object.entries(product.attributes)
                .filter(([key]) => !isUnitKey(key) && !productFieldSchema.find(f => f.key === key) && key !== 'description')
                .map(([key, value]) => {
                  if (!value) return null;
                  const formattedVal = formatValueWithUnit(key, value, unit);
                  return (
                    <div key={key} className="p-4 bg-surface rounded-2xl border border-border shadow-sm">
                      <p className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">{key.replace(/_/g, ' ')}</p>
                      <p className="font-semibold text-textPrimary">{formattedVal}</p>
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
