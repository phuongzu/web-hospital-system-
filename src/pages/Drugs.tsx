import React, { useEffect, useState, useMemo } from 'react';
import { useRealTimeData } from '../context/RealTimeDataContext';
import { API_BASE_URL } from '../utils/api';

interface Drug {
  _id: string;
  name: string;
  category_id?: {
    _id: string;
    name: string;
  };
  unit?: string;
  price?: number;
  stock?: number;
  stock_quantity?: number;
  description?: string;
  manufacturer?: string;
}

const Drugs: React.FC = () => {
  const { notifications, messages } = useRealTimeData() || { notifications: [], messages: [] };
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    fetchDrugs();
  }, []);

  // Example: Listen for new drug-related notifications/messages
  useEffect(() => {
    // You can filter notifications/messages for drug-related updates and refresh data if needed
    // For example, if a notification of type 'drug' is received, refetch drugs
    if (notifications.some(n => n.type === 'drug')) {
      fetchDrugs();
    }
  }, [notifications]);

  const fetchDrugs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/doctors/drugs`);
      const data = await response.json();
      if (data.success) {
        setDrugs(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching drugs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStock = (drug: Drug) => {
    return drug.stock_quantity !== undefined ? drug.stock_quantity : (drug.stock || 0);
  };

  const categories = useMemo(() => {
    const cats = new Set(drugs.map(d => d.category_id?.name || 'Uncategorized'));
    return ['All', ...Array.from(cats)];
  }, [drugs]);

  const filteredDrugs = useMemo(() => {
    return drugs.filter(drug => {
      const matchesSearch = drug.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === 'All' ||
        (drug.category_id?.name || 'Uncategorized') === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [drugs, searchTerm, selectedCategory]);

  const stats = useMemo(() => {
    const total = drugs.length;
    const lowStock = drugs.filter(d => {
      const s = getStock(d);
      return s > 0 && s < 20;
    }).length;
    const outOfStock = drugs.filter(d => getStock(d) === 0).length;

    return { total, lowStock, outOfStock };
  }, [drugs]);

  const getStockStatus = (stock: number = 0) => {
    if (stock === 0)
      return {
        label: 'Out of Stock',
        color:
          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        icon: 'block',
      };

    if (stock < 20)
      return {
        label: 'Low Stock',
        color:
          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: 'warning',
      };

    return {
      label: 'In Stock',
      color:
        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      icon: 'check_circle',
    };
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Pharmacy Inventory
        </h1>
        <p className="text-gray-500 dark:text-[#8fc4cc] mb-6">
          Check availability and manage medicines.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#102023] p-4 rounded-xl border border-gray-100 dark:border-[#224449] shadow-sm flex items-center gap-4">
            <div className="size-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <span className="material-symbols-outlined">medication</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Medicines</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#102023] p-4 rounded-xl border border-gray-100 dark:border-[#224449] shadow-sm flex items-center gap-4">
            <div className="size-12 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
              <span className="material-symbols-outlined">inventory_2</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.lowStock}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#102023] p-4 rounded-xl border border-gray-100 dark:border-[#224449] shadow-sm flex items-center gap-4">
            <div className="size-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
              <span className="material-symbols-outlined">
                production_quantity_limits
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.outOfStock}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6 justify-between items-start lg:items-center">
        <div className="relative w-full lg:w-96">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            search
          </span>
          <input
            type="text"
            placeholder="Search by drug name..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#102023] border border-gray-200 dark:border-[#224449] rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 w-full lg:w-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'bg-white dark:bg-[#102023] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#224449] hover:bg-gray-50 dark:hover:bg-[#1a2c2f]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#102023] rounded-2xl border border-gray-200 dark:border-[#224449] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="size-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : filteredDrugs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-[#1a2c2f] border-b border-gray-100 dark:border-[#224449]">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Drug Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Unit</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Stock Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-[#224449]">
                {filteredDrugs.map((drug) => {
                  const stock = getStock(drug);
                  const status = getStockStatus(stock);

                  return (
                    <tr key={drug._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-gray-100 dark:bg-[#1a2c2f] flex items-center justify-center text-gray-500">
                            <span className="material-symbols-outlined">pill</span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">{drug.name}</p>
                            {drug.manufacturer && (
                              <p className="text-xs text-gray-400">{drug.manufacturer}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                          {drug.category_id?.name || 'General'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {drug.unit || 'N/A'}
                      </td>

                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {drug.price ? `$${drug.price.toFixed(2)}` : '-'}
                      </td>

                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>
                          <span className="material-symbols-outlined text-sm">{status.icon}</span>
                          {status.label}
                          <span className="opacity-75 ml-1">({stock})</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">medication_liquid</span>
            <p>No drugs found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Drugs;
