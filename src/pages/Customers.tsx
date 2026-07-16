import { useEffect, useState } from 'react';
import { Search, Filter, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Customer } from '../types';
import { CustomerCard } from '../components/ui/CustomerCard';
import { Button } from '../components/ui/Button';

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.phone && c.phone.includes(searchQuery))
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header & Actions */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold text-textPrimary">Customers</h2>
        <Button size="sm" className="gap-1">
          <UserPlus size={16} /> Add New
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[48px]"
          />
        </div>
        <Button variant="outline" size="icon" aria-label="Filters">
          <Filter size={20} />
        </Button>
      </div>

      {/* Customers List */}
      {loading ? (
        <div className="space-y-3 mt-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-surface rounded-xl h-32 border border-border" />
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-textSecondary">No customers found.</p>
        </div>
      ) : (
        <div className="space-y-3 mt-4">
          {filteredCustomers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Customers;
