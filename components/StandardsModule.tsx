
import React from 'react';
import { STANDARDS_RACES } from '../constants';

const StandardsModule: React.FC = () => {
  return (
    <div className="space-y-10 animate-fadeIn">
      <header>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Guide Biométrique & Standards</h2>
        <p className="text-gray-500 font-medium">Comprendre les mesures morphométriques analysées par l'IA.</p>
      </header>

      {/* Section Morphométrie Corporelle */}
      <section className="space-y-6">
        <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
          <span className="p-2 bg-blue-100 rounded-lg text-blue-700">📐</span> 
          Mesures du Corps (Profil)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { 
              title: "Longueur du Corps", 
              desc: "Distance horizontale entre la pointe de l'épaule et la pointe de la fesse (ischium).",
              importance: "Indicateur de la capacité de croissance et du format boucherie."
            },
            { 
              title: "Hauteur au Garrot", 
              desc: "Mesure verticale du sol jusqu'au sommet du garrot.",
              importance: "Définit la stature de l'animal selon le standard de sa race."
            },
            { 
              title: "Tour de Poitrine", 
              desc: "Périmètre mesuré juste derrière les membres antérieurs.",
              importance: "Reflet de la capacité respiratoire et du développement musculaire."
            }
          ].map((m, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <h4 className="font-black text-gray-800 mb-2">{m.title}</h4>
              <p className="text-sm text-gray-600 mb-4">{m.desc}</p>
              <div className="text-[11px] bg-blue-50 text-blue-700 p-3 rounded-xl font-medium italic">
                💡 {m.importance}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section Morphométrie Mammaire */}
      <section className="space-y-6">
        <h3 className="text-xl font-bold text-red-900 flex items-center gap-2">
          <span className="p-2 bg-red-100 rounded-lg text-red-700">🥛</span> 
          Mesures des Mamelles (Arrière)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h4 className="font-black text-gray-800 mb-2">Score de Développement (1-10)</h4>
            <p className="text-sm text-gray-600">L'IA évalue le volume global de la glande mammaire. Un score de 8-10 indique une excellente capacité laitière, typique des meilleures races locales comme la Hamra ou la Sidahou.</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h4 className="font-black text-gray-800 mb-2">Symétrie & Conformation</h4>
            <p className="text-sm text-gray-600">L'algorithme vérifie l'équilibre entre les deux quartiers et la fermeté des attaches. Une mauvaise attache réduit la longévité productive de la brebis.</p>
          </div>
        </div>
      </section>

      {/* Section Races Standards */}
      <section className="space-y-6">
        <h3 className="text-xl font-bold text-gray-900">Références par Race (Algérie)</h3>
        <div className="overflow-x-auto bg-white rounded-3xl border border-gray-100 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                <th className="px-6 py-4">Race</th>
                <th className="px-6 py-4">H. Garrot (cm)</th>
                <th className="px-6 py-4">Longueur (cm)</th>
                <th className="px-6 py-4">Poids Male (kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.values(STANDARDS_RACES).map((race) => (
                <tr key={race.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-800">{race.nom_complet}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{race.mensurations.hauteur_cm[0]}-{race.mensurations.hauteur_cm[1]}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{race.mensurations.longueur_cm[0]}-{race.mensurations.longueur_cm[1]}</td>
                  <td className="px-6 py-4 text-sm font-black text-blue-800">{race.poids_adulte.male[0]}-{race.poids_adulte.male[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default StandardsModule;
