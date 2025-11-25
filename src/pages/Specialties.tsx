import React, { useEffect, useState } from 'react';
import { Specialty } from '../types';
import { API_BASE_URL } from '../utils/api';

// Helper to map CSV icon names to Material Symbols
const getIconName = (csvIcon: string | undefined) => {
  if (!csvIcon) return 'local_hospital';
  const map: Record<string, string> = {
    heart: 'cardiology',
    skin: 'dermatology',
    medkit: 'neurology',
    happy: 'child_care',
    bandage: 'personal_injury',
    eye: 'visibility',
    medical: 'dentistry',
    headset: 'psychology',
    cut: 'medical_services',
    female: 'female',
    pulse: 'monitor_heart',
    nutrition: 'nutrition',
  };
  return map[csvIcon] || csvIcon || 'local_hospital';
};

// Bổ sung mapper để convert fallback data thành Specialty đầy đủ
const mapToSpecialty = (items: any[]): Specialty[] => {
  return items.map((item) => ({
    ...item,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString(),
  }));
};

const Specialties: React.FC = () => {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/specialties`);
        const data = await response.json();

        if (data.success) {
          setSpecialties(mapToSpecialty(data.data));
        } else {
          console.warn('Using fallback data for specialties');
          const { specialties: seedData } = await import('../data/data');
          setSpecialties(mapToSpecialty(seedData));
        }
      } catch (error) {
        console.error('Error fetching specialties:', error);
        const { specialties: seedData } = await import('../data/data');
        setSpecialties(mapToSpecialty(seedData));
      } finally {
        setLoading(false);
      }
    };

    fetchSpecialties();
  }, []);

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">
        Loading departments...
      </div>
    );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-gray-900 dark:text-white text-3xl font-black leading-tight">
            Departments
          </h1>
          <p className="text-gray-500 dark:text-[#8fc4cc] text-base">
            Overview of hospital specialties and departments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-primary/30">
            <span className="material-symbols-outlined">add</span>
            <span>Add Specialty</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {specialties.map((specialty) => (
          <div
            key={specialty._id}
            className="group relative bg-white dark:bg-[#102023] rounded-2xl p-6 border border-gray-100 dark:border-[#224449] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
          >
            <div
              className="absolute top-0 left-0 w-full h-1.5"
              style={{ backgroundColor: specialty.color || '#07b9d5' }}
            />

            <div className="flex justify-between items-start mb-4">
              <div
                className="size-14 rounded-xl flex items-center justify-center text-white shadow-lg transform group-hover:scale-110 transition-transform duration-300"
                style={{ backgroundColor: specialty.color || '#07b9d5' }}
              >
                <span className="material-symbols-outlined text-3xl">
                  {getIconName(specialty.icon)}
                </span>
              </div>

              <div className="flex flex-col items-end">
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${
                    specialty.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {specialty.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary transition-colors">
              {specialty.name}
            </h3>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 line-clamp-2 h-10">
              {specialty.description || 'No description available.'}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-[#224449]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-400 text-sm">
                  groups
                </span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300"></span>
              </div>

              <span className="material-symbols-outlined text-gray-300 group-hover:text-primary transition-colors">
                arrow_forward
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Specialties;
