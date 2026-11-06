import React, { useState } from 'react';
import type { AuditLogEntry } from '../types/index.ts';
import { FileText, Download, Filter, RefreshCw, Terminal, Shield, CheckCircle, AlertCircle } from 'lucide-react';

interface AuditLogViewProps {
  logs: AuditLogEntry[];
  refreshLogs: () => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs, refreshLogs }) => {
  const [filterAction, setFilterAction] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter(log => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        log.user.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        (log.device_hostname && log.device_hostname.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const exportCSV = () => {
    const headers = ['ID', 'Timestamp', 'User', 'Action', 'Device', 'Status', 'Details'];
    const rows = filteredLogs.map(l => [
      l.id,
      l.timestamp,
      l.user,
      l.action,
      l.device_hostname || '',
      l.status,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `netgateway-audit-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-cyan-400" />
            Security &amp; Terminal Audit Trail
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Immutable session audit logs recording interactive CLI keystrokes, configuration mutations, and credential requests.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={refreshLogs}
            className="p-2 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            title="Refresh Logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3.5 py-2 border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Export Audit CSV
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3.5 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <input
          type="text"
          placeholder="Filter by operator user, hostname, or executed CLI command..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 flex-1 text-xs"
        />

        <div className="flex items-center gap-2">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-md px-2.5 py-2 focus:outline-none focus:border-cyan-500 text-xs"
          >
            <option value="all">All Audit Actions</option>
            <option value="COMMAND_EXEC">CLI Command Executed</option>
            <option value="SESSION_START">Terminal Session Opened</option>
            <option value="SESSION_CLOSE">Terminal Session Closed</option>
            <option value="DEVICE_CREATE">Asset Created</option>
            <option value="DEVICE_UPDATE">Asset Updated</option>
            <option value="CREDENTIAL_ACCESS">Credential Access</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950 shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold">
              <th className="py-3 px-4">Timestamp (UTC)</th>
              <th className="py-3 px-4">Operator</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Target Device</th>
              <th className="py-3 px-4">Audit Details</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                <td className="py-3 px-4 font-mono text-slate-400 tabular-nums whitespace-nowrap">
                  {new Date(log.timestamp).toISOString().replace('T', ' ').slice(0, 19)}
                </td>
                <td className="py-3 px-4 font-mono font-medium text-cyan-300">
                  {log.user}
                </td>
                <td className="py-3 px-4 font-mono">
                  <span className="text-slate-300">{log.action}</span>
                </td>
                <td className="py-3 px-4 font-mono text-slate-200">
                  {log.device_hostname || 'N/A'}
                </td>
                <td className="py-3 px-4 font-mono text-slate-300 max-w-md truncate">
                  {log.details}
                </td>
                <td className="py-3 px-4 text-center">
                  {log.status === 'success' ? (
                    <span className="text-emerald-400 font-medium">SUCCESS</span>
                  ) : log.status === 'denied' ? (
                    <span className="text-amber-400 font-medium">DENIED</span>
                  ) : (
                    <span className="text-rose-400 font-medium">FAILED</span>
                  )}
                </td>
              </tr>
            ))}

            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No audit records found matching current criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
