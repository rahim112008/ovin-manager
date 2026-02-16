
import React, { useState, useRef } from 'react';
import { analyzeSheepImage } from '../services/geminiService';
import { AnalysisResult, Race, ReferenceObjectType, AnalysisMode, EtatPhysiologique, Dentition } from '../types';
import { STANDARDS_RACES, MORPHO_TRAITS, REFERENCE_OBJECTS, MAMMARY_TRAITS } from '../constants';

interface AnalysisModuleProps {
  onSave: (result: AnalysisResult, imageUrl: string, metadata: { tagId: string, age: any, ageType: 'mois'|'dentition', etat: EtatPhysiologique }) => void;
  isOffline: boolean;
}

const AnalysisModule: React.FC<AnalysisModuleProps> = ({ onSave, isOffline }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('PROFILE');
  const [refObject, setRefObject] = useState<ReferenceObjectType>('AUCUN');

  // Métadonnées manuelles
  const [metadata, setMetadata] = useState({
    tagId: '',
    ageType: 'mois' as 'mois' | 'dentition',
    ageValue: '' as string | number,
    etat: 'VIDE' as EtatPhysiologique
  });
  
  const [formData, setFormData] = useState<Partial<AnalysisResult>>({
    race: 'HAMRA',
    robe_couleur: '',
    measurements: {},
    mammary_traits: {},
    mammary_score: 0,
    feedback: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentTraits = analysisMode === 'PROFILE' ? MORPHO_TRAITS : MAMMARY_TRAITS;

  const handleAnalysis = async () => {
    if (!image) return;
    if (isOffline) {
      alert("L'analyse IA nécessite une connexion internet.");
      return;
    }
    setLoading(true);
    try {
      const result = await analyzeSheepImage(image, analysisMode, formData.race as Race, refObject);
      setFormData(prev => ({
        ...prev,
        ...result,
        measurements: { ...prev.measurements, ...result.measurements },
        mammary_traits: { ...prev.mammary_traits, ...result.mammary_traits }
      }));
    } catch (e) {
      alert("Erreur IA. Veuillez corriger manuellement les champs.");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (category: 'measurements' | 'mammary_traits', traitId: string, val: any) => {
    setFormData(prev => ({
      ...prev,
      [category]: { ...(prev[category] as any), [traitId]: val }
    }));
  };

  const validateStep1 = () => {
    if (!metadata.tagId) return alert("Veuillez entrer un ID/N° de boucle.");
    if (!metadata.ageValue) return alert("Veuillez renseigner l'âge ou la dentition.");
    setStep(2);
  };

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto animate-fadeIn">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
          <div className="text-center mb-8">
            <span className="text-4xl bg-blue-50 p-4 rounded-3xl inline-block mb-4">🆔</span>
            <h2 className="text-2xl font-black text-gray-900">Identification de l'Animal</h2>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Étape 1 sur 2</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 ml-2">Numéro de Boucle / ID</label>
              <input 
                type="text"
                value={metadata.tagId}
                onChange={e => setMetadata({...metadata, tagId: e.target.value.toUpperCase()})}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: 04-DZ-889"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 ml-2">Type d'Âge</label>
                <div className="flex bg-gray-100 p-1 rounded-2xl">
                  <button 
                    onClick={() => setMetadata({...metadata, ageType: 'mois', ageValue: ''})}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${metadata.ageType === 'mois' ? 'bg-white shadow-sm text-blue-900' : 'text-gray-400'}`}
                  >MOIS</button>
                  <button 
                    onClick={() => setMetadata({...metadata, ageType: 'dentition', ageValue: ''})}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${metadata.ageType === 'dentition' ? 'bg-white shadow-sm text-blue-900' : 'text-gray-400'}`}
                  >DENTITION</button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 ml-2">Valeur</label>
                {metadata.ageType === 'mois' ? (
                  <input 
                    type="number"
                    value={metadata.ageValue}
                    onChange={e => setMetadata({...metadata, ageValue: parseInt(e.target.value)})}
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-3 font-bold text-gray-800 outline-none"
                    placeholder="Nb mois"
                  />
                ) : (
                  <select 
                    value={metadata.ageValue}
                    onChange={e => setMetadata({...metadata, ageValue: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-3 font-bold text-gray-800 outline-none"
                  >
                    <option value="">Choisir...</option>
                    <option value="0_DENT">0 dent (Agneau)</option>
                    <option value="2_DENTS">2 dents (Lait)</option>
                    <option value="4_DENTS">4 dents</option>
                    <option value="6_DENTS">6 dents</option>
                    <option value="8_DENTS">8 dents (Adulte)</option>
                  </select>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 ml-2">État Physiologique</label>
              <select 
                value={metadata.etat}
                onChange={e => setMetadata({...metadata, etat: e.target.value as EtatPhysiologique})}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-800 outline-none"
              >
                <option value="VIDE">Vide / Repos</option>
                <option value="GESTANTE_DEBUT">Gestante (Début)</option>
                <option value="GESTANTE_FIN">Gestante (Fin de terme)</option>
                <option value="ALLAITANTE">Allaitante</option>
                <option value="TARIE">Tarie</option>
                <option value="EN_CROISSANCE">En croissance (Agneau/elle)</option>
              </select>
            </div>

            <button 
              onClick={validateStep1}
              className="w-full bg-blue-700 text-white py-5 rounded-2xl font-black text-sm shadow-xl hover:bg-blue-800 transition-all mt-4"
            >
              CONTINUER VERS L'ANALYSE IA ➔
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-24">
      <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setStep(1)} className="p-3 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all">⬅</button>
          <div>
            <h2 className="text-xl font-black text-gray-900">Laboratoire Biométrique</h2>
            <p className="text-[10px] font-black text-blue-600 uppercase">Animal: {metadata.tagId}</p>
          </div>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button 
            onClick={() => setAnalysisMode('PROFILE')}
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${analysisMode === 'PROFILE' ? 'bg-white shadow-sm text-blue-900' : 'text-gray-400'}`}
          >📏 Morphologie</button>
          <button 
            onClick={() => setAnalysisMode('MAMMARY')}
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${analysisMode === 'MAMMARY' ? 'bg-white shadow-sm text-pink-700' : 'text-gray-400'}`}
          >🥛 Examen Mammaire</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-[10px] font-black text-blue-900 uppercase mb-4 tracking-widest">1. Choisir Étalon</h3>
            <div className="space-y-2">
              {REFERENCE_OBJECTS.map(obj => (
                <button
                  key={obj.id}
                  onClick={() => setRefObject(obj.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${refObject === obj.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'}`}
                >
                  <span className="text-xl">{obj.icon}</span>
                  <div>
                    <p className="text-[11px] font-black">{obj.label}</p>
                    <p className="text-[9px] font-bold opacity-70">{obj.dimension}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
             <div onClick={() => fileInputRef.current?.click()} className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-all overflow-hidden">
                {image ? <img src={image} className="w-full h-full object-cover" alt="Sheep" /> : <><span className="text-4xl mb-2">📸</span><span className="text-[10px] font-black text-gray-400 uppercase">Capture / Import</span></>}
             </div>
             <input type="file" ref={fileInputRef} onChange={e => {
               const file = e.target.files?.[0];
               if(file) {
                 const r = new FileReader();
                 r.onload = () => setImage(r.result as string);
                 r.readAsDataURL(file);
               }
             }} className="hidden" accept="image/*" />
             
             <button 
               onClick={handleAnalysis} 
               disabled={loading || !image || isOffline}
               className={`w-full mt-4 py-4 rounded-2xl font-black text-xs text-white shadow-xl transition-all ${loading ? 'bg-gray-400 animate-pulse' : 'bg-[#1a237e]'} ${isOffline ? 'opacity-50' : ''}`}
             >
               {loading ? 'CALCUL EN COURS...' : 'LANCER L\'ANALYSE IA'}
             </button>
          </section>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl">
            <h3 className="text-lg font-black text-gray-900 mb-6 pb-4 border-b border-gray-50">Fiche de Données Hybride</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Standard de Race</label>
                <select 
                  value={formData.race} 
                  onChange={e => setFormData({...formData, race: e.target.value as Race})}
                  className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-sm border-none outline-none"
                >
                  {Object.keys(STANDARDS_RACES).map(r => <option key={r} value={r}>{STANDARDS_RACES[r].nom_complet}</option>)}
                </select>
              </div>
              <div className="flex gap-4">
                 <div className="flex-1 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <p className="text-[9px] font-black text-blue-400 uppercase">État Manuel</p>
                    <p className="text-xs font-black text-blue-900">{metadata.etat.replace('_', ' ')}</p>
                 </div>
                 <div className="flex-1 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <p className="text-[9px] font-black text-blue-400 uppercase">Âge Manuel</p>
                    <p className="text-xs font-black text-blue-900">{metadata.ageValue} {metadata.ageType === 'mois' ? 'mois' : ''}</p>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentTraits.map(trait => {
                const category = analysisMode === 'PROFILE' ? 'measurements' : 'mammary_traits';
                const value = (formData[category] as any)?.[trait.id] || '';
                return (
                  <div key={trait.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase">{trait.label}</span>
                      {trait.unit && <span className="text-[9px] font-bold text-blue-400">{trait.unit}</span>}
                    </div>
                    {trait.type === 'quantitative' ? (
                      <input 
                        type="number" step="0.1" value={value} 
                        onChange={e => updateField(category, trait.id, parseFloat(e.target.value))}
                        className="w-full bg-white border border-gray-200 rounded-xl p-3 font-black text-blue-900 text-sm" 
                      />
                    ) : (
                      <select 
                        value={value} 
                        onChange={e => updateField(category, trait.id, e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl p-3 font-black text-sm"
                      >
                        <option value="">-- Choisir --</option>
                        {trait.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>

            <button 
              onClick={() => onSave(formData as AnalysisResult, image || '', { 
                tagId: metadata.tagId, 
                age: metadata.ageValue, 
                ageType: metadata.ageType, 
                etat: metadata.etat 
              })}
              className="mt-8 w-full bg-green-600 text-white py-5 rounded-3xl font-black text-sm shadow-xl hover:bg-green-700 transition-all"
            >
              ✅ ARCHIVER DÉFINITIVEMENT LE PROFIL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModule;
