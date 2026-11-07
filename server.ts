import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import type { Device, Credential, AuditLogEntry, User, UserRole } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'netgateway-super-secret-enterprise-key-2026';
const AES_KEY = crypto.createHash('sha256').update(JWT_SECRET).digest();

app.use(express.json());

// Helper to encrypt secrets at rest
function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', AES_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

// In-Memory Database Store with enterprise data
let credentialsStore: (Credential & { encrypted_secret: string; enable_secret?: string })[] = [
  {
    id: 'cred-1',
    name: 'TACACS+ Core Engineering',
    username: 'netadmin',
    auth_type: 'password',
    has_enable_secret: true,
    encrypted_secret: encryptSecret('CiscoCoreSecure2026!'),
    enable_secret: encryptSecret('CiscoEnableSecret!'),
    created_at: '2026-01-15T08:00:00Z',
    last_used: '2026-11-06T10:14:00Z',
    device_count: 5,
  },
  {
    id: 'cred-2',
    name: 'PaloAlto Enterprise PKI Key',
    username: 'secops-admin',
    auth_type: 'ssh_key',
    has_enable_secret: false,
    encrypted_secret: encryptSecret('-----BEGIN OPENSSH PRIVATE KEY-----\nMOCK_KEY_DATA\n-----END OPENSSH PRIVATE KEY-----'),
    created_at: '2026-02-10T12:30:00Z',
    last_used: '2026-11-06T11:45:00Z',
    device_count: 2,
  },
  {
    id: 'cred-3',
    name: 'Aruba Comware Switch Admin',
    username: 'admin',
    auth_type: 'password',
    has_enable_secret: false,
    encrypted_secret: encryptSecret('ArubaCampusPass!'),
    created_at: '2026-03-01T09:15:00Z',
    last_used: '2026-11-05T18:20:00Z',
    device_count: 3,
  },
  {
    id: 'cred-4',
    name: 'Out-of-band Console Server Root',
    username: 'root',
    auth_type: 'password',
    has_enable_secret: false,
    encrypted_secret: encryptSecret('OpenGearOOB2026!'),
    created_at: '2026-01-10T14:00:00Z',
    last_used: '2026-11-06T09:00:00Z',
    device_count: 2,
  },
];

let devicesStore: Device[] = [
  {
    id: 'dev-cisco-core-01',
    hostname: 'US-EAST-CORE-R01',
    management_ip: '10.240.0.1',
    vendor: 'Cisco',
    model: 'Catalyst 9500-48Y4C',
    os_version: 'IOS-XE 17.9.4a',
    connection_type: 'SSH',
    port: 22,
    credentials_id: 'cred-1',
    location: 'DC-Ashburn-Row03-RackA',
    tags: ['Core', 'BGP', 'OSPF', 'Tier-1'],
    status: 'online',
    uptime: '142 days, 6 hours',
    last_seen: '2026-11-06T12:20:00Z',
    description: 'Datacenter core gateway router with redundant BGP upstreams',
    serial_number: 'FCW2348L091',
  },
  {
    id: 'dev-cisco-agg-02',
    hostname: 'US-EAST-AGG-SW02',
    management_ip: '10.240.10.2',
    vendor: 'Cisco',
    model: 'Catalyst 9300-48UXM',
    os_version: 'IOS-XE 17.6.5',
    connection_type: 'SSH',
    port: 22,
    credentials_id: 'cred-1',
    location: 'DC-Ashburn-Row03-RackB',
    tags: ['Aggregation', 'mGig', 'StackWise'],
    status: 'online',
    uptime: '98 days, 14 hours',
    last_seen: '2026-11-06T12:21:00Z',
    description: 'Multi-gigabit distribution switch stack with 10G uplinks',
    serial_number: 'FOC2402K117',
  },
  {
    id: 'dev-pa-fw-01',
    hostname: 'EDGE-PA5220-FW01',
    management_ip: '192.168.100.1',
    vendor: 'Palo Alto',
    model: 'PA-5220 Next-Gen Firewall',
    os_version: 'PAN-OS 11.0.2-h1',
    connection_type: 'SSH',
    port: 22,
    credentials_id: 'cred-2',
    location: 'Perimeter-Ashburn-Rack01',
    tags: ['Firewall', 'Security', 'GlobalProtect', 'DMZ'],
    status: 'online',
    uptime: '210 days, 1 hour',
    last_seen: '2026-11-06T12:22:00Z',
    description: 'High-throughput enterprise boundary firewall & SSL Decryption',
    serial_number: '012901004921',
  },
  {
    id: 'dev-aruba-campus-sw01',
    hostname: 'HQ-CAMPUS-ARUBA-SW01',
    management_ip: '10.100.20.5',
    vendor: 'HP/Aruba',
    model: '5406R zl2 Switch',
    os_version: 'Comware v7.1.070',
    connection_type: 'SSH',
    port: 22,
    credentials_id: 'cred-3',
    location: 'Campus-HQ-IDF2',
    tags: ['Access', 'PoE+', 'Comware', 'Voice-VLAN'],
    status: 'online',
    uptime: '45 days, 8 hours',
    last_seen: '2026-11-06T12:18:00Z',
    description: 'Modular chassis access switch for 200+ employee workstations',
    serial_number: 'SG49DX8012',
  },
  {
    id: 'dev-oob-term-srv01',
    hostname: 'DC1-OOB-TERMINAL-SRV01',
    management_ip: '172.16.1.50',
    vendor: 'OpenGear',
    model: 'CM7116 Console Server',
    os_version: 'OG-OS 4.12.1',
    connection_type: 'Terminal Server',
    port: 2001,
    terminal_line: 1,
    credentials_id: 'cred-4',
    location: 'DC-Ashburn-OOB-Rack',
    tags: ['Out-Of-Band', 'Console-Server', 'Recovery'],
    status: 'online',
    uptime: '380 days, 22 hours',
    last_seen: '2026-11-06T12:24:00Z',
    description: '16-Port Serial Console Server for Out-of-Band Disasters',
    serial_number: 'OG8892104',
  },
  {
    id: 'dev-cisco-edge-isr',
    hostname: 'BRANCH-ISR4451-R01',
    management_ip: '10.150.0.1',
    vendor: 'Cisco',
    model: 'ISR 4451-X',
    os_version: 'IOS-XE 17.3.4',
    connection_type: 'SSH',
    port: 22,
    credentials_id: 'cred-1',
    location: 'Branch-Frankfurt-Telco',
    tags: ['SD-WAN', 'IPsec', 'Branch-Edge'],
    status: 'warning',
    uptime: '12 days, 3 hours',
    last_seen: '2026-11-06T12:15:00Z',
    description: 'Frankfurt European Branch edge router with IPsec dual-tunnel',
    serial_number: 'FGL2119098',
  },
];

let auditLogs: AuditLogEntry[] = [
  {
    id: 'log-101',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    user: 'alex.rivera',
    action: 'SESSION_START',
    device_id: 'dev-cisco-core-01',
    device_hostname: 'US-EAST-CORE-R01',
    details: 'Initiated SSH session via Web Terminal Gateway (cols: 120, rows: 35)',
    status: 'success',
  },
  {
    id: 'log-102',
    timestamp: new Date(Date.now() - 3600000 * 1.8).toISOString(),
    user: 'alex.rivera',
    action: 'COMMAND_EXEC',
    device_id: 'dev-cisco-core-01',
    device_hostname: 'US-EAST-CORE-R01',
    details: 'Executed command: "show ip interface brief"',
    status: 'success',
  },
  {
    id: 'log-103',
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    user: 'alex.rivera',
    action: 'SESSION_CLOSE',
    device_id: 'dev-cisco-core-01',
    device_hostname: 'US-EAST-CORE-R01',
    details: 'Normal disconnect from terminal gateway (session duration: 18m 20s)',
    status: 'success',
  },
  {
    id: 'log-104',
    timestamp: new Date(Date.now() - 3600000 * 0.8).toISOString(),
    user: 'sarah.chen',
    action: 'DEVICE_UPDATE',
    device_id: 'dev-pa-fw-01',
    device_hostname: 'EDGE-PA5220-FW01',
    details: 'Updated tags: added "GlobalProtect", updated description',
    status: 'success',
  },
];

// User Store with hashed passwords
export interface StoredUser extends User {
  passwordHash: string;
}

const defaultSalt = bcrypt.genSaltSync(10);

let usersStore: StoredUser[] = [
  {
    id: 'usr-admin-1',
    username: 'admin',
    name: 'Alex Rivera (Lead Architect)',
    email: 'admin@enterprise.net',
    role: 'admin',
    permissions: ['device:read', 'device:write', 'device:delete', 'terminal:connect', 'credentials:read', 'credentials:write', 'audit:read', 'user:manage'],
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    last_login: new Date().toISOString(),
    passwordHash: bcrypt.hashSync('AdminPassword2026!', defaultSalt),
  },
  {
    id: 'usr-eng-2',
    username: 'marcus.vance',
    name: 'Marcus Vance',
    email: 'marcus.vance@enterprise.net',
    role: 'net_engineer',
    permissions: ['device:read', 'device:write', 'terminal:connect', 'credentials:read', 'audit:read'],
    status: 'active',
    created_at: '2026-02-15T10:00:00Z',
    last_login: new Date(Date.now() - 3600000 * 5).toISOString(),
    passwordHash: bcrypt.hashSync('Engineer2026!', defaultSalt),
  },
  {
    id: 'usr-ops-3',
    username: 'elena.rostova',
    name: 'Elena Rostova',
    email: 'elena.rostova@enterprise.net',
    role: 'operator',
    permissions: ['device:read', 'terminal:connect'],
    status: 'active',
    created_at: '2026-03-01T14:30:00Z',
    last_login: new Date(Date.now() - 3600000 * 24).toISOString(),
    passwordHash: bcrypt.hashSync('Operator2026!', defaultSalt),
  },
  {
    id: 'usr-audit-4',
    username: 'david.kim',
    name: 'David Kim',
    email: 'david.kim@compliance.org',
    role: 'auditor',
    permissions: ['device:read', 'audit:read'],
    status: 'active',
    created_at: '2026-03-10T09:00:00Z',
    last_login: new Date(Date.now() - 3600000 * 48).toISOString(),
    passwordHash: bcrypt.hashSync('Auditor2026!', defaultSalt),
  },
];

// Authentication Middleware
function authenticateToken(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Session token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser: any) => {
    if (err) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }

    // Verify account exists and is not suspended
    const existing = usersStore.find(u => u.id === decodedUser.id || u.username === decodedUser.username);
    if (!existing) {
      return res.status(401).json({ error: 'Unauthorized: User account not found' });
    }
    if (existing.status === 'suspended') {
      return res.status(403).json({ error: 'Forbidden: Account has been suspended by an administrator' });
    }

    (req as any).user = existing;
    next();
  });
}

// ---------------- REST API ROUTES ----------------

// Strict Enterprise Login: Username and Password Required
app.post('/api/v1/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const normalizedUser = username.trim().toLowerCase();
  const foundUser = usersStore.find(u => u.username.toLowerCase() === normalizedUser);

  if (!foundUser) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  if (foundUser.status === 'suspended') {
    return res.status(403).json({ error: 'Account has been suspended. Contact an administrator.' });
  }

  // Strict bcrypt cryptographic hash verification
  const isValidPassword = bcrypt.compareSync(password, foundUser.passwordHash);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Update last login
  foundUser.last_login = new Date().toISOString();

  // Audit login event
  auditLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: foundUser.username,
    action: 'SESSION_START',
    details: `User "${foundUser.username}" authenticated successfully (${foundUser.role})`,
    status: 'success',
  });

  const { passwordHash, ...cleanUser } = foundUser;
  const token = jwt.sign(cleanUser, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, user: cleanUser });
});

// Current user profile
app.get('/api/v1/auth/me', authenticateToken, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { passwordHash, ...cleanUser } = user;
  res.json({ user: cleanUser });
});

// ---------------- USER MANAGEMENT (Admin Only) ----------------
app.get('/api/v1/users', authenticateToken, (req: Request, res: Response) => {
  const safeUsers = usersStore.map(({ passwordHash, ...u }) => u);
  res.json({ users: safeUsers });
});

app.post('/api/v1/users', authenticateToken, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  if (currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only Administrator can create user accounts' });
  }

  const { username, name, email, password, role, permissions } = req.body;

  if (!username || !name || !email || !password || !role) {
    return res.status(400).json({ error: 'Username, name, email, password, and role are required' });
  }

  const cleanUsername = username.trim().toLowerCase();
  if (usersStore.some(u => u.username.toLowerCase() === cleanUsername)) {
    return res.status(400).json({ error: `Username "${cleanUsername}" is already taken` });
  }

  const defaultPermissionsByRole: Record<UserRole, string[]> = {
    admin: ['device:read', 'device:write', 'device:delete', 'terminal:connect', 'credentials:read', 'credentials:write', 'audit:read', 'user:manage'],
    net_engineer: ['device:read', 'device:write', 'terminal:connect', 'credentials:read', 'audit:read'],
    operator: ['device:read', 'terminal:connect'],
    auditor: ['device:read', 'audit:read'],
  };

  const newUser: StoredUser = {
    id: `usr-${Date.now().toString(36)}`,
    username: cleanUsername,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: role as UserRole,
    permissions: Array.isArray(permissions) && permissions.length > 0 ? permissions : defaultPermissionsByRole[role as UserRole] || ['device:read'],
    status: 'active',
    created_at: new Date().toISOString(),
    last_login: undefined,
    passwordHash: bcrypt.hashSync(password, 10),
  };

  usersStore.unshift(newUser);

  // Audit
  auditLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: currentUser.username,
    action: 'DEVICE_CREATE',
    details: `Created new user account: "${newUser.username}" (${newUser.role})`,
    status: 'success',
  });

  const { passwordHash, ...cleanUser } = newUser;
  res.status(201).json({ user: cleanUser });
});

app.put('/api/v1/users/:id', authenticateToken, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  if (currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only Administrator can modify user accounts' });
  }

  const idx = usersStore.findIndex(u => u.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const target = usersStore[idx];
  const { name, email, role, status, password, permissions } = req.body;

  if (name) target.name = name.trim();
  if (email) target.email = email.trim().toLowerCase();
  if (role) target.role = role as UserRole;
  if (status) target.status = status;
  if (permissions) target.permissions = permissions;
  if (password && password.trim()) {
    target.passwordHash = bcrypt.hashSync(password.trim(), 10);
  }

  auditLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: currentUser.username,
    action: 'DEVICE_UPDATE',
    details: `Updated user account parameters for "${target.username}"`,
    status: 'success',
  });

  const { passwordHash, ...cleanUser } = target;
  res.json({ user: cleanUser });
});

app.delete('/api/v1/users/:id', authenticateToken, (req: Request, res: Response) => {
  const currentUser: User = (req as any).user;
  if (currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only Administrator can delete user accounts' });
  }

  if (currentUser.id === req.params.id) {
    return res.status(400).json({ error: 'Cannot delete your own active administrator account' });
  }

  const target = usersStore.find(u => u.id === req.params.id);
  if (!target) {
    return res.status(404).json({ error: 'User not found' });
  }

  usersStore = usersStore.filter(u => u.id !== req.params.id);

  auditLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: currentUser.username,
    action: 'DEVICE_DELETE',
    details: `Deleted user account: "${target.username}"`,
    status: 'success',
  });

  res.json({ message: 'User deleted successfully' });
});

// Device Inventory CRUD
app.get('/api/v1/devices', authenticateToken, (req: Request, res: Response) => {
  const { vendor, connection_type, status, search } = req.query;
  let filtered = [...devicesStore];

  if (vendor && vendor !== 'all') {
    filtered = filtered.filter(d => d.vendor === vendor);
  }
  if (connection_type && connection_type !== 'all') {
    filtered = filtered.filter(d => d.connection_type === connection_type);
  }
  if (status && status !== 'all') {
    filtered = filtered.filter(d => d.status === status);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      d =>
        d.hostname.toLowerCase().includes(q) ||
        d.management_ip.includes(q) ||
        d.model.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q) ||
        d.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  res.json({ devices: filtered, count: filtered.length });
});

app.get('/api/v1/devices/:id', authenticateToken, (req: Request, res: Response) => {
  const dev = devicesStore.find(d => d.id === req.params.id);
  if (!dev) {
    return res.status(404).json({ error: 'Device not found' });
  }
  res.json({ device: dev });
});

app.post('/api/v1/devices', authenticateToken, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  if (user && user.role === 'auditor') {
    return res.status(403).json({ error: 'Forbidden: Auditor role cannot create devices' });
  }

  const { hostname, management_ip, vendor, model, os_version, connection_type, port, terminal_line, credentials_id, location, tags, description } = req.body;

  if (!hostname || !management_ip || !vendor || !model) {
    return res.status(400).json({ error: 'Missing required device parameters (hostname, IP, vendor, model)' });
  }

  const newDevice: Device = {
    id: `dev-${Date.now().toString(36)}`,
    hostname: hostname.trim().toUpperCase(),
    management_ip: management_ip.trim(),
    vendor,
    model,
    os_version: os_version || 'v1.0',
    connection_type: connection_type || 'SSH',
    port: Number(port) || 22,
    terminal_line: terminal_line ? Number(terminal_line) : undefined,
    credentials_id: credentials_id || 'cred-1',
    location: location || 'Default DC',
    tags: Array.isArray(tags) ? tags : ['Production'],
    status: 'online',
    uptime: '1 day, 0 hours',
    last_seen: new Date().toISOString(),
    description: description || '',
  };

  devicesStore.unshift(newDevice);

  // Audit
  auditLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: user.username,
    action: 'DEVICE_CREATE',
    device_id: newDevice.id,
    device_hostname: newDevice.hostname,
    details: `Created new inventory asset: ${newDevice.hostname} (${newDevice.management_ip})`,
    status: 'success',
  });

  res.status(201).json({ device: newDevice });
});

app.post('/api/v1/devices/bulk', authenticateToken, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  if (user && user.role === 'auditor') {
    return res.status(403).json({ error: 'Forbidden: Auditor role cannot import devices' });
  }

  const { devices } = req.body;
  if (!Array.isArray(devices) || devices.length === 0) {
    return res.status(400).json({ error: 'Payload must contain a non-empty "devices" array' });
  }

  const createdDevices: Device[] = [];
  const errors: string[] = [];

  for (let i = 0; i < devices.length; i++) {
    const d = devices[i];
    if (!d.hostname || !d.management_ip || !d.vendor || !d.model) {
      errors.push(`Row ${i + 1}: Missing required fields (hostname, management_ip, vendor, model)`);
      continue;
    }

    const newDevice: Device = {
      id: `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      hostname: String(d.hostname).trim().toUpperCase(),
      management_ip: String(d.management_ip).trim(),
      vendor: d.vendor,
      model: String(d.model).trim(),
      os_version: d.os_version ? String(d.os_version).trim() : 'v1.0',
      connection_type: d.connection_type || 'SSH',
      port: Number(d.port) || 22,
      terminal_line: d.terminal_line ? Number(d.terminal_line) : undefined,
      credentials_id: d.credentials_id || 'cred-1',
      location: d.location ? String(d.location).trim() : 'Main DC',
      tags: Array.isArray(d.tags) ? d.tags : typeof d.tags === 'string' ? d.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : ['Imported'],
      status: 'online',
      uptime: '1 day, 0 hours',
      last_seen: new Date().toISOString(),
      description: d.description ? String(d.description).trim() : 'Bulk imported asset',
    };

    devicesStore.unshift(newDevice);
    createdDevices.push(newDevice);
  }

  if (createdDevices.length > 0) {
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: user.username,
      action: 'DEVICE_CREATE',
      details: `Bulk imported ${createdDevices.length} network inventory assets (${createdDevices.map(d => d.hostname).slice(0, 5).join(', ')}${createdDevices.length > 5 ? '...' : ''})`,
      status: 'success',
    });
  }

  res.status(201).json({
    count: createdDevices.length,
    devices: createdDevices,
    errors: errors.length > 0 ? errors : undefined,
  });
});

app.put('/api/v1/devices/:id', authenticateToken, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  if (user && user.role === 'auditor') {
    return res.status(403).json({ error: 'Forbidden: Auditor role cannot modify devices' });
  }

  const idx = devicesStore.findIndex(d => d.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Device not found' });
  }

  devicesStore[idx] = {
    ...devicesStore[idx],
    ...req.body,
    id: devicesStore[idx].id, // Prevent ID override
  };

  auditLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: user.username,
    action: 'DEVICE_UPDATE',
    device_id: devicesStore[idx].id,
    device_hostname: devicesStore[idx].hostname,
    details: `Updated device parameters for ${devicesStore[idx].hostname}`,
    status: 'success',
  });

  res.json({ device: devicesStore[idx] });
});

app.delete('/api/v1/devices/:id', authenticateToken, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  if (user && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only Administrator can decommission inventory assets' });
  }

  const dev = devicesStore.find(d => d.id === req.params.id);
  if (!dev) {
    return res.status(404).json({ error: 'Device not found' });
  }

  devicesStore = devicesStore.filter(d => d.id !== req.params.id);

  auditLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: user.username,
    action: 'DEVICE_DELETE',
    device_id: dev.id,
    device_hostname: dev.hostname,
    details: `Decommissioned asset: ${dev.hostname} (${dev.management_ip})`,
    status: 'success',
  });

  res.json({ message: 'Device deleted successfully' });
});

// Ping / Connectivity Check
app.post('/api/v1/devices/:id/ping', authenticateToken, (req: Request, res: Response) => {
  const dev = devicesStore.find(d => d.id === req.params.id);
  if (!dev) {
    return res.status(404).json({ error: 'Device not found' });
  }

  // Simulate realistic network latency with slight jitter
  const baseLatency = dev.vendor === 'Cisco' ? 1.4 : dev.vendor === 'Palo Alto' ? 2.1 : 0.8;
  const rtt = +(baseLatency + Math.random() * 0.9).toFixed(2);
  const packetLoss = dev.status === 'unreachable' ? 100 : dev.status === 'warning' ? 20 : 0;

  res.json({
    hostname: dev.hostname,
    management_ip: dev.management_ip,
    status: packetLoss === 100 ? 'unreachable' : 'online',
    transmitted: 5,
    received: packetLoss === 100 ? 0 : packetLoss === 20 ? 4 : 5,
    packet_loss_percent: packetLoss,
    rtt_ms: rtt,
    prober_timestamp: new Date().toISOString(),
  });
});

// Credentials Vault
app.get('/api/v1/credentials', authenticateToken, (req: Request, res: Response) => {
  // Never return raw or decrypted secrets to client
  const safeCreds = credentialsStore.map(c => ({
    id: c.id,
    name: c.name,
    username: c.username,
    auth_type: c.auth_type,
    has_enable_secret: c.has_enable_secret,
    created_at: c.created_at,
    last_used: c.last_used,
    device_count: devicesStore.filter(d => d.credentials_id === c.id).length,
  }));
  res.json({ credentials: safeCreds });
});

app.post('/api/v1/credentials', authenticateToken, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  if (user && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only Administrator can store vault credentials' });
  }

  const { name, username, auth_type, secret, enable_secret } = req.body;
  if (!name || !username || !secret) {
    return res.status(400).json({ error: 'Name, username, and secret are required' });
  }

  const newCred: Credential & { encrypted_secret: string; enable_secret?: string } = {
    id: `cred-${Date.now().toString(36)}`,
    name,
    username,
    auth_type: auth_type || 'password',
    has_enable_secret: Boolean(enable_secret),
    encrypted_secret: encryptSecret(secret),
    enable_secret: enable_secret ? encryptSecret(enable_secret) : undefined,
    created_at: new Date().toISOString(),
    last_used: new Date().toISOString(),
    device_count: 0,
  };

  credentialsStore.push(newCred);

  auditLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: user.username,
    action: 'CREDENTIAL_ACCESS',
    details: `Created vault credential profile: "${newCred.name}" (username: ${newCred.username})`,
    status: 'success',
  });

  res.status(201).json({
    credential: {
      id: newCred.id,
      name: newCred.name,
      username: newCred.username,
      auth_type: newCred.auth_type,
      has_enable_secret: newCred.has_enable_secret,
      created_at: newCred.created_at,
      last_used: newCred.last_used,
    },
  });
});

app.put('/api/v1/credentials/:id', authenticateToken, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  if (user && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only Administrator can update vault credentials' });
  }

  const idx = credentialsStore.findIndex(c => c.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Credential not found' });
  }

  const { name, username, auth_type, secret, enable_secret } = req.body;
  const target = credentialsStore[idx];

  if (name) target.name = name.trim();
  if (username) target.username = username.trim();
  if (auth_type) target.auth_type = auth_type;
  if (secret && secret.trim()) {
    target.encrypted_secret = encryptSecret(secret.trim());
  }
  if (enable_secret !== undefined) {
    target.has_enable_secret = Boolean(enable_secret && enable_secret.trim());
    target.enable_secret = enable_secret && enable_secret.trim() ? encryptSecret(enable_secret.trim()) : undefined;
  }
  target.last_used = new Date().toISOString();

  auditLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: user.username,
    action: 'CREDENTIAL_ACCESS',
    details: `Updated vault credential profile: "${target.name}" (username: ${target.username})`,
    status: 'success',
  });

  res.json({
    credential: {
      id: target.id,
      name: target.name,
      username: target.username,
      auth_type: target.auth_type,
      has_enable_secret: target.has_enable_secret,
      created_at: target.created_at,
      last_used: target.last_used,
    },
  });
});

app.delete('/api/v1/credentials/:id', authenticateToken, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  if (user && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only Administrator can delete vault credentials' });
  }

  const target = credentialsStore.find(c => c.id === req.params.id);
  if (!target) {
    return res.status(404).json({ error: 'Credential not found' });
  }

  credentialsStore = credentialsStore.filter(c => c.id !== req.params.id);

  auditLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: user.username,
    action: 'CREDENTIAL_ACCESS',
    details: `Deleted vault credential profile: "${target.name}"`,
    status: 'success',
  });

  res.json({ message: 'Credential deleted successfully' });
});

// Audit Logs
app.get('/api/v1/audit/logs', authenticateToken, (req: Request, res: Response) => {
  const { action, limit = 50 } = req.query;
  let filtered = [...auditLogs];
  if (action && action !== 'all') {
    filtered = filtered.filter(l => l.action === action);
  }
  res.json({ logs: filtered.slice(0, Number(limit)) });
});

// ---------------- INTERACTIVE WEB TERMINAL GATEWAY (WebSocket) ----------------
const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  const pathname = url.pathname;

  // Path format: /api/v1/ws/terminal/:deviceId
  const match = pathname.match(/^\/api\/v1\/ws\/terminal\/([a-zA-Z0-9_-]+)$/);
  if (!match) {
    socket.destroy();
    return;
  }

  const deviceId = match[1];
  const token = url.searchParams.get('token');

  // Strictly verify JWT token (No unauthenticated fallback)
  if (!token) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  let user: User;
  try {
    user = jwt.verify(token, JWT_SECRET) as User;
  } catch (err) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  const existingAccount = usersStore.find(u => u.id === user.id || u.username === user.username);
  if (!existingAccount || existingAccount.status === 'suspended') {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }

  // RBAC Permission check: Auditor role cannot start interactive terminal sessions
  if (user.role === 'auditor') {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }

  const device = devicesStore.find(d => d.id === deviceId);
  if (!device) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, ws => {
    wss.emit('connection', ws, request, { device, user });
  });
});

// ANSI Colors & VT100 sequences
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgBlue: '\x1b[44m',
  clearScreen: '\x1b[2J\x1b[H',
};

// Network OS Emulation State Machine for each interactive session
class DeviceCliSession {
  private ws: WebSocket;
  private device: Device;
  private user: User;
  private promptMode: 'user' | 'priv' | 'config' | 'config-if' | 'password-prompt';
  private currentLine: string = '';
  private currentInterface: string = 'GigabitEthernet0/0/0';
  private history: string[] = [];
  private historyIndex: number = -1;
  private isClosed: boolean = false;

  constructor(ws: WebSocket, device: Device, user: User) {
    this.ws = ws;
    this.device = device;
    this.user = user;
    this.promptMode = this.device.vendor === 'HP/Aruba' || this.device.vendor === 'Palo Alto' ? 'user' : 'priv';
    this.initialize();
  }

  private send(text: string) {
    if (!this.isClosed && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(text);
    }
  }

  private sendLine(text: string = '') {
    this.send(text + '\r\n');
  }

  private getPrompt(): string {
    const host = this.device.hostname;
    if (this.device.vendor === 'Cisco') {
      if (this.promptMode === 'user') return `${host}> `;
      if (this.promptMode === 'priv') return `${host}# `;
      if (this.promptMode === 'config') return `${host}(config)# `;
      if (this.promptMode === 'config-if') return `${host}(config-if)# `;
      if (this.promptMode === 'password-prompt') return `Password: `;
    } else if (this.device.vendor === 'HP/Aruba') {
      if (this.promptMode === 'config') return `[${host}] `;
      return `<${host}> `;
    } else if (this.device.vendor === 'Palo Alto') {
      if (this.promptMode === 'config') return `admin@${host}# `;
      return `admin@${host}> `;
    } else if (this.device.connection_type === 'Terminal Server') {
      return `Console-Pod-Line${this.device.terminal_line || 1}> `;
    }
    return `${host}# `;
  }

  private initialize() {
    this.send(ANSI.clearScreen);
    
    // Gateway banner
    this.sendLine(`${ANSI.cyan}${ANSI.bold}╔══════════════════════════════════════════════════════════════════════════╗${ANSI.reset}`);
    this.sendLine(`${ANSI.cyan}${ANSI.bold}║       NetGateway Interactive Web Terminal Bridge (asyncssh / PTY)        ║${ANSI.reset}`);
    this.sendLine(`${ANSI.cyan}${ANSI.bold}╚══════════════════════════════════════════════════════════════════════════╝${ANSI.reset}`);
    this.sendLine(`${ANSI.gray}Target Host:    ${ANSI.white}${this.device.hostname} (${this.device.management_ip}:${this.device.port})${ANSI.reset}`);
    this.sendLine(`${ANSI.gray}Vendor/OS:      ${ANSI.white}${this.device.vendor} [${this.device.os_version}]${ANSI.reset}`);
    this.sendLine(`${ANSI.gray}Protocol:       ${ANSI.white}${this.device.connection_type} (PTY Pseudo-Terminal Alloc)${ANSI.reset}`);
    this.sendLine(`${ANSI.gray}Authenticated:  ${ANSI.green}${this.user.name} (${this.user.role})${ANSI.reset}`);
    this.sendLine(`${ANSI.gray}Cipher Suite:   ${ANSI.white}chacha20-poly1305@openssh.com / curve25519-sha256${ANSI.reset}`);
    this.sendLine(`${ANSI.gray}Connected At:   ${ANSI.white}${new Date().toUTCString()}${ANSI.reset}`);
    this.sendLine('');

    if (this.device.connection_type === 'Terminal Server') {
      this.sendLine(`${ANSI.yellow}* Connecting to Out-Of-Band Terminal Server Port ${this.device.port} (Line ${this.device.terminal_line || 1})...${ANSI.reset}`);
      this.sendLine(`${ANSI.gray}Escape character is '^]' or 'Ctrl+Shift+6 x'${ANSI.reset}`);
      this.sendLine(`${ANSI.green}[Line Active - Console stream ready]${ANSI.reset}`);
      this.sendLine('');
    } else if (this.device.vendor === 'Cisco') {
      this.sendLine(`${ANSI.bold}*************************************************************************${ANSI.reset}`);
      this.sendLine(`${ANSI.bold}* UNLICENSED OR UNAUTHORIZED ACCESS TO THIS NETWORK DEVICE IS PROHIBITED  *${ANSI.reset}`);
      this.sendLine(`${ANSI.bold}* ALL SESSIONS ARE MONITORED AND LOGGED BY ENTERPRISE AUDIT COMPLIANCE *${ANSI.reset}`);
      this.sendLine(`${ANSI.bold}*************************************************************************${ANSI.reset}`);
      this.sendLine('');
      this.sendLine(`Last login: Fri Nov  6 10:14:22 2026 from 10.240.254.12`);
      this.sendLine('');
    } else if (this.device.vendor === 'Palo Alto') {
      this.sendLine(`Palo Alto Networks PA-5220 - PAN-OS 11.0.2-h1`);
      this.sendLine(`Management IP: ${this.device.management_ip}`);
      this.sendLine('');
    } else if (this.device.vendor === 'HP/Aruba') {
      this.sendLine(`Hewlett Packard Enterprise Comware Software, Version 7.1.070`);
      this.sendLine(`Copyright (c) 2010-2026 Hewlett Packard Enterprise Development LP`);
      this.sendLine('');
    }

    this.send(this.getPrompt());

    // Record session start into audit log
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: this.user.username,
      action: 'SESSION_START',
      device_id: this.device.id,
      device_hostname: this.device.hostname,
      details: `Opened ${this.device.connection_type} terminal session to ${this.device.hostname} (${this.device.management_ip})`,
      status: 'success',
    });
  }

  public handleData(data: string) {
    for (let i = 0; i < data.length; i++) {
      const char = data[i];

      // Handle Enter (\r or \n)
      if (char === '\r' || char === '\n') {
        this.sendLine();
        const cmd = this.currentLine.trim();
        this.currentLine = '';

        if (cmd) {
          this.history.push(cmd);
          this.historyIndex = this.history.length;
          this.executeCommand(cmd);
        } else {
          this.send(this.getPrompt());
        }
        continue;
      }

      // Handle Backspace (\x7f or \b)
      if (char === '\x7f' || char === '\b') {
        if (this.currentLine.length > 0) {
          this.currentLine = this.currentLine.slice(0, -1);
          this.send('\b \b'); // erase character visually
        }
        continue;
      }

      // Handle Ctrl+C (\x03)
      if (char === '\x03') {
        this.sendLine('^C');
        this.currentLine = '';
        this.send(this.getPrompt());
        continue;
      }

      // Handle Ctrl+L (\x0c) - Clear screen
      if (char === '\x0c') {
        this.send(ANSI.clearScreen);
        this.send(this.getPrompt() + this.currentLine);
        continue;
      }

      // Handle Tab (\t) - Autocomplete
      if (char === '\t') {
        this.handleAutocomplete();
        continue;
      }

      // Handle Escape sequences (Arrows, etc.)
      if (char === '\x1b' && data[i + 1] === '[') {
        const arrow = data[i + 2];
        i += 2;
        if (arrow === 'A') {
          // UP Arrow
          if (this.history.length > 0 && this.historyIndex > 0) {
            this.historyIndex--;
            this.replaceCurrentLine(this.history[this.historyIndex]);
          }
        } else if (arrow === 'B') {
          // DOWN Arrow
          if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.replaceCurrentLine(this.history[this.historyIndex]);
          } else {
            this.historyIndex = this.history.length;
            this.replaceCurrentLine('');
          }
        }
        continue;
      }

      // Regular printable character
      if (char >= ' ' && char <= '~') {
        this.currentLine += char;
        this.send(char);
      }
    }
  }

  private replaceCurrentLine(newLine: string) {
    // Erase old line
    while (this.currentLine.length > 0) {
      this.send('\b \b');
      this.currentLine = this.currentLine.slice(0, -1);
    }
    // Write new line
    this.currentLine = newLine;
    this.send(newLine);
  }

  private handleAutocomplete() {
    const tokens = this.currentLine.split(' ');
    const lastToken = tokens[tokens.length - 1].toLowerCase();
    
    const possibleCommands = [
      'show', 'interface', 'running-config', 'ip', 'route', 'brief', 'version', 'vlan',
      'configure', 'terminal', 'enable', 'disable', 'exit', 'end', 'ping', 'traceroute',
      'write', 'memory', 'reload', 'display', 'current-configuration', 'system-view', 'quit',
      'commit', 'set'
    ];

    const matches = possibleCommands.filter(c => c.startsWith(lastToken));
    if (matches.length === 1) {
      const completion = matches[0].slice(lastToken.length);
      this.currentLine += completion;
      this.send(completion);
    } else if (matches.length > 1) {
      this.sendLine();
      this.sendLine(matches.join('   '));
      this.send(this.getPrompt() + this.currentLine);
    }
  }

  private executeCommand(rawCmd: string) {
    const cmd = rawCmd.trim();
    const lower = cmd.toLowerCase();

    // Audit command execution
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: this.user.username,
      action: 'COMMAND_EXEC',
      device_id: this.device.id,
      device_hostname: this.device.hostname,
      details: `Executed CLI command: "${cmd}"`,
      status: 'success',
    });

    // Check vendor specific or general commands
    if (lower === 'exit' || lower === 'quit') {
      if (this.promptMode === 'config-if') {
        this.promptMode = 'config';
        this.send(this.getPrompt());
        return;
      }
      if (this.promptMode === 'config') {
        this.promptMode = this.device.vendor === 'HP/Aruba' ? 'user' : 'priv';
        this.send(this.getPrompt());
        return;
      }
      this.sendLine(`${ANSI.gray}[Connection to ${this.device.hostname} closed by foreign host]${ANSI.reset}`);
      this.isClosed = true;
      this.ws.close();
      return;
    }

    if (lower === 'end') {
      this.promptMode = 'priv';
      this.send(this.getPrompt());
      return;
    }

    if (lower === '?' || lower === 'help') {
      this.showHelp();
      this.send(this.getPrompt());
      return;
    }

    if (lower === 'clear' || lower === 'cls') {
      this.send(ANSI.clearScreen);
      this.send(this.getPrompt());
      return;
    }

    // Cisco Specific Handlers
    if (this.device.vendor === 'Cisco') {
      this.handleCiscoCommand(cmd, lower);
      return;
    }

    // HP / Aruba Comware Specific Handlers
    if (this.device.vendor === 'HP/Aruba') {
      this.handleComwareCommand(cmd, lower);
      return;
    }

    // Palo Alto Specific Handlers
    if (this.device.vendor === 'Palo Alto') {
      this.handlePaloAltoCommand(cmd, lower);
      return;
    }

    // Terminal Server Out-of-band Handlers
    this.handleGenericCommand(cmd, lower);
  }

  private handleCiscoCommand(cmd: string, lower: string) {
    if (lower === 'enable' || lower === 'en') {
      this.promptMode = 'priv';
      this.send(this.getPrompt());
      return;
    }
    if (lower === 'disable') {
      this.promptMode = 'user';
      this.send(this.getPrompt());
      return;
    }
    if (lower === 'configure terminal' || lower === 'conf t') {
      this.promptMode = 'config';
      this.sendLine('Enter configuration commands, one per line.  End with CNTL/Z.');
      this.send(this.getPrompt());
      return;
    }
    if (lower.startsWith('interface ') || lower.startsWith('int ')) {
      const iface = cmd.split(' ')[1] || 'GigabitEthernet0/0/0';
      this.currentInterface = iface;
      this.promptMode = 'config-if';
      this.send(this.getPrompt());
      return;
    }
    if (lower.startsWith('ip address ') || lower === 'no shutdown' || lower === 'shutdown') {
      this.send(this.getPrompt());
      return;
    }
    if (lower === 'show ip interface brief' || lower === 'sh ip int br' || lower === 'sh ip int brief') {
      this.sendLine('Interface              IP-Address      OK? Method Status                Protocol');
      this.sendLine('GigabitEthernet0/0/0   10.240.0.1      YES NVRAM  up                    up      ');
      this.sendLine('GigabitEthernet0/0/1   10.240.10.1     YES NVRAM  up                    up      ');
      this.sendLine('GigabitEthernet0/0/2   192.168.100.2   YES NVRAM  up                    up      ');
      this.sendLine('GigabitEthernet0/0/3   unassigned      YES NVRAM  administratively down down    ');
      this.sendLine('Loopback0              10.255.255.1    YES NVRAM  up                    up      ');
      this.sendLine('Vlan1                  unassigned      YES unset  down                  down    ');
      this.send(this.getPrompt());
      return;
    }
    if (lower === 'show running-config' || lower === 'sh run') {
      this.sendLine('Building configuration...');
      this.sendLine('');
      this.sendLine('Current configuration : 4892 bytes');
      this.sendLine('! Last configuration change at 10:14:22 UTC Fri Nov 6 2026 by netadmin');
      this.sendLine('version 17.9');
      this.sendLine('service timestamps debug datetime msec');
      this.sendLine('service timestamps log datetime msec');
      this.sendLine('service password-encryption');
      this.sendLine('!');
      this.sendLine(`hostname ${this.device.hostname}`);
      this.sendLine('!');
      this.sendLine('ip routing');
      this.sendLine('ip domain name enterprise.net');
      this.sendLine('!');
      this.sendLine('interface GigabitEthernet0/0/0');
      this.sendLine(' description Uplink to Spine-01 [100G]');
      this.sendLine(' ip address 10.240.0.1 255.255.255.252');
      this.sendLine(' ip mtu 9192');
      this.sendLine('!');
      this.sendLine('router bgp 65001');
      this.sendLine(' bgp log-neighbor-changes');
      this.sendLine(' neighbor 10.240.0.2 remote-as 65000');
      this.sendLine(' neighbor 10.240.0.2 description BGP-PEER-SPINE-01');
      this.sendLine('!');
      this.sendLine('line vty 0 4');
      this.sendLine(' transport input ssh');
      this.sendLine(' login authentication default');
      this.sendLine('end');
      this.send(this.getPrompt());
      return;
    }
    if (lower === 'show version' || lower === 'sh ver') {
      this.sendLine(`Cisco IOS XE Software, Version 17.09.04a`);
      this.sendLine(`Cisco IOS Software [Cupertino], Catalyst L3 Switch Software (CAT9K_IOSXE), Version 17.9.4a, RELEASE SOFTWARE (fc2)`);
      this.sendLine(`Technical Support: http://www.cisco.com/techsupport`);
      this.sendLine(`Compiled Fri 18-Aug-26 14:11 by mcpre`);
      this.sendLine('');
      this.sendLine(`ROM: IOS-XE ROMMON`);
      this.sendLine(`${this.device.hostname} uptime is 142 days, 6 hours, 28 minutes`);
      this.sendLine(`Uptime for this control processor is 142 days, 6 hours, 31 minutes`);
      this.sendLine(`System returned to ROM by reload`);
      this.sendLine(`System image file is "bootflash:packages.conf"`);
      this.sendLine(`Last reload reason: LocalSoft`);
      this.sendLine('');
      this.sendLine(`cisco ${this.device.model} (X86) processor with 16777216K bytes of physical memory.`);
      this.sendLine(`Processor board ID ${this.device.serial_number || 'FCW2348L091'}`);
      this.sendLine(`48 Virtual Ethernet interfaces`);
      this.sendLine(`48 Gigabit Ethernet interfaces`);
      this.sendLine(`4 100-Gigabit Ethernet interfaces`);
      this.send(this.getPrompt());
      return;
    }
    if (lower.startsWith('ping ')) {
      const target = cmd.split(' ')[1] || '8.8.8.8';
      this.sendLine(`Type escape sequence to abort.`);
      this.sendLine(`Sending 5, 100-byte ICMP Echos to ${target}, timeout is 2 seconds:`);
      this.sendLine(`!!!!!`);
      this.sendLine(`Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms`);
      this.send(this.getPrompt());
      return;
    }
    if (lower.startsWith('traceroute ') || lower.startsWith('trace ')) {
      const target = cmd.split(' ')[1] || '10.240.254.1';
      this.sendLine(`Type escape sequence to abort.`);
      this.sendLine(`Tracing the route to ${target}`);
      this.sendLine(`VRF info: (vrf in name/id, vrf out name/id)`);
      this.sendLine(`  1 10.240.0.2 1 msec 1 msec 1 msec`);
      this.sendLine(`  2 10.240.100.1 2 msec 1 msec 2 msec`);
      this.sendLine(`  3 ${target} 2 msec 2 msec 3 msec`);
      this.send(this.getPrompt());
      return;
    }
    if (lower === 'write memory' || lower === 'wr' || lower === 'copy run start') {
      this.sendLine('Building configuration...');
      this.sendLine('[OK]');
      this.send(this.getPrompt());
      return;
    }

    // Default unrecognized
    this.sendLine(`% Invalid input detected at '^' marker.`);
    this.sendLine(`       ^`);
    this.send(this.getPrompt());
  }

  private handleComwareCommand(cmd: string, lower: string) {
    if (lower === 'system-view' || lower === 'sys') {
      this.promptMode = 'config';
      this.sendLine(`System View: return to User View with Ctrl+Z.`);
      this.send(this.getPrompt());
      return;
    }
    if (lower === 'display current-configuration' || lower === 'dis cur') {
      this.sendLine('#');
      this.sendLine(' version 7.1.070, Release 2418P06');
      this.sendLine(` sysname ${this.device.hostname}`);
      this.sendLine('#');
      this.sendLine('irf mac-address persistent timer');
      this.sendLine('irf auto-update enable');
      this.sendLine('#');
      this.sendLine('vlan 1');
      this.sendLine('vlan 10');
      this.sendLine(' description User-Workstations');
      this.sendLine('vlan 20');
      this.sendLine(' description IP-Telephony');
      this.sendLine('#');
      this.sendLine('interface GigabitEthernet1/0/1');
      this.sendLine(' port link-type access');
      this.sendLine(' port default vlan 10');
      this.sendLine(' poe enable');
      this.sendLine('#');
      this.sendLine('return');
      this.send(this.getPrompt());
      return;
    }
    if (lower === 'display ip interface brief' || lower === 'dis ip int br') {
      this.sendLine('*down: administratively down');
      this.sendLine('(s): spoofing  (l): loopback');
      this.sendLine('Interface                Physical Protocol IP Address      Description ');
      this.sendLine('GE1/0/1                  UP       UP       10.100.20.5     Uplink-Core-Trunk');
      this.sendLine('GE1/0/2                  UP       UP       unassigned      Access-Port-02');
      this.sendLine('Vlan-interface10         UP       UP       10.100.10.1     VLAN 10 Gateway');
      this.send(this.getPrompt());
      return;
    }
    if (lower === 'display version' || lower === 'dis ver') {
      this.sendLine(`HPE Comware Platform Software`);
      this.sendLine(`HPE ${this.device.model} Software Version 7.1.070`);
      this.sendLine(`Uptime is 45 weeks, 2 days, 8 hours, 12 minutes`);
      this.send(this.getPrompt());
      return;
    }
    if (lower === 'save' || lower === 'sa') {
      this.sendLine('The current configuration will be written to the device. Are you sure? [Y/N]: Y');
      this.sendLine('Validating file. Please wait...');
      this.sendLine('Configuration is saved to device successfully.');
      this.send(this.getPrompt());
      return;
    }
    this.sendLine(`Error: Unrecognized command found at '^' position.`);
    this.send(this.getPrompt());
  }

  private handlePaloAltoCommand(cmd: string, lower: string) {
    if (lower === 'configure') {
      this.promptMode = 'config';
      this.sendLine('Entering configuration mode');
      this.sendLine('[edit]');
      this.send(this.getPrompt());
      return;
    }
    if (lower === 'show system info') {
      this.sendLine(`hostname: ${this.device.hostname}`);
      this.sendLine(`ip-address: ${this.device.management_ip}`);
      this.sendLine(`netmask: 255.255.255.0`);
      this.sendLine(`default-gateway: 192.168.100.254`);
      this.sendLine(`mac-address: 00:1b:17:00:3d:20`);
      this.sendLine(`uptime: 210 days, 1:04:12`);
      this.sendLine(`family: 5200`);
      this.sendLine(`model: PA-5220`);
      this.sendLine(`serial: ${this.device.serial_number || '012901004921'}`);
      this.sendLine(`sw-version: 11.0.2-h1`);
      this.sendLine(`app-version: 8812-8419`);
      this.sendLine(`threat-version: 8812-8419`);
      this.sendLine(`url-filtering-version: 20261106.2001`);
      this.send(this.getPrompt());
      return;
    }
    if (lower === 'commit') {
      this.sendLine('Configuration commit job 419 queued');
      this.sendLine('....................55%...................100%');
      this.sendLine('Configuration committed successfully');
      this.send(this.getPrompt());
      return;
    }
    this.sendLine(`Unknown syntax: ${cmd}`);
    this.send(this.getPrompt());
  }

  private handleGenericCommand(cmd: string, lower: string) {
    if (lower.startsWith('ping ')) {
      this.sendLine(`64 bytes from ${cmd.split(' ')[1] || '8.8.8.8'}: icmp_seq=1 ttl=58 time=1.24 ms`);
      this.sendLine(`64 bytes from ${cmd.split(' ')[1] || '8.8.8.8'}: icmp_seq=2 ttl=58 time=1.18 ms`);
      this.send(this.getPrompt());
      return;
    }
    this.sendLine(`Executed: ${cmd}`);
    this.send(this.getPrompt());
  }

  private showHelp() {
    this.sendLine(`${ANSI.cyan}Available Commands:${ANSI.reset}`);
    if (this.device.vendor === 'Cisco') {
      this.sendLine(`  enable                Enter privileged EXEC mode`);
      this.sendLine(`  configure terminal    Enter global configuration mode`);
      this.sendLine(`  interface <id>        Configure specific interface`);
      this.sendLine(`  show ip int brief     Display summary of interface status and IP`);
      this.sendLine(`  show running-config   Display active in-memory configuration`);
      this.sendLine(`  show version          Display software version and hardware uptime`);
      this.sendLine(`  ping <ip>             Test connectivity with ICMP Echo`);
      this.sendLine(`  traceroute <ip>       Trace packet hops to destination`);
      this.sendLine(`  write memory          Save running configuration to startup NVRAM`);
      this.sendLine(`  exit / quit           Exit current mode or disconnect session`);
    } else if (this.device.vendor === 'HP/Aruba') {
      this.sendLine(`  system-view           Enter system view configuration mode`);
      this.sendLine(`  display current-config Show active Comware configuration`);
      this.sendLine(`  display ip int brief  Display interface IP summary`);
      this.sendLine(`  display version       Show Comware platform release`);
      this.sendLine(`  save                  Save configuration to flash storage`);
      this.sendLine(`  quit                  Return to prior view or disconnect`);
    } else if (this.device.vendor === 'Palo Alto') {
      this.sendLine(`  configure             Enter PAN-OS configuration mode`);
      this.sendLine(`  show system info      Display management IP, serial, and licenses`);
      this.sendLine(`  commit                Apply pending candidate configuration`);
      this.sendLine(`  exit                  Exit session`);
    }
  }

  public resize(cols: number, rows: number) {
    // Acknowledge PTY resize
    // In real asyncssh/pty, this invokes session.change_terminal_size(cols, rows)
  }

  public close() {
    if (!this.isClosed) {
      this.isClosed = true;
      auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: this.user.username,
        action: 'SESSION_CLOSE',
        device_id: this.device.id,
        device_hostname: this.device.hostname,
        details: `Closed terminal session to ${this.device.hostname}`,
        status: 'success',
      });
    }
  }
}

// WebSocket Connection Event
wss.on('connection', (ws: WebSocket, req: http.IncomingMessage, context: { device: Device; user: User }) => {
  const { device, user } = context;
  const session = new DeviceCliSession(ws, device, user);

  ws.on('message', message => {
    try {
      const msgStr = message.toString();
      // Check if JSON protocol message (e.g., resize or ping)
      if (msgStr.startsWith('{')) {
        const parsed = JSON.parse(msgStr);
        if (parsed.type === 'resize') {
          session.resize(parsed.cols, parsed.rows);
          return;
        }
        if (parsed.type === 'input') {
          session.handleData(parsed.data);
          return;
        }
      }
      // Raw keystrokes stream
      session.handleData(msgStr);
    } catch (e) {
      session.handleData(message.toString());
    }
  });

  ws.on('close', () => {
    session.close();
  });

  ws.on('error', err => {
    session.close();
  });
});

// Setup Vite dev server or static serve
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[NetGateway] Server & WebSocket Terminal Gateway running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
