import React, { useState, useEffect } from 'react';
import type { User, UserRole } from '../types/index.ts';
import { 
  fetchUsers, 
  createUser, 
  updateUser, 
  deleteUser 
} from '../services/api.ts';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  KeyRound, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Edit2, 
  RefreshCw,
  Search,
  UserX,
  Mail,
  Clock
} from 'lucide-react';

interface UserManagementProps {
  currentUser: User;
  onRefreshSession?: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('net_engineer');
  const [newPermissions, setNewPermissions] = useState<string[]>([]);
  const [formError, setFormError] = useState('');

  // Edit user form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('operator');
  const [editPassword, setEditPassword] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active');

  const allAvailablePermissions = [
    { id: 'device:read', label: 'Ver Equipos e Inventario' },
    { id: 'device:write', label: 'Crear y Modificar Equipos' },
    { id: 'device:delete', label: 'Eliminar Equipos' },
    { id: 'terminal:connect', label: 'Acceso a Terminal Web CLI' },
    { id: 'credentials:read', label: 'Consultar Vault de Credenciales' },
    { id: 'credentials:write', label: 'Crear Credenciales Cifradas' },
    { id: 'audit:read', label: 'Consultar Logs de Auditoría' },
    { id: 'user:manage', label: 'Administrar Usuarios y RBAC' },
  ];

  const defaultRolePermissions: Record<UserRole, string[]> = {
    admin: ['device:read', 'device:write', 'device:delete', 'terminal:connect', 'credentials:read', 'credentials:write', 'audit:read', 'user:manage'],
    net_engineer: ['device:read', 'device:write', 'terminal:connect', 'credentials:read', 'audit:read'],
    operator: ['device:read', 'terminal:connect'],
    auditor: ['device:read', 'audit:read'],
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setUsersList(data);
    } catch (e) {
      console.error('Error fetching users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = (role: UserRole) => {
    setNewRole(role);
    setNewPermissions(defaultRolePermissions[role] || ['device:read']);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newUsername.trim() || !newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setFormError('Todos los campos son obligatorios.');
      return;
    }

    try {
      await createUser({
        username: newUsername.trim().toLowerCase(),
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        password: newPassword.trim(),
        role: newRole,
        permissions: newPermissions.length > 0 ? newPermissions : defaultRolePermissions[newRole],
      });

      setShowCreateModal(false);
      // Reset form
      setNewUsername('');
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('net_engineer');
      await loadUsers();
    } catch (err: any) {
      setFormError(err.message || 'Error al crear usuario.');
    }
  };

  const handleEditClick = (u: User) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditStatus(u.status || 'active');
    setEditPassword('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await updateUser(editingUser.id, {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        role: editRole,
        status: editStatus,
        password: editPassword.trim() ? editPassword.trim() : undefined,
      });

      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar usuario.');
    }
  };

  const handleToggleStatus = async (userToToggle: User) => {
    if (userToToggle.id === currentUser.id) {
      alert('No puedes suspender tu propia cuenta activa de administrador.');
      return;
    }
    const newStatus = userToToggle.status === 'suspended' ? 'active' : 'suspended';
    try {
      await updateUser(userToToggle.id, { status: newStatus });
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Error al modificar estado del usuario.');
    }
  };

  const handleDeleteUser = async (userToDelete: User) => {
    if (userToDelete.id === currentUser.id) {
      alert('No puedes eliminar tu propia cuenta activa de administrador.');
      return;
    }
    if (confirm(`¿Está seguro de eliminar definitivamente al usuario "${userToDelete.username}"?`)) {
      try {
        await deleteUser(userToDelete.id);
        await loadUsers();
      } catch (err: any) {
        alert(err.message || 'Error al eliminar usuario.');
      }
    }
  };

  // Filtered users
  const filteredUsers = usersList.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.username.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" />
            Gestión de Usuarios y Roles (RBAC)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Administración de cuentas de ingenieros, asignación de privilegios de acceso al CLI y control de credenciales.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={loadUsers}
            className="p-2 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            title="Refrescar Lista de Usuarios"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {currentUser.role === 'admin' && (
            <button
              onClick={() => {
                setShowCreateModal(true);
                handleRoleChange('net_engineer');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-cyan-600/30 transition-all whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              Crear Nuevo Usuario
            </button>
          )}
        </div>
      </div>

      {/* Overview Metric Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Total Usuarios Registrados</div>
          <div className="text-xl font-bold text-white mt-1 font-mono tabular-nums">{usersList.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Cuentas habilitadas en el sistema</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Administradores</div>
          <div className="text-xl font-bold text-cyan-400 mt-1 font-mono tabular-nums">
            {usersList.filter(u => u.role === 'admin').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Control total de la plataforma</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Ingenieros &amp; Operadores</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono tabular-nums">
            {usersList.filter(u => u.role === 'net_engineer' || u.role === 'operator').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Acceso interactivo a Web CLI</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Seguridad de Credenciales</div>
          <div className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>bcrypt + Salt 10</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Contraseñas encriptadas en reposo</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3.5 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por usuario, nombre completo o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-md pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-md px-2.5 py-2 focus:outline-none focus:border-cyan-500 text-xs"
          >
            <option value="all">Todos los Roles</option>
            <option value="admin">Administrador</option>
            <option value="net_engineer">Ingeniero de Redes</option>
            <option value="operator">Operador NOC</option>
            <option value="auditor">Auditor (Read-Only)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950 shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold">
              <th className="py-3 px-4">Usuario &amp; Nombre</th>
              <th className="py-3 px-4">Correo Electrónico</th>
              <th className="py-3 px-4">Rol Asignado</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4">Último Inicio de Sesión</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {filteredUsers.map((u) => {
              const isCurrent = u.id === currentUser.id;
              return (
                <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                  
                  {/* Username & Full Name */}
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-semibold text-white flex items-center gap-1.5">
                      <span>{u.username}</span>
                      {isCurrent && (
                        <span className="text-[10px] font-sans px-1.5 py-0.2 bg-cyan-950 border border-cyan-700/60 text-cyan-300 rounded">
                          Tú (Actual)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{u.name}</div>
                  </td>

                  {/* Email */}
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-slate-500" />
                      <span>{u.email}</span>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium font-mono ${
                      u.role === 'admin'
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-800/50'
                        : u.role === 'net_engineer'
                        ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/50'
                        : u.role === 'operator'
                        ? 'bg-blue-950/80 text-blue-300 border border-blue-800/50'
                        : 'bg-amber-950/80 text-amber-300 border border-amber-800/50'
                    }`}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    {u.status === 'suspended' ? (
                      <span className="inline-flex items-center gap-1 text-rose-400 font-medium text-[11px]">
                        <UserX className="w-3.5 h-3.5" />
                        Suspendido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Activo
                      </span>
                    )}
                  </td>

                  {/* Last Login */}
                  <td className="py-3.5 px-4 font-mono text-slate-400 tabular-nums">
                    {u.last_login ? (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{new Date(u.last_login).toLocaleString()}</span>
                      </div>
                    ) : (
                      <span className="text-slate-600">Nunca</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {currentUser.role === 'admin' && (
                        <>
                          {/* Toggle Active / Suspended */}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded transition-colors text-xs ${
                              u.status === 'suspended'
                                ? 'text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300'
                                : 'text-amber-400 hover:bg-amber-950/40 hover:text-amber-300'
                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                            title={u.status === 'suspended' ? 'Activar usuario' : 'Suspender usuario'}
                          >
                            {u.status === 'suspended' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                          </button>

                          {/* Edit User */}
                          <button
                            onClick={() => handleEditClick(u)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-850 rounded transition-colors"
                            title="Editar usuario o cambiar contraseña"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User */}
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={isCurrent}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Eliminar usuario definitivamente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>

                </tr>
              );
            })}

            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No se encontraron usuarios con los criterios de búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Crear Usuario */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Crear Nuevo Usuario</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="my-3 p-3 bg-rose-950/50 border border-rose-800 rounded text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 py-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Nombre de Usuario *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. javier.gomez"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Javier Gómez"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    placeholder="javier@enterprise.net"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Contraseña Inicial *</label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Rol de Acceso (RBAC) *</label>
                <select
                  value={newRole}
                  onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="net_engineer">Ingeniero de Redes (Gestión de equipos + Web CLI)</option>
                  <option value="operator">Operador NOC (Solo acceso a terminal interactiva)</option>
                  <option value="auditor">Auditor (Solo lectura de registros y auditoría)</option>
                  <option value="admin">Administrador (Control total + Creación de usuarios)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-2">Permisos Efectivos Asignados:</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  {allAvailablePermissions.map(p => {
                    const isChecked = newPermissions.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewPermissions(prev => [...prev, p.id]);
                            } else {
                              setNewPermissions(prev => prev.filter(x => x !== p.id));
                            }
                          }}
                          className="rounded border-slate-700 text-cyan-600 focus:ring-0 bg-slate-900"
                        />
                        <span className="text-[11px] text-slate-300">{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg text-xs shadow-sm"
                >
                  Registrar Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Usuario */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Editar Usuario: {editingUser.username}</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 py-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Rol de Acceso</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="admin">Administrador</option>
                    <option value="net_engineer">Ingeniero de Redes</option>
                    <option value="operator">Operador NOC</option>
                    <option value="auditor">Auditor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Estado de Cuenta</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="active">Activo (Habilitado)</option>
                    <option value="suspended">Suspendido (Bloqueado)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Restablecer Contraseña (Opcional)</label>
                  <input
                    type="password"
                    placeholder="Dejar vacío para mantener"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg text-xs shadow-sm"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
