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
  ShieldCheck
} from 'lucide-react';

interface DeviceInventoryProps {
  devices: Device[];
  credentials?: Credential[];
  onLaunchTerminal: (device: Device) => void;
  onAddDevice: (deviceData: Partial<Device>) => Promise<void>;
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

  // Reassignment state in details modal
  const [reassignCredId, setReassignCredId] = useState<string>('');
  const [isReassigning, setIsReassigning] = useState<boolean>(false);
  const [reassignSuccess, setReassignSuccess] = useState<string>('');

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
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-cyan-600/30 transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Network Device
            </button>
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

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
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

    </div>
  );
};
