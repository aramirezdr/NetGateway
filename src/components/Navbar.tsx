import React from 'react';
import type { User, UserRole } from '../types/index.ts';
import { Terminal, Shield, Server, FileText, Network, UserCheck, Users, LogOut } from 'lucide-react';

interface NavbarProps {
  currentTab: 'inventory' | 'terminal' | 'credentials' | 'audit' | 'topology' | 'users';
  onSelectTab: (tab: 'inventory' | 'terminal' | 'credentials' | 'audit' | 'topology' | 'users') => void;
  currentUser: User;
  onSwitchRole: (role: UserRole) => void;
  onLogout: () => void;
  activeTerminalCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onSwitchRole,
  onLogout,
  activeTerminalCount,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur sticky top-0 z-50">
      {/* Strict 3-zone Top Bar Contract */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-8 h-16">
        
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-cyan-500/20">
            NG
          </div>
          <span 
            onClick={() => onSelectTab('inventory')}
            className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer hover:text-cyan-400 transition-colors"
          >
            NetGateway
          </span>
        </div>

        {/* Zone 2: 4-5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => onSelectTab('inventory')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 flex items-center gap-1.5 ${
              currentTab === 'inventory'
                ? 'text-cyan-400 border-cyan-400 font-semibold'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            Inventory
          </button>

          <button
            onClick={() => onSelectTab('terminal')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 flex items-center gap-1.5 ${
              currentTab === 'terminal'
                ? 'text-cyan-400 border-cyan-400 font-semibold'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Web CLI</span>
            {activeTerminalCount > 0 && (
              <span className="ml-1 text-xs px-1.5 py-0.2 bg-cyan-950 border border-cyan-700/60 text-cyan-300 rounded font-mono tabular-nums">
                {activeTerminalCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('credentials')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 flex items-center gap-1.5 ${
              currentTab === 'credentials'
                ? 'text-cyan-400 border-cyan-400 font-semibold'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            Credentials Vault
          </button>

          <button
            onClick={() => onSelectTab('audit')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 flex items-center gap-1.5 ${
              currentTab === 'audit'
                ? 'text-cyan-400 border-cyan-400 font-semibold'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Audit Logs
          </button>

          <button
            onClick={() => onSelectTab('topology')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 flex items-center gap-1.5 ${
              currentTab === 'topology'
                ? 'text-cyan-400 border-cyan-400 font-semibold'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Network className="w-4 h-4" />
            Topology
          </button>

          {currentUser.role === 'admin' && (
            <button
              onClick={() => onSelectTab('users')}
              className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 flex items-center gap-1.5 ${
                currentTab === 'users'
                  ? 'text-cyan-400 border-cyan-400 font-semibold'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Users &amp; RBAC
            </button>
          )}
        </nav>

        {/* Zone 3: Profile & Logout */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 border border-slate-800 rounded-lg bg-slate-900/80 px-2.5 py-1 text-xs">
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 font-medium truncate max-w-[120px]">{currentUser.name}</span>
            <span className="text-slate-600">/</span>
            <select
              value={currentUser.role}
              onChange={(e) => onSwitchRole(e.target.value as UserRole)}
              className="bg-transparent text-cyan-400 font-semibold focus:outline-none cursor-pointer text-xs"
              title="Cambiar rol rápido para testing"
            >
              <option value="admin" className="bg-slate-900 text-slate-200">Admin</option>
              <option value="net_engineer" className="bg-slate-900 text-slate-200">Engineer</option>
              <option value="operator" className="bg-slate-900 text-slate-200">Operator</option>
              <option value="auditor" className="bg-slate-900 text-slate-200">Auditor (Read-Only)</option>
            </select>
          </div>

          <button
            onClick={onLogout}
            className="p-2 border border-slate-800 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
            title="Cerrar sesión (Sign Out)"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
