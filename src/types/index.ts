export type VendorType = 'Cisco' | 'HP/Aruba' | 'Palo Alto' | 'Juniper' | 'OpenGear' | 'Linux';
export type ConnectionType = 'SSH' | 'Telnet' | 'Terminal Server';
export type DeviceStatus = 'online' | 'unreachable' | 'maintenance' | 'warning';
export type UserRole = 'admin' | 'net_engineer' | 'auditor' | 'operator';

export interface Device {
  id: string;
  hostname: string;
  management_ip: string;
  vendor: VendorType;
  model: string;
  os_version: string;
  connection_type: ConnectionType;
  port: number;
  terminal_line?: number;
  credentials_id: string;
  location: string;
  tags: string[];
  status: DeviceStatus;
  uptime?: string;
  last_seen?: string;
  description?: string;
  serial_number?: string;
  asset_id?: string; // Código de inventario asignado en la empresa como bien (e.g. ACT-2024-0012, CRIE-INV-4402)
}

export interface Credential {
  id: string;
  name: string;
  username: string;
  auth_type: 'password' | 'ssh_key';
  has_enable_secret: boolean;
  created_at: string;
  last_used: string;
  device_count?: number;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[];
  status?: 'active' | 'suspended';
  created_at?: string;
  last_login?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: 'SESSION_START' | 'SESSION_CLOSE' | 'COMMAND_EXEC' | 'CONFIG_CHANGE' | 'DEVICE_CREATE' | 'DEVICE_UPDATE' | 'DEVICE_DELETE' | 'CREDENTIAL_ACCESS' | 'BACKUP_CREATE' | 'BACKUP_RESTORE' | 'BACKUP_DELETE' | 'BACKUP_DOWNLOAD';
  device_id?: string;
  device_hostname?: string;
  details: string;
  status: 'success' | 'denied' | 'failed';
}

export interface BackupMetadata {
  id: string;
  filename: string;
  timestamp: string;
  size_bytes: number;
  size_formatted: string;
  created_by: string;
  description?: string;
  device_count: number;
  credential_count: number;
  user_count: number;
  audit_log_count: number;
  checksum: string;
  is_automatic?: boolean;
}

export interface BackupScheduleConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'hourly';
  time: string; // e.g. "02:00"
  retention_count: number; // e.g. 10
  last_run?: string;
  next_run?: string;
}

export interface BackupDataPayload {
  version: string;
  created_at: string;
  created_by: string;
  description?: string;
  is_automatic?: boolean;
  metadata: {
    system: string;
    node_version: string;
    platform: string;
    device_count: number;
    credential_count: number;
    user_count: number;
    audit_log_count: number;
  };
  devices: Device[];
  credentials: any[];
  users: any[];
  audit_logs: AuditLogEntry[];
}

export interface ActiveTerminalTab {
  tabId: string;
  deviceId: string;
  device: Device;
  connected: boolean;
  startTime: number;
  title: string;
}

export interface NetworkInterface {
  name: string;
  ip_address: string;
  subnet_mask: string;
  status: 'up' | 'down' | 'admin-down';
  protocol: 'up' | 'down';
  speed?: string;
  duplex?: string;
  description?: string;
}
