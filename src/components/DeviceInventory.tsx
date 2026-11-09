import React, { useState } from 'react';
import type { Device, User, VendorType, ConnectionType, Credential } from '../types/index.ts';
import { 
  Search, 
  Plus, 
  Terminal, 
  Activity, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  RefreshCw,
  Server,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  Filter,
  Key,
  ShieldCheck,
  Upload,
  Download,
  FileText,
  FileSpreadsheet,
  Check,
  Info,
  X
} from 'lucide-react';

interface DeviceInventoryProps {
  devices: Device[];
  credentials?: Credential[];
  onLaunchTerminal: (device: Device) => void;
  onAddDevice: (deviceData: Partial<Device>) => Promise<void>;
  onBulkImportDevices?: (devices: Partial<Device>[]) => Promise<{ count: number; devices: Device[]; errors?: string[] }>;
  onUpdateDevice: (id: string, updates: Partial<Device>) => Promise<void>;
  onDeleteDevice: (id: string) => Promise<void>;
  onPingDevice: (id: string) => Promise<any>;
  currentUser: User;
  refreshDevices: () => void;
}

export const DeviceInventory: React.FC<DeviceInventoryProps> = ({
  devices,
  credentials = [],
  onLaunchTerminal,
  onAddDevice,
  onBulkImportDevices,
  onUpdateDevice,
  onDeleteDevice,
  onPingDevice,
  currentUser,
  refreshDevices,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals & Drawers
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [pingResult, setPingResult] = useState<{ [id: string]: any }>({});
  const [pingingId, setPingingId] = useState<string | null>(null);

  // New Device Form State
  const [newHostname, setNewHostname] = useState('');
  const [newIp, setNewIp] = useState('');
  const [newVendor, setNewVendor] = useState<VendorType>('Cisco');
  const [newModel, setNewModel] = useState('Catalyst 9300-48UXM');
  const [newOsVersion, setNewOsVersion] = useState('IOS-XE 17.9.4');
  const [newConnectionType, setNewConnectionType] = useState<ConnectionType>('SSH');
  const [newPort, setNewPort] = useState('22');
  const [newTerminalLine, setNewTerminalLine] = useState('');
  const [newCredentialsId, setNewCredentialsId] = useState<string>('');
  const [newLocation, setNewLocation] = useState('DC-Ashburn-Rack02');
  const [newTags, setNewTags] = useState('Core, Access');
  const [newDescription, setNewDescription] = useState('');
  const [formError, setFormError] = useState('');

  // Edit Device State
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editHostname, setEditHostname] = useState('');
  const [editIp, setEditIp] = useState('');
  const [editVendor, setEditVendor] = useState<VendorType>('Cisco');
  const [editModel, setEditModel] = useState('');
  const [editOsVersion, setEditOsVersion] = useState('');
  const [editConnectionType, setEditConnectionType] = useState<ConnectionType>('SSH');
  const [editPort, setEditPort] = useState('22');
  const [editTerminalLine, setEditTerminalLine] = useState('');
  const [editCredentialsId, setEditCredentialsId] = useState<string>('');
  const [editLocation, setEditLocation] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editStatus, setEditStatus] = useState<Device['status']>('online');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState('');

  // Reassignment state in details modal
  const [reassignCredId, setReassignCredId] = useState<string>('');
  const [isReassigning, setIsReassigning] = useState<boolean>(false);
  const [reassignSuccess, setReassignSuccess] = useState<string>('');

  // Bulk Import State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInputText, setBulkInputText] = useState('');
  const [bulkDefaultCredId, setBulkDefaultCredId] = useState<string>(credentials[0]?.id || 'cred-1');
  const [bulkError, setBulkError] = useState('');
  const [isImportingBulk, setIsImportingBulk] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');
  const [importTab, setImportTab] = useState<'upload' | 'paste'>('upload');
  const [dragOver, setDragOver] = useState(false);

  // CSV Parsing helper
  const parseCSVLine = (line: string, delimiter: string = ','): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  interface ParsedBulkRow {
    rawIndex: number;
    isValid: boolean;
    error?: string;
    device: Partial<Device>;
  }

  const parseDevicesInput = (text: string, defaultCredId: string): ParsedBulkRow[] => {
    const trimmed = text.trim();
    if (!trimmed) return [];

    // Check if JSON format
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed.devices) ? parsed.devices : [parsed];
        return list.map((item: any, idx: number) => {
          const errors: string[] = [];
          if (!item.hostname) errors.push('Falta hostname');
          if (!item.management_ip && !item.ip) errors.push('Falta IP');
          if (!item.model) errors.push('Falta modelo');

          const ip = String(item.management_ip || item.ip || '').trim();
          const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
          if (ip && !ipRegex.test(ip)) {
            errors.push('Formato IP inválido');
          }

          let vendor: VendorType = 'Cisco';
          if (item.vendor) {
            const v = String(item.vendor).toLowerCase();
            if (v.includes('aruba') || v.includes('hp') || v.includes('comware')) vendor = 'HP/Aruba';
            else if (v.includes('palo') || v.includes('pan')) vendor = 'Palo Alto';
            else if (v.includes('opengear')) vendor = 'OpenGear';
            else if (v.includes('cisco')) vendor = 'Cisco';
          }

          return {
            rawIndex: idx + 1,
            isValid: errors.length === 0,
            error: errors.join(', '),
            device: {
              hostname: String(item.hostname || '').trim().toUpperCase(),
              management_ip: ip,
              vendor,
              model: String(item.model || 'Catalyst 9300').trim(),
              os_version: item.os_version || item.os || 'v1.0',
              connection_type: (item.connection_type || item.protocol || 'SSH') as ConnectionType,
              port: Number(item.port) || 22,
              terminal_line: item.terminal_line ? Number(item.terminal_line) : undefined,
              credentials_id: item.credentials_id || defaultCredId,
              location: item.location ? String(item.location).trim() : 'Datacenter',
              tags: Array.isArray(item.tags) ? item.tags : typeof item.tags === 'string' ? item.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : ['Imported'],
              description: item.description ? String(item.description).trim() : '',
            }
          };
        });
      } catch (err: any) {
        return [{
          rawIndex: 1,
          isValid: false,
          error: `Error JSON: ${err.message}`,
          device: {}
        }];
      }
    }

    // Otherwise parse CSV format
    const lines = trimmed.split(/\r?\n/).filter(line => line.trim().length > 0 && !line.trim().startsWith('#'));
    if (lines.length === 0) return [];

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headerTokens = parseCSVLine(lines[0], delimiter).map(h => h.toLowerCase().replace(/[\s_-]+/g, ''));
    
    // Check if first line contains known headers
    const hasHeader = headerTokens.some(h => ['hostname', 'host', 'ip', 'managementip', 'vendor', 'model'].includes(h));
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const getIndex = (aliases: string[]) => {
      if (!hasHeader) return -1;
      return headerTokens.findIndex(h => aliases.includes(h));
    };

    const hostIdx = hasHeader ? getIndex(['hostname', 'host', 'name']) : 0;
    const ipIdx = hasHeader ? getIndex(['managementip', 'ip', 'ipaddress']) : 1;
    const vendorIdx = hasHeader ? getIndex(['vendor', 'manufacturer', 'brand']) : 2;
    const modelIdx = hasHeader ? getIndex(['model', 'hardware']) : 3;
    const osIdx = hasHeader ? getIndex(['osversion', 'os', 'firmware', 'version']) : 4;
    const typeIdx = hasHeader ? getIndex(['connectiontype', 'protocol', 'type']) : 5;
    const portIdx = hasHeader ? getIndex(['port']) : 6;
    const lineIdx = hasHeader ? getIndex(['terminalline', 'line']) : 7;
    const credIdx = hasHeader ? getIndex(['credentialsid', 'credential', 'cred']) : 8;
    const locIdx = hasHeader ? getIndex(['location', 'site', 'rack']) : 9;
    const tagsIdx = hasHeader ? getIndex(['tags', 'tag']) : 10;
    const descIdx = hasHeader ? getIndex(['description', 'desc', 'notes']) : 11;

    return dataLines.map((line, idx) => {
      const tokens = parseCSVLine(line, delimiter);
      const errors: string[] = [];

      const rawHostname = (hostIdx >= 0 && hostIdx < tokens.length) ? tokens[hostIdx] : (tokens[0] || '');
      const rawIp = (ipIdx >= 0 && ipIdx < tokens.length) ? tokens[ipIdx] : (tokens[1] || '');
      const rawVendor = (vendorIdx >= 0 && vendorIdx < tokens.length) ? tokens[vendorIdx] : (tokens[2] || 'Cisco');
      const rawModel = (modelIdx >= 0 && modelIdx < tokens.length) ? tokens[modelIdx] : (tokens[3] || 'Catalyst 9300');

      if (!rawHostname.trim()) errors.push('Falta hostname');
      if (!rawIp.trim()) errors.push('Falta IP');
      if (!rawModel.trim()) errors.push('Falta modelo');

      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
      if (rawIp.trim() && !ipRegex.test(rawIp.trim())) {
        errors.push('Formato de IP inválido');
      }

      let vendor: VendorType = 'Cisco';
      const v = rawVendor.toLowerCase();
      if (v.includes('aruba') || v.includes('hp') || v.includes('comware')) vendor = 'HP/Aruba';
      else if (v.includes('palo') || v.includes('pan')) vendor = 'Palo Alto';
      else if (v.includes('opengear')) vendor = 'OpenGear';
      else if (v.includes('cisco')) vendor = 'Cisco';

      const rawType = (typeIdx >= 0 && typeIdx < tokens.length && tokens[typeIdx]) ? tokens[typeIdx] : 'SSH';
      let connType: ConnectionType = 'SSH';
      if (rawType.toLowerCase().includes('telnet')) connType = 'Telnet';
      else if (rawType.toLowerCase().includes('terminal') || rawType.toLowerCase().includes('serial')) connType = 'Terminal Server';

      const port = (portIdx >= 0 && portIdx < tokens.length && tokens[portIdx]) ? Number(tokens[portIdx]) : (connType === 'Telnet' ? 23 : connType === 'Terminal Server' ? 2001 : 22);
      const termLine = (lineIdx >= 0 && lineIdx < tokens.length && tokens[lineIdx]) ? Number(tokens[lineIdx]) : undefined;
      const credId = (credIdx >= 0 && credIdx < tokens.length && tokens[credIdx].trim()) ? tokens[credIdx].trim() : defaultCredId;
      const location = (locIdx >= 0 && locIdx < tokens.length && tokens[locIdx].trim()) ? tokens[locIdx].trim() : 'Datacenter';
      const tags = (tagsIdx >= 0 && tagsIdx < tokens.length && tokens[tagsIdx].trim()) ? tokens[tagsIdx].split(',').map(t => t.trim()).filter(Boolean) : ['Imported'];
      const description = (descIdx >= 0 && descIdx < tokens.length && tokens[descIdx].trim()) ? tokens[descIdx].trim() : '';
      const osVersion = (osIdx >= 0 && osIdx < tokens.length && tokens[osIdx].trim()) ? tokens[osIdx].trim() : 'v1.0';

      return {
        rawIndex: idx + (hasHeader ? 2 : 1),
        isValid: errors.length === 0,
        error: errors.join(', '),
        device: {
          hostname: rawHostname.trim().toUpperCase(),
          management_ip: rawIp.trim(),
          vendor,
          model: rawModel.trim(),
          os_version: osVersion,
          connection_type: connType,
          port: isNaN(port) ? 22 : port,
          terminal_line: termLine && !isNaN(termLine) ? termLine : undefined,
          credentials_id: credId,
          location,
          tags,
          description,
        }
      };
    });
  };

  const handleDownloadCSVTemplate = () => {
    const csvContent = [
      'hostname,management_ip,vendor,model,os_version,connection_type,port,terminal_line,credentials_id,location,tags,description',
      'US-WEST-CORE-R02,10.240.20.1,Cisco,Catalyst 9500-48Y4C,IOS-XE 17.9.4,SSH,22,,cred-1,DC-Ashburn-Rack02,"Core, BGP",Primary Core Router',
      'US-EAST-FW-01,10.240.0.253,Palo Alto,PA-5220,PAN-OS 11.0.2,SSH,22,,cred-2,DC-Ashburn-Rack01,"Perimeter, IPS",Edge Firewall Cluster',
      'US-CAMPUS-SW01,10.100.20.10,HP/Aruba,5900AF-48G,Comware 7.1,SSH,22,,cred-3,Campus-BldgA-IDF1,"Distribution, VLAN",Campus Aggregation',
      'CONSOLE-POD-01,10.240.254.20,OpenGear,IM7216,v4.12,Terminal Server,2001,1,cred-4,DC-Ashburn-Console,"OOB, Serial",Console Terminal Server'
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'netgateway_devices_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadJSONTemplate = () => {
    const jsonContent = JSON.stringify([
      {
        hostname: "US-WEST-CORE-R02",
        management_ip: "10.240.20.1",
        vendor: "Cisco",
        model: "Catalyst 9500-48Y4C",
        os_version: "IOS-XE 17.9.4",
        connection_type: "SSH",
        port: 22,
        credentials_id: "cred-1",
        location: "DC-Ashburn-Rack02",
        tags: ["Core", "BGP"],
        description: "Primary Core Router"
      },
      {
        hostname: "US-EAST-FW-01",
        management_ip: "10.240.0.253",
        vendor: "Palo Alto",
        model: "PA-5220",
        os_version: "PAN-OS 11.0.2",
        connection_type: "SSH",
        port: 22,
        credentials_id: "cred-2",
        location: "DC-Ashburn-Rack01",
        tags: ["Perimeter", "IPS"],
        description: "Edge Firewall Cluster"
      }
    ], null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'netgateway_devices_template.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadSampleData = () => {
    setBulkInputText(`hostname,management_ip,vendor,model,os_version,connection_type,port,terminal_line,credentials_id,location,tags,description
US-WEST-DIST-01,10.240.30.1,Cisco,Catalyst 9300-48UXM,IOS-XE 17.9.4,SSH,22,,cred-1,DC-West-Rack03,"Distribution, Access",West Distribution Switch
US-CORE-FW-02,10.240.0.254,Palo Alto,PA-5220,PAN-OS 11.0.2,SSH,22,,cred-2,DC-East-Rack01,"Perimeter, BGP",Secondary Edge Firewall
BRANCH-ACC-SW02,10.100.20.20,HP/Aruba,5900AF-48G,Comware 7.1,SSH,22,,cred-3,Branch-Office-02,"Campus, PoE",Branch Access Switch`);
    setImportTab('paste');
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setBulkInputText(content);
        setImportTab('paste');
      }
    };
    reader.readAsText(file);
  };

  // Filtering
  const filteredDevices = devices.filter((d) => {
    if (vendorFilter !== 'all' && d.vendor !== vendorFilter) return false;
    if (typeFilter !== 'all' && d.connection_type !== typeFilter) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        d.hostname.toLowerCase().includes(q) ||
        d.management_ip.includes(q) ||
        d.model.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q) ||
        d.tags.some(t => t.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const handlePing = async (dev: Device) => {
    setPingingId(dev.id);
    try {
      const res = await onPingDevice(dev.id);
      setPingResult(prev => ({ ...prev, [dev.id]: res }));
    } catch (e) {
      setPingResult(prev => ({ ...prev, [dev.id]: { error: 'Ping failed' } }));
    } finally {
      setPingingId(null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newHostname.trim() || !newIp.trim() || !newModel.trim()) {
      setFormError('Hostname, Management IP, and Model are required.');
      return;
    }

    try {
      const selectedCred = newCredentialsId || (credentials && credentials.length > 0 ? credentials[0].id : 'cred-1');
      await onAddDevice({
        hostname: newHostname.trim().toUpperCase(),
        management_ip: newIp.trim(),
        vendor: newVendor,
        model: newModel.trim(),
        os_version: newOsVersion.trim(),
        connection_type: newConnectionType,
        port: Number(newPort) || 22,
        terminal_line: newTerminalLine ? Number(newTerminalLine) : undefined,
        credentials_id: selectedCred,
        location: newLocation.trim(),
        tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
        description: newDescription.trim(),
      });
      setShowAddModal(false);
      // Reset form
      setNewHostname('');
      setNewIp('');
      setNewCredentialsId('');
      setNewDescription('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to add device');
    }
  };

  const handleStartEditDevice = (dev: Device) => {
    setEditingDevice(dev);
    setEditHostname(dev.hostname);
    setEditIp(dev.management_ip);
    setEditVendor(dev.vendor);
    setEditModel(dev.model);
    setEditOsVersion(dev.os_version || '');
    setEditConnectionType(dev.connection_type || 'SSH');
    setEditPort(String(dev.port || (dev.connection_type === 'Telnet' ? 23 : dev.connection_type === 'Terminal Server' ? 2001 : 22)));
    setEditTerminalLine(dev.terminal_line ? String(dev.terminal_line) : '');
    setEditCredentialsId(dev.credentials_id || credentials[0]?.id || 'cred-1');
    setEditLocation(dev.location || '');
    setEditTags(Array.isArray(dev.tags) ? dev.tags.join(', ') : '');
    setEditStatus(dev.status || 'online');
    setEditDescription(dev.description || '');
    setEditError('');
    setEditSuccessMsg('');
  };

  const handleEditDeviceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;
    setEditError('');

    if (!editHostname.trim() || !editIp.trim() || !editModel.trim()) {
      setEditError('Hostname, IP de gestión y Modelo son campos obligatorios.');
      return;
    }

    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    if (!ipRegex.test(editIp.trim())) {
      setEditError('Formato de IP de gestión inválido (ej. 10.240.20.1).');
      return;
    }

    setIsSavingEdit(true);
    try {
      const updates: Partial<Device> = {
        hostname: editHostname.trim().toUpperCase(),
        management_ip: editIp.trim(),
        vendor: editVendor,
        model: editModel.trim(),
        os_version: editOsVersion.trim() || 'v1.0',
        connection_type: editConnectionType,
        port: Number(editPort) || (editConnectionType === 'Telnet' ? 23 : editConnectionType === 'Terminal Server' ? 2001 : 22),
        terminal_line: editTerminalLine ? Number(editTerminalLine) : undefined,
        credentials_id: editCredentialsId || credentials[0]?.id || 'cred-1',
        location: editLocation.trim() || 'Datacenter',
        tags: editTags ? editTags.split(',').map(t => t.trim()).filter(Boolean) : ['Production'],
        status: editStatus,
        description: editDescription.trim(),
      };

      await onUpdateDevice(editingDevice.id, updates);

      if (selectedDevice && selectedDevice.id === editingDevice.id) {
        setSelectedDevice(prev => prev ? { ...prev, ...updates } : null);
      }

      setEditSuccessMsg('Parámetros actualizados exitosamente');
      setTimeout(() => {
        setEditingDevice(null);
        setEditSuccessMsg('');
      }, 600);
    } catch (err: any) {
      setEditError(err.message || 'Error al actualizar el dispositivo');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleOpenDeviceDetails = (dev: Device) => {
    setSelectedDevice(dev);
    setReassignCredId(dev.credentials_id || (credentials[0]?.id ?? 'cred-1'));
    setReassignSuccess('');
  };

  const handleReassignCredential = async () => {
    if (!selectedDevice || !reassignCredId) return;
    setIsReassigning(true);
    setReassignSuccess('');
    try {
      await onUpdateDevice(selectedDevice.id, { credentials_id: reassignCredId });
      setSelectedDevice(prev => prev ? { ...prev, credentials_id: reassignCredId } : null);
      setReassignSuccess('Perfil de credencial actualizado correctamente');
      setTimeout(() => setReassignSuccess(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Error al reasignar credencial');
    } finally {
      setIsReassigning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      
      {/* Top Section Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Network Device Inventory</h1>
          <p className="text-sm text-slate-400 mt-1">
            Enterprise infrastructure registry with direct interactive CLI terminal access.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={refreshDevices}
            className="p-2 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            title="Refresh Inventory"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {currentUser.role !== 'auditor' && (
            <>
              <button
                onClick={() => {
                  setShowBulkModal(true);
                  setBulkError('');
                  setBulkSuccessMsg('');
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white text-xs font-semibold rounded-lg shadow-sm transition-all whitespace-nowrap"
                title="Importar múltiples dispositivos mediante CSV o JSON"
              >
                <Upload className="w-4 h-4 text-cyan-400" />
                Bulk Import (CSV / JSON)
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-cyan-600/30 transition-all whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add Network Device
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3.5 mb-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search hostname, IP address, model, location, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-md pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
          />
        </div>

        {/* Segmented Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Vendor */}
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-md px-2.5 py-2 focus:outline-none focus:border-cyan-500 text-xs"
          >
            <option value="all">All Vendors</option>
            <option value="Cisco">Cisco</option>
            <option value="HP/Aruba">HP / Aruba</option>
            <option value="Palo Alto">Palo Alto</option>
            <option value="OpenGear">OpenGear (OOB)</option>
          </select>

          {/* Connection Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-md px-2.5 py-2 focus:outline-none focus:border-cyan-500 text-xs"
          >
            <option value="all">All Protocols</option>
            <option value="SSH">Direct SSH (Port 22)</option>
            <option value="Telnet">Telnet (Port 23)</option>
            <option value="Terminal Server">Terminal Server (Port 2001+)</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-md px-2.5 py-2 focus:outline-none focus:border-cyan-500 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="online">Online</option>
            <option value="warning">Warning</option>
            <option value="unreachable">Unreachable</option>
          </select>
        </div>
      </div>

      {/* Inventory Data Table */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold">
                <th className="py-3 px-4">Hostname &amp; IP</th>
                <th className="py-3 px-4">Vendor &amp; Platform</th>
                <th className="py-3 px-4">Protocol &amp; Port</th>
                <th className="py-3 px-4">Location &amp; Tags</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredDevices.map((dev) => {
                const ping = pingResult[dev.id];
                const assignedCred = credentials.find(c => c.id === dev.credentials_id);
                return (
                  <tr 
                    key={dev.id} 
                    className="hover:bg-slate-900/40 transition-colors group"
                  >
                    {/* Hostname & Management IP */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-semibold text-white group-hover:text-cyan-400 transition-colors cursor-pointer" onClick={() => handleOpenDeviceDetails(dev)}>
                        {dev.hostname}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="tabular-nums">{dev.management_ip}</span>
                        {dev.description && (
                          <>
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-500 truncate max-w-[200px]">{dev.description}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Vendor & Model */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-medium">{dev.vendor}</div>
                      <div className="text-[11px] text-slate-400">
                        {dev.model} <span className="text-slate-600">/</span> {dev.os_version}
                      </div>
                    </td>

                    {/* Protocol & Port */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="text-slate-300">
                        {dev.connection_type}
                        {dev.terminal_line && (
                          <span className="text-slate-400 font-sans text-[11px] ml-1">
                            (Line {dev.terminal_line})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 tabular-nums">Port {dev.port}</div>
                      {assignedCred && (
                        <div 
                          onClick={() => handleOpenDeviceDetails(dev)}
                          className="text-[11px] text-cyan-400/90 hover:text-cyan-300 flex items-center gap-1 mt-1 font-sans cursor-pointer transition-colors"
                          title={`Credencial de Vault: ${assignedCred.name} (${assignedCred.username}) - Click para reasignar`}
                        >
                          <Key className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span className="truncate max-w-[130px]">{assignedCred.name}</span>
                        </div>
                      )}
                    </td>

                    {/* Location & Tags (Zero-Pill Discipline: unboxed clean text) */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-300 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[160px]">{dev.location}</span>
                      </div>
                      {/* Tags as subtle text with bullet separators */}
                      <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-1">
                        {dev.tags.map((tag, i) => (
                          <React.Fragment key={tag}>
                            <span>{tag}</span>
                            {i < dev.tags.length - 1 && <span className="text-slate-700" aria-hidden="true">·</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        {dev.status === 'online' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-medium">Online</span>
                          </>
                        ) : dev.status === 'warning' ? (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-amber-400 font-medium">Warning</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span className="text-rose-400 font-medium">Offline</span>
                          </>
                        )}
                      </div>
                      {ping && (
                        <div className="text-[10px] font-mono text-cyan-400 mt-0.5">
                          {ping.rtt_ms}ms · 0% loss
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Ping button */}
                        <button
                          onClick={() => handlePing(dev)}
                          disabled={pingingId === dev.id}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 text-xs transition-colors flex items-center gap-1"
                          title="ICMP Connectivity Test"
                        >
                          <Activity className={`w-3 h-3 ${pingingId === dev.id ? 'animate-spin text-cyan-400' : ''}`} />
                          <span>Ping</span>
                        </button>

                        {/* Interactive CLI Launch Button */}
                        <button
                          onClick={() => onLaunchTerminal(dev)}
                          className="px-2.5 py-1 bg-cyan-900/60 hover:bg-cyan-800 text-cyan-300 hover:text-white rounded border border-cyan-700/60 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                          title="Open Interactive CLI in Browser"
                        >
                          <Terminal className="w-3 h-3" />
                          <span>Web CLI</span>
                        </button>

                        {/* Edit Device Parameters */}
                        {currentUser.role !== 'auditor' && (
                          <button
                            onClick={() => handleStartEditDevice(dev)}
                            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors"
                            title="Editar Parámetros del Equipo"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete asset (Admin only) */}
                        {currentUser.role === 'admin' && (
                          <button
                            onClick={() => {
                              if (confirm(`Decommission device ${dev.hostname}?`)) {
                                onDeleteDevice(dev.id);
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                            title="Decommission Asset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredDevices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No network devices found matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer count */}
        <div className="py-2.5 px-4 border-t border-slate-800 bg-slate-900/30 text-xs text-slate-500 flex items-center justify-between">
          <span className="tabular-nums">Showing {filteredDevices.length} of {devices.length} registered assets</span>
          <span>Gateway: Direct SSH / asyncssh / PTY Ready</span>
        </div>
      </div>

      {/* Device Details Drawer Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-700/50 flex items-center justify-center text-cyan-400 font-bold">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">{selectedDevice.hostname}</h3>
                  <p className="text-xs text-slate-400">{selectedDevice.description || 'Enterprise Network Asset'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDevice(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4 text-xs">
              <div className="border border-slate-800/80 rounded p-2.5 bg-slate-950/40">
                <span className="text-slate-500 block">Management IP</span>
                <span className="font-mono text-white text-sm font-semibold">{selectedDevice.management_ip}</span>
              </div>
              <div className="border border-slate-800/80 rounded p-2.5 bg-slate-950/40">
                <span className="text-slate-500 block">Vendor &amp; Platform</span>
                <span className="text-white font-medium">{selectedDevice.vendor} {selectedDevice.model}</span>
              </div>
              <div className="border border-slate-800/80 rounded p-2.5 bg-slate-950/40">
                <span className="text-slate-500 block">Firmware / OS</span>
                <span className="font-mono text-slate-300">{selectedDevice.os_version}</span>
              </div>
              <div className="border border-slate-800/80 rounded p-2.5 bg-slate-950/40">
                <span className="text-slate-500 block">Connection Protocol</span>
                <span className="text-cyan-400 font-mono font-medium">{selectedDevice.connection_type}:{selectedDevice.port}</span>
              </div>
              <div className="border border-slate-800/80 rounded p-2.5 bg-slate-950/40">
                <span className="text-slate-500 block">Physical Location</span>
                <span className="text-slate-300">{selectedDevice.location}</span>
              </div>
              <div className="border border-slate-800/80 rounded p-2.5 bg-slate-950/40">
                <span className="text-slate-500 block">System Uptime</span>
                <span className="text-emerald-400 font-mono">{selectedDevice.uptime || '99.98%'}</span>
              </div>
            </div>

            {/* Assigned Vault Credential & Reassignment */}
            {(() => {
              const currentAssignedCred = credentials.find(c => c.id === selectedDevice.credentials_id);
              return (
                <div className="my-3 p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                      <Key className="w-3.5 h-3.5" />
                      <span>Perfil de Credencial Asignado en Vault (SSH/Telnet)</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      ID: {selectedDevice.credentials_id || 'cred-1'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
                    <div>
                      <div className="text-white font-medium flex items-center gap-2">
                        <span>{currentAssignedCred ? currentAssignedCred.name : 'Credencial Estándar'}</span>
                        <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-800/50 px-1.5 py-0.5 rounded">
                          {currentAssignedCred?.auth_type === 'ssh_key' ? 'SSH Key' : 'Password'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 font-mono">
                        Usuario remoto: <span className="text-slate-200">{currentAssignedCred?.username || 'admin'}</span>
                        {currentAssignedCred?.has_enable_secret && (
                          <span className="text-emerald-400 ml-2">✓ Enable Secret Activo</span>
                        )}
                      </div>
                    </div>

                    {(currentUser.role === 'admin' || currentUser.role === 'net_engineer') && credentials.length > 0 && (
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={reassignCredId}
                          onChange={(e) => setReassignCredId(e.target.value)}
                          className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan-500"
                        >
                          {credentials.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.username})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={isReassigning || reassignCredId === selectedDevice.credentials_id}
                          onClick={handleReassignCredential}
                          className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded text-xs transition-colors shrink-0"
                        >
                          {isReassigning ? 'Guardando...' : 'Reasignar'}
                        </button>
                      </div>
                    )}
                  </div>

                  {reassignSuccess && (
                    <div className="mt-2 text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {reassignSuccess}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <div>
                {currentUser.role !== 'auditor' && (
                  <button
                    onClick={() => {
                      const dev = selectedDevice;
                      handleStartEditDevice(dev);
                    }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-cyan-300 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
                    title="Editar todos los parámetros del equipo"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar Equipo</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedDevice(null)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const dev = selectedDevice;
                    setSelectedDevice(null);
                    onLaunchTerminal(dev);
                  }}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Terminal className="w-4 h-4" />
                  Launch Terminal Gateway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Add New Network Device</h3>
              <button
                onClick={() => setShowAddModal(false)}
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
                  <label className="block text-slate-400 mb-1">Hostname *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. US-WEST-CORE-R02"
                    value={newHostname}
                    onChange={(e) => setNewHostname(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Management IP *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10.240.20.1"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Vendor *</label>
                  <select
                    value={newVendor}
                    onChange={(e) => setNewVendor(e.target.value as VendorType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Cisco">Cisco Systems</option>
                    <option value="HP/Aruba">HP / Aruba (Comware/AOS)</option>
                    <option value="Palo Alto">Palo Alto Networks</option>
                    <option value="OpenGear">OpenGear Terminal Server</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Hardware Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Catalyst 9500-48Y4C"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">OS / Firmware</label>
                  <input
                    type="text"
                    placeholder="IOS-XE 17.9.4"
                    value={newOsVersion}
                    onChange={(e) => setNewOsVersion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Protocol</label>
                  <select
                    value={newConnectionType}
                    onChange={(e) => setNewConnectionType(e.target.value as ConnectionType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="SSH">SSH</option>
                    <option value="Telnet">Telnet</option>
                    <option value="Terminal Server">Terminal Server (Serial)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Port</label>
                  <input
                    type="number"
                    value={newPort}
                    onChange={(e) => setNewPort(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Physical Location</label>
                  <input
                    type="text"
                    placeholder="e.g. DC-Ashburn-Row04"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="Core, BGP, Spine"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Vault Credentials Selection */}
              <div>
                <label className="block text-slate-400 mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Perfil de Credencial del Vault (SSH / Telnet) *</span>
                </label>
                <select
                  value={newCredentialsId || (credentials[0]?.id ?? '')}
                  onChange={(e) => setNewCredentialsId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
                >
                  {credentials.length > 0 ? (
                    credentials.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} — Usuario: {c.username} ({c.auth_type === 'ssh_key' ? 'SSH Key' : 'Contraseña'})
                      </option>
                    ))
                  ) : (
                    <option value="cred-1">Perfil Principal (TACACS+ / admin_net)</option>
                  )}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  El gateway utilizará las claves cifradas en AES-256 de este perfil al abrir la sesión PTY en el navegador.
                </p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Primary gateway routing transit traffic..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
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
                  Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Device Modal */}
      {editingDevice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 text-slate-200 shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700/50 flex items-center justify-center text-cyan-400">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Editar Parámetros del Dispositivo</h3>
                  <p className="text-xs text-slate-400 font-mono">{editingDevice.hostname} ({editingDevice.management_ip})</p>
                </div>
              </div>
              <button
                onClick={() => setEditingDevice(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="my-3 p-3 bg-rose-950/50 border border-rose-800 rounded text-rose-300 text-xs shrink-0">
                {editError}
              </div>
            )}

            {editSuccessMsg && (
              <div className="my-3 p-3 bg-emerald-950/50 border border-emerald-800 rounded text-emerald-300 text-xs flex items-center gap-2 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{editSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleEditDeviceSubmit} className="space-y-4 py-4 text-xs overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Hostname *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. US-WEST-CORE-R02"
                    value={editHostname}
                    onChange={(e) => setEditHostname(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Management IP *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10.240.20.1"
                    value={editIp}
                    onChange={(e) => setEditIp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Fabricante / Vendor *</label>
                  <select
                    value={editVendor}
                    onChange={(e) => setEditVendor(e.target.value as VendorType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Cisco">Cisco Systems</option>
                    <option value="HP/Aruba">HP / Aruba (Comware/AOS)</option>
                    <option value="Palo Alto">Palo Alto Networks</option>
                    <option value="Juniper">Juniper Networks</option>
                    <option value="OpenGear">OpenGear Terminal Server</option>
                    <option value="Linux">Linux Gateway / Bastion</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Modelo de Hardware *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Catalyst 9500-48Y4C"
                    value={editModel}
                    onChange={(e) => setEditModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">OS / Firmware</label>
                  <input
                    type="text"
                    placeholder="IOS-XE 17.9.4"
                    value={editOsVersion}
                    onChange={(e) => setEditOsVersion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Protocolo</label>
                  <select
                    value={editConnectionType}
                    onChange={(e) => {
                      const newType = e.target.value as ConnectionType;
                      setEditConnectionType(newType);
                      if (newType === 'Telnet' && editPort === '22') setEditPort('23');
                      else if (newType === 'Terminal Server' && editPort === '22') setEditPort('2001');
                      else if (newType === 'SSH' && (editPort === '23' || editPort === '2001')) setEditPort('22');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="SSH">SSH</option>
                    <option value="Telnet">Telnet</option>
                    <option value="Terminal Server">Terminal Server (Serial)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Puerto TCP</label>
                  <input
                    type="number"
                    value={editPort}
                    onChange={(e) => setEditPort(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              {editConnectionType === 'Terminal Server' && (
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Línea de Consola / Terminal Line</label>
                  <input
                    type="number"
                    placeholder="e.g. 1"
                    value={editTerminalLine}
                    onChange={(e) => setEditTerminalLine(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Estado Operativo</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Device['status'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="online">Online (Operativo)</option>
                    <option value="warning">Warning (Alerta de telemetría)</option>
                    <option value="unreachable">Unreachable (Inalcanzable)</option>
                    <option value="maintenance">Maintenance (Ventana de Mantenimiento)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Ubicación Física / Rack</label>
                  <input
                    type="text"
                    placeholder="e.g. DC-Ashburn-Row04"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Etiquetas / Tags (separadas por coma)</label>
                <input
                  type="text"
                  placeholder="Core, BGP, Spine"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Vault Credentials Selection */}
              <div>
                <label className="block text-slate-400 mb-1 flex items-center gap-1.5 font-medium">
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Perfil de Credencial del Vault (SSH / Telnet)</span>
                </label>
                <select
                  value={editCredentialsId}
                  onChange={(e) => setEditCredentialsId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
                >
                  {credentials.length > 0 ? (
                    credentials.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} — Usuario: {c.username} ({c.auth_type === 'ssh_key' ? 'SSH Key' : 'Contraseña'})
                      </option>
                    ))
                  ) : (
                    <option value="cred-1">Perfil Principal (TACACS+ / admin_net)</option>
                  )}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  El gateway utilizará las claves cifradas en AES-256 de este perfil al abrir la sesión PTY en el navegador.
                </p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Descripción / Notas Operativas</label>
                <textarea
                  rows={2}
                  placeholder="Gateway de interconexión con BGP hacia ISP..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDevice(null)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs shadow-sm shadow-cyan-600/30 flex items-center gap-1.5 transition-colors"
                >
                  {isSavingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full p-6 text-slate-200 shadow-2xl flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-700/50 flex items-center justify-center text-cyan-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Importación Masiva de Equipos (Bulk Import)</h3>
                  <p className="text-xs text-slate-400">Importa múltiples routers, switches y firewalls desde archivos CSV o JSON.</p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Modal Body with Scroll */}
            <div className="overflow-y-auto flex-1 py-4 pr-1 space-y-4 text-xs">
              {/* Success / Error alerts */}
              {bulkSuccessMsg && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{bulkSuccessMsg}</span>
                </div>
              )}

              {bulkError && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 rounded text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{bulkError}</span>
                </div>
              )}

              {/* Mode Selector and Template Downloaders */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setImportTab('upload')}
                    className={`px-3 py-1.5 rounded font-medium transition-colors ${
                      importTab === 'upload' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Subir Archivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportTab('paste')}
                    className={`px-3 py-1.5 rounded font-medium transition-colors ${
                      importTab === 'paste' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Editor / Pegar Texto
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadCSVTemplate}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-300 hover:text-white rounded text-xs transition-colors"
                    title="Descargar plantilla CSV compatible con Excel y LibreOffice"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Descargar Plantilla CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadJSONTemplate}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-300 hover:text-white rounded text-xs transition-colors"
                    title="Descargar esquema de ejemplo en JSON"
                  >
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Ejemplo JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadSampleData}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/60 text-cyan-300 rounded text-xs transition-colors font-medium"
                  >
                    <span>⚡ Cargar Datos Demo</span>
                  </button>
                </div>
              </div>

              {/* Upload Drop Zone Tab */}
              {importTab === 'upload' && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      handleFileUpload(files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
                    dragOver
                      ? 'border-cyan-500 bg-cyan-950/20'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                  }`}
                  onClick={() => {
                    const input = document.getElementById('bulk-file-input');
                    if (input) input.click();
                  }}
                >
                  <input
                    id="bulk-file-input"
                    type="file"
                    accept=".csv,.json,text/csv,application/json"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-white font-medium mb-1">Arrastra aquí tu archivo CSV o JSON, o haz clic para explorar</p>
                  <p className="text-slate-400 text-[11px]">Formatos soportados: .csv (separado por comas o punto y coma) o .json (array de objetos)</p>
                </div>
              )}

              {/* Paste / Editor Tab */}
              {importTab === 'paste' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5 text-slate-400">
                    <span>Pega tus registros en formato CSV o JSON:</span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {bulkInputText.split('\n').filter(Boolean).length} líneas
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={bulkInputText}
                    onChange={(e) => setBulkInputText(e.target.value)}
                    placeholder="hostname,management_ip,vendor,model,os_version,connection_type,port,terminal_line,credentials_id,location,tags,description&#10;US-WEST-SW-01,10.240.30.11,Cisco,Catalyst 9300-48P,IOS-XE 17.9.4,SSH,22,,cred-1,DC-Ashburn-Rack03,&quot;Access,PoE&quot;,IDF-1 switch"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 font-mono text-[11px] text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed"
                  />
                </div>
              )}

              {/* Default Credential Fallback Selector */}
              <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Perfil de Credencial Predeterminado</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Se aplicará automáticamente a cualquier equipo que no tenga un <code className="text-cyan-400">credentials_id</code> en el archivo.
                  </div>
                </div>

                <select
                  value={bulkDefaultCredId}
                  onChange={(e) => setBulkDefaultCredId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-cyan-500"
                >
                  {credentials.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.username})
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Preview Table */}
              {(() => {
                const parsed = parseDevicesInput(bulkInputText, bulkDefaultCredId);
                const validCount = parsed.filter(p => p.isValid).length;
                const errorCount = parsed.length - validCount;

                if (parsed.length === 0) return null;

                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-slate-200 flex items-center gap-2">
                        <span>Previsualización y Validación</span>
                        <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                          {parsed.length} equipos detectados
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-emerald-400 font-medium">✓ {validCount} Válidos</span>
                        {errorCount > 0 && (
                          <span className="text-rose-400 font-medium">✕ {errorCount} con errores</span>
                        )}
                      </div>
                    </div>

                    <div className="border border-slate-800 rounded-lg overflow-hidden max-h-52 overflow-y-auto bg-slate-950">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-900/80 text-slate-400 sticky top-0 border-b border-slate-800">
                          <tr>
                            <th className="py-2 px-3">#</th>
                            <th className="py-2 px-3">Estado</th>
                            <th className="py-2 px-3">Hostname</th>
                            <th className="py-2 px-3">IP Gestión</th>
                            <th className="py-2 px-3">Fabricante &amp; Modelo</th>
                            <th className="py-2 px-3">Protocolo</th>
                            <th className="py-2 px-3">Ubicación</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 font-mono text-[11px]">
                          {parsed.map((row) => (
                            <tr key={row.rawIndex} className={row.isValid ? 'hover:bg-slate-900/40' : 'bg-rose-950/20'}>
                              <td className="py-2 px-3 text-slate-500">{row.rawIndex}</td>
                              <td className="py-2 px-3 font-sans">
                                {row.isValid ? (
                                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Válido
                                  </span>
                                ) : (
                                  <span className="text-rose-400 font-medium flex items-center gap-1" title={row.error}>
                                    <AlertTriangle className="w-3 h-3" /> {row.error}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-white font-semibold">{row.device.hostname || '—'}</td>
                              <td className="py-2 px-3 text-slate-300">{row.device.management_ip || '—'}</td>
                              <td className="py-2 px-3 text-slate-300 font-sans">
                                {row.device.vendor} · {row.device.model}
                              </td>
                              <td className="py-2 px-3 text-slate-400">
                                {row.device.connection_type}:{row.device.port}
                              </td>
                              <td className="py-2 px-3 text-slate-400 font-sans">{row.device.location}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            {(() => {
              const parsed = parseDevicesInput(bulkInputText, bulkDefaultCredId);
              const validDevices = parsed.filter(p => p.isValid).map(p => p.device);

              return (
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between shrink-0">
                  <div className="text-xs text-slate-400">
                    {validDevices.length > 0 ? (
                      <span>Listos para registrar: <strong className="text-white">{validDevices.length}</strong> equipos</span>
                    ) : (
                      <span>Sube un archivo o pega contenido para previsualizar</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowBulkModal(false)}
                      className="px-4 py-2 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={validDevices.length === 0 || isImportingBulk}
                      onClick={async () => {
                        if (!onBulkImportDevices || validDevices.length === 0) return;
                        setIsImportingBulk(true);
                        setBulkError('');
                        setBulkSuccessMsg('');
                        try {
                          const res = await onBulkImportDevices(validDevices);
                          setBulkSuccessMsg(`¡Se han importado exitosamente ${res.count} dispositivos al inventario!`);
                          setTimeout(() => {
                            setShowBulkModal(false);
                            setBulkInputText('');
                            setBulkSuccessMsg('');
                          }, 1600);
                        } catch (err: any) {
                          setBulkError(err.message || 'Error en la importación masiva');
                        } finally {
                          setIsImportingBulk(false);
                        }
                      }}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-xs shadow-sm shadow-cyan-600/30 flex items-center gap-1.5 transition-all"
                    >
                      {isImportingBulk ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Importando...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Importar {validDevices.length} Equipos Validados</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
};
