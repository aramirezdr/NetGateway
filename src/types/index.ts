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
  action: 'SESSION_START' | 'SESSION_CLOSE' | 'COMMAND_EXEC' | 'CONFIG_CHANGE' | 'DEVICE_CREATE' | 'DEVICE_UPDATE' | 'DEVICE_DELETE' | 'CREDENTIAL_ACCESS';
  device_id?: string;
  device_hostname?: string;
  details: string;
  status: 'success' | 'denied' | 'failed';
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
