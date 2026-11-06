import React, { useState } from 'react';
import type { User, UserRole } from '../types/index.ts';
import { loginWithCredentials, loginRole } from '../services/api.ts';
import { Shield, Lock, User as UserIcon, Key, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('AdminPassword2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await loginWithCredentials(username, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Verifique sus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    setError('');
    setLoading(true);
    try {
      const res = await loginRole(role);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Error en inicio de sesión rápido.');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts: { role: UserRole; title: string; user: string; pass: string; badge: string; desc: string }[] = [
    {
      role: 'admin',
      title: 'Administrator',
      user: 'admin',
      pass: 'AdminPassword2026!',
      badge: 'Full RBAC + User Management',
      desc: 'Acceso total a inventario, vault, creación de usuarios y terminales.',
    },
    {
      role: 'net_engineer',
      title: 'Network Engineer',
      user: 'marcus.vance',
      pass: 'Engineer2026!',
      badge: 'Read / Write + Web CLI',
      desc: 'Gestión de equipos, configuración y sesiones de terminal interactivas.',
    },
    {
      role: 'operator',
      title: 'NOC Operator',
      user: 'elena.rostova',
      pass: 'Operator2026!',
      badge: 'Terminal Execution Only',
      desc: 'Visualización y comandos de diagnóstico CLI en equipos autorizados.',
    },
    {
      role: 'auditor',
      title: 'Compliance Auditor',
      user: 'david.kim',
      pass: 'Auditor2026!',
      badge: 'Read-Only Compliance',
      desc: 'Solo lectura de inventario y logs de auditoría. CLI bloqueado por política.',
    },
  ];

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

      <div className="w-full max-w-xl z-10">
        
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
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-2xl">
          
          <div className="mb-6 pb-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                Inicio de Sesión Seguro
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Autenticación con JWT, RBAC y control de acceso granular.
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
                Nombre de Usuario (Username)
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin o nombre de usuario..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Contraseña (Password)
                </label>
              </div>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese contraseña..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-cyan-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Iniciar Sesión en el Gateway</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Profiles */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">
              Acceso Rápido por Perfil (Demo &amp; Testing RBAC)
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleQuickLogin(acc.role)}
                  className="p-3 rounded-lg bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/50 text-left transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">
                        {acc.title}
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/50">
                        {acc.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      {acc.desc}
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-850 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                    <span>{acc.user}</span>
                    <span className="text-slate-600">/</span>
                    <span className="truncate max-w-[100px]">{acc.pass}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Security Notice Footer */}
        <div className="text-center mt-6 text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <span>NetGateway Zero-Trust Architecture · RSA 2048 / Ed25519 / AES-256-GCM</span>
        </div>

      </div>
    </div>
  );
};
