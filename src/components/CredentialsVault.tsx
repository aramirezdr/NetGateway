import React, { useState } from 'react';
import type { Credential, User } from '../types/index.ts';
import { Shield, Key, Lock, Plus, CheckCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface CredentialsVaultProps {
  credentials: Credential[];
  currentUser: User;
  onAddCredential: (data: any) => Promise<void>;
  refreshCredentials: () => void;
}

export const CredentialsVault: React.FC<CredentialsVaultProps> = ({
  credentials,
  currentUser,
  onAddCredential,
  refreshCredentials,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('netadmin');
  const [authType, setAuthType] = useState<'password' | 'ssh_key'>('password');
  const [secret, setSecret] = useState('');
  const [enableSecret, setEnableSecret] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !username || !secret) {
      setError('Profile name, username, and secret are required.');
      return;
    }

    try {
      await onAddCredential({
        name,
        username,
        auth_type: authType,
        secret,
        enable_secret: enableSecret || undefined,
      });
      setShowAddModal(false);
      setName('');
      setSecret('');
      setEnableSecret('');
    } catch (err: any) {
      setError(err.message || 'Failed to save credential');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-cyan-400" />
            Credentials Vault &amp; Access Secrets
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Enterprise secrets encrypted at rest using AES-256-GCM. Never exposed in cleartext logs or client payloads.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={refreshCredentials}
            className="p-2 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            title="Refresh Vault"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {currentUser.role === 'admin' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-cyan-600/30 transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Store Credential Set
            </button>
          )}
        </div>
      </div>

      {/* Security Architecture Notice */}
      <div className="mb-6 p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
        <Lock className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold text-white">Zero-Knowledge Storage Model:</span> Passwords, TACACS+ tokens, and private SSH keys are transformed into 12-byte initialization vectors and Galois/Counter Mode authentication tags in backend memory. The terminal bridge service injects decrypted keys only into the volatile PTY execution stream.
        </div>
      </div>

      {/* Credentials Table */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold">
              <th className="py-3 px-4">Profile Name</th>
              <th className="py-3 px-4">Authentication Type</th>
              <th className="py-3 px-4">Username</th>
              <th className="py-3 px-4">Enable Secret Protection</th>
              <th className="py-3 px-4">Mapped Devices</th>
              <th className="py-3 px-4 text-right">Created At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {credentials.map((cred) => (
              <tr key={cred.id} className="hover:bg-slate-900/40 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{cred.name}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">{cred.id}</div>
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono text-slate-300">
                    {cred.auth_type === 'ssh_key' ? 'SSH Ed25519/RSA Keypair' : 'TACACS+ / Password'}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-cyan-300">
                  {cred.username}
                </td>
                <td className="py-3 px-4">
                  {cred.has_enable_secret ? (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Configured (Level 15)
                    </span>
                  ) : (
                    <span className="text-slate-500">Not Applicable</span>
                  )}
                </td>
                <td className="py-3 px-4 font-mono tabular-nums text-slate-300">
                  {cred.device_count || 1} asset{cred.device_count === 1 ? '' : 's'}
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-400 tabular-nums">
                  {new Date(cred.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Store New Encrypted Credential</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="my-3 p-3 bg-rose-950/50 border border-rose-800 rounded text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 py-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Profile Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Core Cisco TACACS+ Vault"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Auth Type</label>
                  <select
                    value={authType}
                    onChange={(e) => setAuthType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="password">Password / TACACS+</option>
                    <option value="ssh_key">SSH Private Key</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  {authType === 'ssh_key' ? 'OpenSSH Private Key *' : 'Password / Secret *'}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={authType === 'ssh_key' ? '-----BEGIN OPENSSH PRIVATE KEY-----...' : 'Enter password...'}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Cisco / Comware Enable Secret (Optional)</label>
                <input
                  type="password"
                  placeholder="Privilege level 15 password"
                  value={enableSecret}
                  onChange={(e) => setEnableSecret(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg text-xs shadow-sm"
                >
                  Encrypt &amp; Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
