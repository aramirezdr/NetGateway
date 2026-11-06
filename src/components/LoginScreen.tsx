import React, { useState } from 'react';
import type { User } from '../types/index.ts';
import { loginWithCredentials } from '../services/api.ts';
import { Shield, Lock, User as UserIcon, Key, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Por favor ingrese su nombre de usuario y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginWithCredentials(username.trim(), password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Verifique sus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b12] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background technical grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}
      />

      <div className="w-full max-w-md z-10">
        
        {/* Branding Lockup */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 mx-auto flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-cyan-500/20 mb-3">
            NG
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            NetGateway Enterprise
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Network Device Inventory &amp; Interactive Web Terminal Gateway
          </p>
        </div>

        {/* Main Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-2xl">
          
          <div className="mb-6 pb-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                Inicio de Sesión Seguro
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Autenticación corporativa con JWT y control de acceso RBAC.
              </p>
            </div>
            <Lock className="w-5 h-5 text-cyan-400" />
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Nombre de Usuario
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Usuario asignado..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Contraseña
                </label>
              </div>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-cyan-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Security Notice Footer */}
        <div className="text-center mt-6 text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <span>Acceso restringido a personal autorizado · Cifrado AES-256 / SHA-256</span>
        </div>

      </div>
    </div>
  );
};
