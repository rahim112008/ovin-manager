
import React from 'react';
import { Sheep } from '../types';
import { MORPHO_TRAITS, MAMMARY_TRAITS } from '../constants';

interface InventoryProps {
  sheep: Sheep[];
  onDelete: (id: string) => void;
}

const Inventory: React.FC<InventoryProps> = ({ sheep, onDelete }) => {
  const getEtatColor = (etat: string) => {
    if (etat.includes('GESTANTE')) return 'bg-purple-100 text-purple-700';
    switch(etat) {
      case 'ALLAITANTE': return 'bg-pink-100 text-pink-700';
      case 'TARIE': return 'bg-orange-100 text-orange-700';
      case 'EN_CROISSANCE': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatAge = (s: Sheep) => {
    if (s.dentition) return s.dentition.replace('_', ' ');
    return `${s.age_mois} mois`;
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Base de Données Cloud</h2>
          <p className="text-gray-500">Profils zootechniques et fiches mammaires.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sheep.map((s) => (
          <div key={s.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all flex flex-col group">
            <div className="aspect-video relative bg-gray-100 shrink-0 overflow-hidden">
              {s.imageUrl && <img src={s.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase shadow-sm ${getEtatColor(s.etat_physiologique)}`}>
                  {s.etat_physiologique.replace('_', ' ')}
                </span>
                {s.mammary_score && (
                  <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase shadow-sm bg-pink-600 text-white">
                    Score: {s.mammary_score}/10
                  </span>
                )}
              </div>
            </div>
            
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-bold text-gray-900 leading-tight">Boucle: {s.tagId}</h4>
                  <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">{s.race} • {s.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-blue-800 bg-blue-50 px-2 py-1 rounded-lg">{formatAge(s)}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6 flex-1">
                {Object.keys(s.measurements || {}).length > 0 && (
                  <div>
                    <p className="text-[9px] font-black text-blue-900 uppercase mb-2">Morphologie</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(s.measurements).map(([key, value]) => {
                        const trait = MORPHO_TRAITS.find(t => t.id === key);
                        return (
                          <div key={key} className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                            <p className="text-[8px] text-gray-400 uppercase font-black truncate">{trait?.label || key}</p>
                            <p className="text-xs font-black text-gray-800">{value} <span className="text-[9px] font-normal text-gray-400">{trait?.unit || ''}</span></p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-4 border-t border-gray-50 flex gap-2">
                <button onClick={() => onDelete(s.id)} className="flex-1 bg-gray-50 text-gray-400 py-3 rounded-xl text-[10px] font-black hover:bg-red-50 hover:text-red-600 transition-all uppercase tracking-widest">Retirer</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Inventory;
