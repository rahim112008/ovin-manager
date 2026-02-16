
import React, { useState } from 'react';
import { db } from '../services/database';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [farmName, setFarmName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegister) {
      if (!username || !password || !farmName) {
        setError('Veuillez remplir tous les champs.');
        return;
      }
      const existing = await db.getUserByUsername(username);
      if (existing) {
        setError('Ce nom d\'utilisateur existe déjà.');
        return;
      }
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        username,
        passwordHash: btoa(password), 
        farmName,
        role: 'admin'
      };
      await db.createUser(newUser);
      onLogin(newUser);
    } else {
      const user = await db.getUserByUsername(username);
      if (user && user.passwordHash === btoa(password)) {
        onLogin(user);
      } else {
        setError('Identifiants incorrects.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#1a237e] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-blue-600 rounded-full blur-[120px] opacity-30"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-blue-400 rounded-full blur-[120px] opacity-20"></div>

      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 relative z-10 animate-fadeIn">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner transform rotate-6">
            <span className="text-4xl">🐏</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 leading-tight uppercase tracking-tighter">Ovin Pro DZ</h1>
          <div className="mt-1">
            <p className="text-blue-600 text-[11px] font-black tracking-[0.1em] normal-case">Laboratoire GenApAgiE</p>
            <p className="text-gray-400 text-[8px] font-bold uppercase tracking-widest mt-1">Gestion Intelligente & Hors-Ligne</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold mb-6 animate-pulse">
             ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Nom d'utilisateur</label>
            <input 
              name="username"
              type="text" 
              autoComplete="username"
              required
              value={username} 
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              placeholder="Ex: djamel_dz"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Mot de passe</label>
            <input 
              name="password"
              type="password" 
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              placeholder="••••••••"
            />
          </div>

          {isRegister && (
            <div className="animate-slideDown">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Nom de l'Exploitation</label>
              <input 
                name="organization"
                type="text" 
                required
                value={farmName} 
                onChange={e => setFarmName(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Ferme El-Amel"
              />
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-blue-700 text-white py-5 rounded-2xl font-black text-sm shadow-xl shadow-blue-100 hover:bg-blue-800 transition-all active:scale-95 mt-4"
          >
            {isRegister ? "CRÉER MON COMPTE" : "DÉMARRER LA SESSION"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs font-black text-blue-600 uppercase tracking-widest hover:underline"
          >
            {isRegister ? "Déjà un compte ? Connexion" : "Nouvel éleveur ? S'inscrire"}
          </button>
        </div>
        
        <div className="mt-10 pt-6 border-t border-gray-100 flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Système de stockage local sécurisé</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
