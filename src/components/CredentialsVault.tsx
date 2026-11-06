import React, { useState } from 'react';
import type { Credential, User } from '../types/index.ts';
import { Shield, Key, Lock, Plus, CheckCircle, RefreshCw, Eye, EyeOff, Edit2, Trash2, AlertCircle } from 'lucide-react';

interface CredentialsVaultProps {
  credentials: Credential[];
  currentUser: User;
  onAddCredential: (data: any) => Promise<void>;
  onUpdateCredential?: (id: string, data: any) => Promise<void>;
  onDeleteCredential?: (id: string) => Promise<void>;
  refreshCredentials: () => void;
}

export const CredentialsVault: React.FC<CredentialsVaultProps> = ({
  credentials,
  currentUser,
  onAddCredential,
  onUpdateCredential,
  onDeleteCredential,
  refreshCredentials,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCred, setEditingCred] = useState<Credential | null>(null);

  // New credential form
  const [name, setName] = useState('');
  const [username, setUsername] = useState('netadmin');
  const [authType, setAuthType] = useState<'password' | 'ssh_key'>('password');
  const [secret, setSecret] = useState('');
  const [enableSecret, setEnableSecret] = useState('');
  const [error, setError] = useState('');

  // Edit credential form
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editAuthType, setEditAuthType] = useState<'password' | 'ssh_key'>('password');
  const [editSecret, setEditSecret] = useState('');
  const [editEnableSecret, setEditEnableSecret] = useState('');
  const [editError, setEditError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !username || !secret) {
      setError('El nombre del perfil, usuario y la contraseña/clave son obligatorios.');
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
      setError(err.message || 'Error al guardar la credencial');
    }
  };

  const handleStartEdit = (cred: Credential) => {
    setEditingCred(cred);
    setEditName(cred.name);
    setEditUsername(cred.username);
    setEditAuthType(cred.auth_type);
    setEditSecret('');
    setEditEnableSecret('');
    setEditError('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCred || !onUpdateCredential) return;
    setEditError('');

    if (!editName.trim() || !editUsername.trim()) {
      setEditError('El nombre del perfil y el usuario son obligatorios.');
      return;
    }

    try {
      await onUpdateCredential(editingCred.id, {
        name: editName.trim(),
        username: editUsername.trim(),
        auth_type: editAuthType,
        secret: editSecret.trim() ? editSecret.trim() : undefined,
        enable_secret: editEnableSecret !== '' ? editEnableSecret.trim() : undefined,
      });
      setEditingCred(null);
      refreshCredentials();
    } catch (err: any) {
      setEditError(err.message || 'Error al actualizar la credencial');
    }
  };

  const handleDelete = async (cred: Credential) => {
    if (!onDeleteCredential) return;
    if (confirm(`¿Está seguro de eliminar definitivamente el perfil de credenciales "${cred.name}"?`)) {
      try {
        await onDeleteCredential(cred.id);
        refreshCredentials();
      } catch (err: any) {
        alert(err.message || 'Error al eliminar la credencial');
      }
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
            Gestión y rotación de secretos corporativos cifrados en reposo con AES-256-GCM.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={refreshCredentials}
            className="p-2 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            title="Refrescar Vault"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {currentUser.role === 'admin' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-cyan-600/30 transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Guardar Nueva Credencial
            </button>
          )}
        </div>
      </div>

      {/* Security Architecture Notice */}
      <div className="mb-6 p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
        <Lock className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold text-white">Modelo de Rotación y Cifrado Seguro:</span> Si una contraseña, clave privada o secreto TACACS+ cambia en tu infraestructura de red, puedes editar el perfil en cualquier momento. El backend generará un nuevo vector de inicialización (IV) de 12 bytes y una nueva etiqueta de autenticación GCM sin exponer el texto plano a clientes o logs.
        </div>
      </div>

      {/* Credentials Table */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950 shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold">
              <th className="py-3 px-4">Perfil de Credencial</th>
              <th className="py-3 px-4">Método de Autenticación</th>
              <th className="py-3 px-4">Usuario Asignado</th>
              <th className="py-3 px-4">Protección Enable (Nivel 15)</th>
              <th className="py-3 px-4">Equipos Vinculados</th>
              <th className="py-3 px-4">Última Actualización</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {credentials.map((cred) => (
              <tr key={cred.id} className="hover:bg-slate-900/40 transition-colors group">
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{cred.name}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">{cred.id}</div>
                </td>
                <td className="py-3.5 px-4">
                  <span className="font-mono text-slate-300">
                    {cred.auth_type === 'ssh_key' ? 'SSH Ed25519/RSA Keypair' : 'TACACS+ / Contraseña'}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono text-cyan-300 font-medium">
                  {cred.username}
                </td>
                <td className="py-3.5 px-4">
                  {cred.has_enable_secret ? (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Habilitado (Nivel 15)
                    </span>
                  ) : (
                    <span className="text-slate-500">No aplica</span>
                  )}
                </td>
                <td className="py-3.5 px-4 font-mono tabular-nums text-slate-300">
                  {cred.device_count || 1} equipo{cred.device_count === 1 ? '' : 's'}
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-400 tabular-nums">
                  {new Date(cred.last_used || cred.created_at).toLocaleDateString()}
                </td>
                <td className="py-3.5 px-4 text-right">
                  {currentUser.role === 'admin' ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleStartEdit(cred)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-850 rounded transition-colors"
                        title="Editar credencial o rotar contraseña"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cred)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                        title="Eliminar perfil del vault"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-600 text-[11px] italic">Solo lectura</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Crear Credencial */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                Registrar Nueva Credencial Cifrada
              </h3>
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
                <label className="block text-slate-400 mb-1">Nombre del Perfil *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cisco Core Switches TACACS+"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Nombre de Usuario *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Tipo de Autenticación</label>
                  <select
                    value={authType}
                    onChange={(e) => setAuthType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="password">Contraseña / TACACS+</option>
                    <option value="ssh_key">Clave Privada SSH</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  {authType === 'ssh_key' ? 'Clave Privada OpenSSH *' : 'Contraseña o Secreto SSH *'}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={authType === 'ssh_key' ? '-----BEGIN OPENSSH PRIVATE KEY-----...' : 'Ingrese contraseña secreta...'}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Secreto Enable / Modo Privilegiado Nivel 15 (Opcional)</label>
                <input
                  type="password"
                  placeholder="Contraseña del comando 'enable'"
                  value={enableSecret}
                  onChange={(e) => setEnableSecret(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg text-xs shadow-sm"
                >
                  Cifrar y Guardar (AES-256)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Credencial / Rotar Contraseña */}
      {editingCred && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-cyan-400" />
                Editar Credencial / Rotar Contraseña
              </h3>
              <button
                onClick={() => setEditingCred(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="my-3 p-3 bg-rose-950/50 border border-rose-800 rounded text-rose-300 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 py-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Nombre del Perfil *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Nombre de Usuario *</label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Tipo de Autenticación</label>
                  <select
                    value={editAuthType}
                    onChange={(e) => setEditAuthType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="password">Contraseña / TACACS+</option>
                    <option value="ssh_key">Clave Privada SSH</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Nueva Contraseña / Clave SSH (Rotación de Credencial)
                </label>
                <textarea
                  rows={3}
                  placeholder="Dejar vacío para conservar la contraseña/clave actual cifrada con AES-256"
                  value={editSecret}
                  onChange={(e) => setEditSecret(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono placeholder:text-slate-600"
                />
                <span className="text-[11px] text-slate-500 block mt-1">
                  💡 Si tu equipo o servidor TACACS+ cambió de clave, escríbela aquí para reencriptarla en el Vault.
                </span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Nuevo Secreto Enable / Modo Privilegiado (Nivel 15)
                </label>
                <input
                  type="password"
                  placeholder="Dejar vacío para mantener el actual"
                  value={editEnableSecret}
                  onChange={(e) => setEditEnableSecret(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono placeholder:text-slate-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCred(null)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg text-xs shadow-sm"
                >
                  Actualizar y Reencriptar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
