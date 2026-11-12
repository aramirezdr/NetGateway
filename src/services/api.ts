import type { Device, Credential, AuditLogEntry, User, UserRole, BackupMetadata, BackupScheduleConfig } from '../types/index.ts';

const TOKEN_KEY = 'netgateway_jwt_token';
const USER_KEY = 'netgateway_current_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function loginWithCredentials(username: string, password: string): Promise<{ token: string; user: User }> {
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Invalid login credentials' }));
    throw new Error(err.error || 'Authentication failed');
  }
  const data = await res.json();
  setStoredToken(data.token);
  setStoredUser(data.user);
  return data;
}


export async function fetchUsers(): Promise<User[]> {
  const res = await fetch('/api/v1/users', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch user directory');
  const data = await res.json();
  return data.users;
}

export async function createUser(data: {
  username: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  permissions?: string[];
}): Promise<User> {
  const res = await fetch('/api/v1/users', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create user' }));
    throw new Error(err.error || 'Failed to create user');
  }
  const json = await res.json();
  return json.user;
}

export async function updateUser(id: string, updates: Partial<User & { password?: string }>): Promise<User> {
  const res = await fetch(`/api/v1/users/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update user' }));
    throw new Error(err.error || 'Failed to update user');
  }
  const json = await res.json();
  return json.user;
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`/api/v1/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to delete user' }));
    throw new Error(err.error || 'Failed to delete user');
  }
}

export async function fetchDevices(filters?: { vendor?: string; connection_type?: string; status?: string; search?: string }): Promise<Device[]> {
  const params = new URLSearchParams();
  if (filters?.vendor) params.append('vendor', filters.vendor);
  if (filters?.connection_type) params.append('connection_type', filters.connection_type);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.search) params.append('search', filters.search);

  const res = await fetch(`/api/v1/devices?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch devices');
  const data = await res.json();
  return data.devices;
}

export async function createDevice(deviceData: Partial<Device>): Promise<Device> {
  const res = await fetch('/api/v1/devices', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(deviceData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create device' }));
    throw new Error(err.error || 'Failed to create device');
  }
  const data = await res.json();
  return data.device;
}

export async function bulkImportDevices(devices: Partial<Device>[]): Promise<{ count: number; devices: Device[]; errors?: string[] }> {
  const res = await fetch('/api/v1/devices/bulk', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ devices }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to import devices' }));
    throw new Error(err.error || 'Failed to import devices');
  }
  return await res.json();
}

export async function updateDevice(id: string, updates: Partial<Device>): Promise<Device> {
  const res = await fetch(`/api/v1/devices/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update device' }));
    throw new Error(err.error || 'Failed to update device');
  }
  const data = await res.json();
  return data.device;
}

export async function deleteDevice(id: string): Promise<void> {
  const res = await fetch(`/api/v1/devices/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to delete device' }));
    throw new Error(err.error || 'Failed to delete device');
  }
}

export async function pingDevice(id: string): Promise<{
  hostname: string;
  management_ip: string;
  status: string;
  transmitted: number;
  received: number;
  packet_loss_percent: number;
  rtt_ms: number;
  prober_timestamp: string;
}> {
  const res = await fetch(`/api/v1/devices/${id}/ping`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Ping failed');
  return res.json();
}

export async function fetchCredentials(): Promise<Credential[]> {
  const res = await fetch('/api/v1/credentials', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch credentials');
  const data = await res.json();
  return data.credentials;
}

export async function createCredential(data: { name: string; username: string; auth_type: string; secret: string; enable_secret?: string }): Promise<Credential> {
  const res = await fetch('/api/v1/credentials', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create credential' }));
    throw new Error(err.error || 'Failed to create credential');
  }
  const json = await res.json();
  return json.credential;
}

export async function updateCredential(id: string, data: { name?: string; username?: string; auth_type?: string; secret?: string; enable_secret?: string }): Promise<Credential> {
  const res = await fetch(`/api/v1/credentials/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update credential' }));
    throw new Error(err.error || 'Failed to update credential');
  }
  const json = await res.json();
  return json.credential;
}

export async function deleteCredential(id: string): Promise<void> {
  const res = await fetch(`/api/v1/credentials/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to delete credential' }));
    throw new Error(err.error || 'Failed to delete credential');
  }
}

export async function fetchAuditLogs(action?: string): Promise<AuditLogEntry[]> {
  const params = new URLSearchParams();
  if (action && action !== 'all') params.append('action', action);
  const res = await fetch(`/api/v1/audit/logs?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  const data = await res.json();
  return data.logs;
}

// ---------------- BACKUP & DISASTER RECOVERY CLIENT ----------------

export async function fetchBackups(): Promise<BackupMetadata[]> {
  const res = await fetch('/api/v1/backups', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Error al consultar lista de respaldos');
  const data = await res.json();
  return data.backups || [];
}

export async function createBackup(description?: string): Promise<{ message: string; backup: BackupMetadata }> {
  const res = await fetch('/api/v1/backups', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ description }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error al generar respaldo' }));
    throw new Error(err.error || 'Error al generar respaldo');
  }
  return await res.json();
}

export async function downloadBackupFile(filename: string): Promise<void> {
  const token = getStoredToken();
  const res = await fetch(`/api/v1/backups/${encodeURIComponent(filename)}/download`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    throw new Error('Error al descargar el archivo de respaldo');
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function uploadBackupFile(filename: string, content: string | object): Promise<{ message: string; backup: BackupMetadata }> {
  const res = await fetch('/api/v1/backups/upload', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ filename, content }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error al subir archivo de respaldo' }));
    throw new Error(err.error || 'Error al subir archivo de respaldo');
  }
  return await res.json();
}

export async function restoreBackup(filename: string, components?: string[]): Promise<{ message: string; details: any }> {
  const res = await fetch(`/api/v1/backups/${encodeURIComponent(filename)}/restore`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ components }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error durante la restauración del sistema' }));
    throw new Error(err.error || 'Error durante la restauración del sistema');
  }
  return await res.json();
}

export async function deleteBackup(filename: string): Promise<void> {
  const res = await fetch(`/api/v1/backups/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error al eliminar respaldo' }));
    throw new Error(err.error || 'Error al eliminar respaldo');
  }
}

export async function fetchBackupSchedule(): Promise<BackupScheduleConfig> {
  const res = await fetch('/api/v1/backups/schedule', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Error al consultar configuración de respaldos');
  const data = await res.json();
  return data.schedule;
}

export async function updateBackupSchedule(config: Partial<BackupScheduleConfig>): Promise<{ message: string; schedule: BackupScheduleConfig }> {
  const res = await fetch('/api/v1/backups/schedule', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error al actualizar programación' }));
    throw new Error(err.error || 'Error al actualizar programación');
  }
  return await res.json();
}

