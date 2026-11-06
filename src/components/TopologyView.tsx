import React from 'react';
import type { Device } from '../types/index.ts';
import { Network, Terminal, Activity, ArrowRight, Shield, Server, Cpu } from 'lucide-react';

interface TopologyViewProps {
  devices: Device[];
  onLaunchTerminal: (device: Device) => void;
  onPingDevice: (id: string) => Promise<any>;
}

export const TopologyView: React.FC<TopologyViewProps> = ({
  devices,
  onLaunchTerminal,
}) => {
  const coreDevices = devices.filter(d => d.tags.includes('Core'));
  const aggDevices = devices.filter(d => d.tags.includes('Aggregation') || d.tags.includes('Distribution'));
  const accessDevices = devices.filter(d => d.tags.includes('Access'));
  const secDevices = devices.filter(d => d.tags.includes('Firewall') || d.tags.includes('Security'));
  const oobDevices = devices.filter(d => d.tags.includes('Out-Of-Band') || d.connection_type === 'Terminal Server');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Network className="w-6 h-6 text-cyan-400" />
          Network Topology &amp; Access Matrix
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Logical interconnects and routing hierarchy across enterprise core, distribution, access, and out-of-band serial lines.
        </p>
      </div>

      {/* Access Matrix Overview Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="text-xs text-slate-400 mb-1">Direct SSH Driver</div>
          <div className="text-lg font-bold text-white font-mono">asyncssh (PTY)</div>
          <div className="text-xs text-slate-500 mt-1">Port 22 · Non-blocking bidirectional streaming</div>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="text-xs text-slate-400 mb-1">Terminal Server Driver</div>
          <div className="text-lg font-bold text-white font-mono">Serial Line 2001+</div>
          <div className="text-xs text-slate-500 mt-1">Console Pod · Out-of-band disaster recovery</div>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="text-xs text-slate-400 mb-1">Security Perimeter</div>
          <div className="text-lg font-bold text-white font-mono">PAN-OS NextGen</div>
          <div className="text-xs text-slate-500 mt-1">Zone inspection &amp; SSL Decryption</div>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="text-xs text-slate-400 mb-1">Lab / Gateway Hooks</div>
          <div className="text-lg font-bold text-white font-mono">EVE-NG / GNS3</div>
          <div className="text-xs text-slate-500 mt-1">Extensible Guacamole &amp; Telnet socket bridges</div>
        </div>
      </div>

      {/* Layer-by-layer architectural hierarchy */}
      <div className="space-y-6">
        
        {/* Tier 1: Security & Edge Perimeter */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-rose-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Perimeter &amp; Security Layer</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {secDevices.map(d => (
              <TopologyCard key={d.id} device={d} onLaunchTerminal={onLaunchTerminal} />
            ))}
          </div>
        </div>

        {/* Tier 2: Core Routing Tier */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Datacenter Core Backbone</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coreDevices.map(d => (
              <TopologyCard key={d.id} device={d} onLaunchTerminal={onLaunchTerminal} />
            ))}
          </div>
        </div>

        {/* Tier 3: Aggregation & Distribution */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Distribution &amp; Aggregation Switched Fabric</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aggDevices.map(d => (
              <TopologyCard key={d.id} device={d} onLaunchTerminal={onLaunchTerminal} />
            ))}
          </div>
        </div>

        {/* Tier 4: Campus Access */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Campus Access Tier</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accessDevices.map(d => (
              <TopologyCard key={d.id} device={d} onLaunchTerminal={onLaunchTerminal} />
            ))}
          </div>
        </div>

        {/* Tier 5: Out of Band Console Server */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Out-Of-Band Management &amp; Console Lines</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {oobDevices.map(d => (
              <TopologyCard key={d.id} device={d} onLaunchTerminal={onLaunchTerminal} />
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

function TopologyCard({ device, onLaunchTerminal }: { device: Device; onLaunchTerminal: (d: Device) => void }) {
  return (
    <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-4 hover:border-slate-700 transition-colors flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono font-bold text-white text-sm">{device.hostname}</div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">{device.management_ip}:{device.port}</div>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
            {device.connection_type}
          </span>
        </div>

        <div className="mt-3 text-xs text-slate-400">
          <span>{device.vendor} {device.model}</span>
          <span className="text-slate-600 mx-1.5">·</span>
          <span>{device.os_version}</span>
        </div>

        <div className="mt-1 text-[11px] text-slate-500">
          Location: {device.location}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Nominal</span>
        </div>

        <button
          onClick={() => onLaunchTerminal(device)}
          className="flex items-center gap-1 px-3 py-1 bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-700/60 text-cyan-300 hover:text-white rounded text-xs font-semibold transition-colors"
        >
          <Terminal className="w-3 h-3" />
          <span>Open CLI</span>
        </button>
      </div>
    </div>
  );
}
