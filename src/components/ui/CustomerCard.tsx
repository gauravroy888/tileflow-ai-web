import { useState } from 'react';
import { Phone, MessageCircle, MapPin, IndianRupee, Edit2, Calendar, X } from 'lucide-react';
import type { Customer, Product } from '../../types';
import { Button } from './Button';
import { WhatsAppModal } from './WhatsAppModal';
import { ProductCard } from './ProductCard';

interface CustomerCardProps {
  customer: Customer;
  onEdit?: () => void;
  shopProducts?: Product[];
}

export function CustomerCard({ customer, onEdit, shopProducts = [] }: CustomerCardProps) {
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const formatCurrency = (val: number | null) => 
    val ? `₹${val.toLocaleString('en-IN')}` : 'N/A';

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(new Date(dateStr));
  };

  return (
    <>
      <div className="bg-surface rounded-xl shadow-sm border border-border p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-bold text-textPrimary text-lg">{customer.name}</h4>
            <p className="text-textSecondary text-sm font-medium">{customer.project_type || 'General Inquiry'}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`text-xs px-2 py-1 rounded-full font-medium ${
              customer.visit_status === 'new' ? 'bg-blue-100 text-blue-700' :
              customer.visit_status === 'quoted' ? 'bg-yellow-100 text-yellow-700' :
              customer.visit_status === 'won' ? 'bg-green-100 text-green-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {customer.visit_status.toUpperCase()}
            </div>
            {onEdit && (
              <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Edit2 size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm text-textSecondary pt-2 border-t border-border">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="shrink-0" />
            <span className="truncate">{formatDate(customer.created_at)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={14} className="shrink-0" />
            <span className="truncate">{customer.location || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <IndianRupee size={14} className="shrink-0" />
            <span className="truncate">Budget: {formatCurrency(customer.budget)}</span>
          </div>
        </div>
        
        {customer.required_products && (
          <div className="pt-2 border-t border-border">
            <span className="text-textSecondary text-xs uppercase font-bold tracking-wider block mb-2">Products Required</span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {customer.required_products.split(',').map((entry, idx) => {
                const match = entry.match(/^(.*?)(?:\s*\(x(\d+)\))?$/);
                const productName = match ? match[1].trim() : entry.trim();
                const quantity = match && match[2] ? parseInt(match[2], 10) : 1;
                
                const product = shopProducts.find(p => p.name.toLowerCase() === productName.toLowerCase());
                
                if (product) {
                  return (
                    <div 
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className="w-14 h-14 shrink-0 rounded-xl bg-gray-100 border border-border overflow-hidden cursor-pointer hover:border-primary hover:shadow-md transition-all relative group"
                      title={product.name}
                    >
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 p-1 text-center truncate">{product.name}</div>
                      )}
                      
                      {quantity > 1 && (
                        <div className="absolute top-1 right-1 bg-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10 pointer-events-none">
                          x{quantity}
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20">
                        <span className="text-white text-[10px] font-medium">View</span>
                      </div>
                    </div>
                  );
                }
                
                // Fallback for custom products not in inventory
                return (
                  <div key={`custom-${idx}`} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium shrink-0 border border-gray-200">
                    {productName} {quantity > 1 && <span className="text-gray-400 ml-1">x{quantity}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1 gap-2" onClick={() => window.open(`tel:${customer.phone}`)}>
            <Phone size={16} /> Call
          </Button>
          <Button variant="outline" className="flex-1 gap-2 border-green-500 text-green-600 hover:bg-green-50" onClick={() => setIsWhatsAppOpen(true)}>
            <MessageCircle size={16} /> WhatsApp
          </Button>
        </div>
      </div>
      
      {isWhatsAppOpen && (
        <WhatsAppModal
          customer={customer}
          shopName="Your Tile Shop" // In a real app this would come from shop context
          onClose={() => setIsWhatsAppOpen(false)}
        />
      )}
      
      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-sm">
            <button 
              onClick={() => setSelectedProduct(null)} 
              className="absolute -top-12 right-0 bg-white/20 text-white hover:bg-white/40 p-2 rounded-full backdrop-blur-sm transition-colors"
            >
              <X size={24} />
            </button>
            <ProductCard product={selectedProduct} />
          </div>
        </div>
      )}
    </>
  );
}
