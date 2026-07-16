import { Phone, MessageCircle, MapPin, Building2, Calendar, IndianRupee } from 'lucide-react';
import { Customer } from '../../types';
import { Button } from './Button';

interface CustomerCardProps {
  customer: Customer;
}

export function CustomerCard({ customer }: CustomerCardProps) {
  const formatCurrency = (val: number | null) => 
    val ? `₹${val.toLocaleString('en-IN')}` : 'N/A';

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold text-textPrimary text-lg">{customer.name}</h4>
          <p className="text-textSecondary text-sm font-medium">{customer.project_type || 'General Inquiry'}</p>
        </div>
        <div className={`text-xs px-2 py-1 rounded-full font-medium ${
          customer.visit_status === 'new' ? 'bg-blue-100 text-blue-700' :
          customer.visit_status === 'quoted' ? 'bg-yellow-100 text-yellow-700' :
          customer.visit_status === 'won' ? 'bg-green-100 text-green-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {customer.visit_status.toUpperCase()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-textSecondary pt-2 border-t border-border">
        <div className="flex items-center gap-1.5">
          <IndianRupee size={14} />
          <span className="truncate">{formatCurrency(customer.budget)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin size={14} />
          <span className="truncate">{customer.location || 'N/A'}</span>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="secondary" className="flex-1 gap-2" onClick={() => window.open(`tel:${customer.phone}`)}>
          <Phone size={16} /> Call
        </Button>
        <Button variant="outline" className="flex-1 gap-2 border-green-500 text-green-600 hover:bg-green-50" onClick={() => window.open(`https://wa.me/${customer.phone}`)}>
          <MessageCircle size={16} /> WhatsApp
        </Button>
      </div>
    </div>
  );
}
