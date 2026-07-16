import { Heart } from 'lucide-react';
import type { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  onFavorite?: (id: string) => void;
}

export function ProductCard({ product, onFavorite }: ProductCardProps) {
  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden flex flex-col">
      <div className="relative aspect-square bg-gray-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-textSecondary text-xs">
            No image
          </div>
        )}
        <button
          onClick={() => onFavorite?.(product.id)}
          className="absolute top-2 right-2 p-2 bg-white/80 rounded-full shadow-sm hover:bg-white min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Favorite"
        >
          <Heart size={20} className="text-gray-500 hover:text-red-500" />
        </button>
      </div>

      <div className="p-3 flex flex-col flex-1">
        <div className="text-[10px] uppercase tracking-wider text-textSecondary font-semibold mb-1">
          {product.brand || 'No Brand'} • {product.category || 'Other'}
        </div>
        
        <h4 className="font-bold text-textPrimary leading-tight mb-1 line-clamp-1">
          {product.name}
        </h4>
        
        <p className="text-xs text-textSecondary mb-2 flex-1">
          {[product.size, product.finish, product.sku].filter(Boolean).join(' • ')}
        </p>

        <div className="flex justify-between items-end mt-auto pt-2 border-t border-border">
          <div>
            <div className="text-xs text-textSecondary">Price/sqft</div>
            <div className="font-bold text-primary text-lg leading-none">
              ₹{product.price}
            </div>
          </div>
          <div className={`text-[10px] px-2 py-1 rounded-full font-medium ${
            product.stock_status === 'in_stock' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {product.stock_status === 'in_stock' ? 'In Stock' : 'Out of Stock'}
          </div>
        </div>
      </div>
    </div>
  );
}
