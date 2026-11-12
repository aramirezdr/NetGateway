import React, { useState, useEffect } from 'react';
import type { BackupMetadata, BackupScheduleConfig, User } from '../types/index.ts';
import {
  fetchBackups,
  createBackup,
  downloadBackupFile,
  uploadBackupFile,
  restoreBackup,
  deleteBackup,
  fetchBackupSchedule,
  updateBackupSchedule,
} from '../services/api.ts';
import {
  Archive,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  RotateCcw,
  Clock,
  HardDrive,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Server,
  Key,
  Users,
  Copy,
  Check,
  Calendar,
  Settings,
  Search,
  X,
} from 'lucide-react';

interface BackupManagementProps {
  currentUser: User;
  onRestoreCompleted: () => Promise<void>;
}

export const BackupManagement: React.FC<BackupManagementProps> = ({
  currentUser,
  onRestoreCompleted,
}) => {
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [schedule, setSchedule] = useState<BackupScheduleConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'manual' | 'auto'>('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createDescription, setCreateDescription] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadText, setUploadText] = useState<string>('');
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');

  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(true);
  const [scheduleTime, setScheduleTime] = useState<string>('02:00');
  const [scheduleRetention, setScheduleRetention] = useState<number>(10);
  const [scheduleFreq, setScheduleFreq] = useState<'daily' | 'weekly' | 'hourly'>('daily');
  const [isSavingSchedule, setIsSavingSchedule] = useState<boolean>(false);

  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupMetadata | null>(null);
  const [restoreComponents, setRestoreComponents] = useState<{ [key: string]: boolean }>({
    devices: true,
    credentials: true,
    users: true,
    audit_logs: true,
  });
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  // Notifications
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedChecksum, setCopiedChecksum] = useState<string | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [bkps, sched] = await Promise.all([
        fetchBackups(),
        fetchBackupSchedule().catch(() => null),
      ]);
      setBackups(bkps);
      if (sched) {
        setSchedule(sched);
        setScheduleEnabled(sched.enabled);
        setScheduleTime(sched.time || '02:00');
        setScheduleRetention(sched.retention_count || 10);
        setScheduleFreq(sched.frequency || 'daily');
      }
    } catch (err: any) {
      showToast(err.message || 'Error cargando lista de respaldos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await createBackup(createDescription.trim() || undefined);
      showToast(res.message || 'Respaldo generado con éxito');
      setShowCreateModal(false);
      setCreateDescription('');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error generando respaldo', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownload = async (filename: string) => {
    try {
      await downloadBackupFile(filename);
      showToast(`Descarga iniciada: ${filename}`);
    } catch (err: any) {
      showToast(err.message || 'Error al descargar respaldo', 'error');
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el respaldo "${filename}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await deleteBackup(filename);
      showToast(`Respaldo "${filename}" eliminado`);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar respaldo', 'error');
    }
  };

  const handleStartRestore = (backup: BackupMetadata) => {
    setSelectedBackupForRestore(backup);
    setRestoreComponents({
      devices: true,
      credentials: true,
      users: true,
      audit_logs: true,
    });
  };

  const handleConfirmRestore = async () => {
    if (!selectedBackupForRestore) return;
    setIsRestoring(true);
    try {
      const selected = Object.keys(restoreComponents).filter(k => restoreComponents[k]);
      if (selected.length === 0) {
        showToast('Debes seleccionar al menos un componente a restaurar', 'error');
        setIsRestoring(false);
        return;
      }

      const res = await restoreBackup(selectedBackupForRestore.filename, selected);
      showToast(`Restauración completada con éxito. Se restauraron los datos del respaldo "${selectedBackupForRestore.filename}"`);
      setSelectedBackupForRestore(null);
      // Reload app state in parent
      await onRestoreCompleted();
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Fallo durante la restauración', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSchedule(true);
    try {
      const res = await updateBackupSchedule({
        enabled: scheduleEnabled,
        frequency: scheduleFreq,
        time: scheduleTime,
        retention_count: Number(scheduleRetention),
      });
      setSchedule(res.schedule);
      showToast('Política de respaldos automáticos actualizada');
      setShowScheduleModal(false);
    } catch (err: any) {
      showToast(err.message || 'Error guardando política', 'error');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleUploadFileSelected = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setUploadText(content);
        setUploadFileName(file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    if (!uploadText.trim()) {
      setUploadError('Por favor selecciona o pega el contenido del archivo de respaldo en formato JSON.');
      return;
    }
    setIsUploading(true);
    try {
      const res = await uploadBackupFile(uploadFileName || 'uploaded-backup.json', uploadText.trim());
      showToast(res.message || 'Respaldo importado y registrado en el servidor');
      setShowUploadModal(false);
      setUploadText('');
      setUploadFileName('');
      await loadData();
    } catch (err: any) {
      setUploadError(err.message || 'Error al procesar el archivo');
    } finally {
      setIsUploading(false);
    }
  };

  const copyChecksum = (checksum: string) => {
    navigator.clipboard.writeText(checksum);
    setCopiedChecksum(checksum);
    setTimeout(() => setCopiedChecksum(null), 2000);
  };

  // Stats calculation
  const totalSizeBytes = backups.reduce((acc, b) => acc + (b.size_bytes || 0), 0);
  const formatTotalSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const lastBackup = backups.length > 0 ? backups[0] : null;

  // Filtered backups
  const filteredBackups = backups.filter(b => {
    if (filterType === 'manual' && b.is_automatic) return false;
    if (filterType === 'auto' && !b.is_automatic) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        b.filename.toLowerCase().includes(q) ||
        (b.description && b.description.toLowerCase().includes(q)) ||
        b.created_by.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl text-xs font-medium transition-all ${
            toastMessage.type === 'success'
              ? 'bg-slate-900 border-emerald-500/80 text-emerald-300'
              : 'bg-slate-900 border-rose-500/80 text-rose-300'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Archive className="w-6 h-6 text-cyan-400" />
            <span>Respaldos y Recuperación del Sistema</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestión integral de snapshots, persistencia en volumen host, exportación externa y restauración ante desastres.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            title="Recargar respaldos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {currentUser.role === 'admin' && (
            <button
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
              title="Configurar política de ejecución automática"
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Programación Automática</span>
            </button>
          )}

          {currentUser.role === 'admin' && (
            <button
              onClick={() => {
                setShowUploadModal(true);
                setUploadError('');
                setUploadText('');
                setUploadFileName('');
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
              title="Subir archivo .json de respaldo externo"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Subir Respaldo</span>
            </button>
          )}

          {currentUser.role !== 'auditor' && (
            <button
              onClick={() => {
                setShowCreateModal(true);
                setCreateDescription('');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-cyan-600/30 transition-all whitespace-nowrap"
            >
              <HardDrive className="w-4 h-4" />
              <span>Crear Respaldo Ahora</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Respaldos Almacenados</span>
            <Archive className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{backups.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Directorio persistente: ./data/backups</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Último Respaldo</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-semibold text-white truncate">
            {lastBackup ? new Date(lastBackup.timestamp).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Ninguno'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {lastBackup ? `${lastBackup.size_formatted} · ${lastBackup.created_by}` : 'Sin respaldos previos'}
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Política Automática</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${schedule?.enabled ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            <span className="text-sm font-bold text-white">
              {schedule?.enabled ? `${schedule.frequency.toUpperCase()} a las ${schedule.time}` : 'Desactivado'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {schedule?.enabled ? `Retención: últimos ${schedule.retention_count} snapshots` : 'Solo respaldos manuales'}
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Espacio en Disco Utilizado</span>
            <HardDrive className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{formatTotalSize(totalSizeBytes)}</div>
          <p className="text-[11px] text-slate-500 mt-1">Almacenamiento atómico JSON</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3.5 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nombre de archivo, autor o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-md pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-md px-2.5 py-2 focus:outline-none focus:border-cyan-500 text-xs"
          >
            <option value="all">Todos los orígenes</option>
            <option value="manual">Manuales</option>
            <option value="auto">Automáticos (Scheduler)</option>
          </select>
        </div>
      </div>

      {/* Backups Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/70 text-slate-400 font-semibold">
                <th className="py-3 px-4">Archivo &amp; Descripción</th>
                <th className="py-3 px-4">Fecha &amp; Origen</th>
                <th className="py-3 px-4">Contenido del Respaldo</th>
                <th className="py-3 px-4">Tamaño &amp; SHA-256</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredBackups.map((bkp) => (
                <tr key={bkp.filename} className="hover:bg-slate-900/40 transition-colors group">
                  {/* Filename & Description */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="font-mono font-semibold text-white group-hover:text-cyan-300 transition-colors">
                        {bkp.filename}
                      </span>
                      {bkp.is_automatic ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800/60 text-amber-300 font-mono">
                          Auto
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 font-mono">
                          Manual
                        </span>
                      )}
                    </div>
                    {bkp.description && (
                      <div className="text-[11px] text-slate-400 mt-1 pl-6">
                        {bkp.description}
                      </div>
                    )}
                  </td>

                  {/* Date & Author */}
                  <td className="py-3.5 px-4">
                    <div className="text-slate-200 font-medium">
                      {new Date(bkp.timestamp).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <span>Generado por:</span>
                      <span className="font-mono text-cyan-400 font-semibold">{bkp.created_by}</span>
                    </div>
                  </td>

                  {/* Contents breakdown */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-200" title="Equipos de red registrados">
                        <Server className="w-3 h-3 text-cyan-400" />
                        <span className="font-mono font-semibold">{bkp.device_count}</span> equipos
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-200" title="Perfiles de credenciales cifradas">
                        <Key className="w-3 h-3 text-amber-400" />
                        <span className="font-mono font-semibold">{bkp.credential_count}</span> credenciales
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-200" title="Usuarios locales y roles RBAC">
                        <Users className="w-3 h-3 text-emerald-400" />
                        <span className="font-mono font-semibold">{bkp.user_count}</span> usuarios
                      </span>
                    </div>
                  </td>

                  {/* Size & Checksum */}
                  <td className="py-3.5 px-4 font-mono">
                    <div className="text-slate-200 font-semibold">{bkp.size_formatted}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-slate-500 truncate max-w-[120px]" title={bkp.checksum}>
                        SHA: {bkp.checksum ? bkp.checksum.substring(0, 10) + '...' : 'N/A'}
                      </span>
                      {bkp.checksum && (
                        <button
                          onClick={() => copyChecksum(bkp.checksum)}
                          className="text-slate-500 hover:text-cyan-300 transition-colors"
                          title="Copiar Hash SHA-256 para verificación de integridad"
                        >
                          {copiedChecksum === bkp.checksum ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Download button */}
                      <button
                        onClick={() => handleDownload(bkp.filename)}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700 transition-colors flex items-center gap-1 text-xs"
                        title="Descargar archivo JSON a tu máquina para almacenamiento offsite"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="hidden sm:inline">Descargar</span>
                      </button>

                      {/* Restore button (Admin only) */}
                      {currentUser.role === 'admin' && (
                        <button
                          onClick={() => handleStartRestore(bkp)}
                          className="p-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 hover:text-white rounded border border-cyan-800/70 transition-colors flex items-center gap-1 text-xs font-semibold"
                          title="Restaurar este estado en la plataforma"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Restaurar</span>
                        </button>
                      )}

                      {/* Delete button (Admin only) */}
                      {currentUser.role === 'admin' && (
                        <button
                          onClick={() => handleDelete(bkp.filename)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                          title="Eliminar este archivo de respaldo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredBackups.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    <Archive className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <p className="text-sm font-medium">No se encontraron respaldos del sistema</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {searchQuery ? 'Prueba ajustando los criterios de búsqueda.' : 'Crea tu primer snapshot con el botón "Crear Respaldo Ahora".'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="py-2.5 px-4 border-t border-slate-800 bg-slate-900/30 text-xs text-slate-500 flex items-center justify-between">
          <span className="tabular-nums">Mostrando {filteredBackups.length} de {backups.length} respaldos registrados</span>
          <span>Motor de snapshots: JSON transaccional con escrituras atómicas</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CREATE MANUAL BACKUP */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Generar Nuevo Respaldo</h3>
                  <p className="text-xs text-slate-400">Captura un snapshot completo de toda la plataforma en disco persistente.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBackup} className="space-y-4 py-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Descripción o Motivo del Respaldo (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Pre-mantenimiento Core Routers, Cambio de VLANs Campus"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Esta nota se incluirá en los metadatos del archivo para identificar el propósito del snapshot.
                </p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-400 space-y-1.5">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Elementos incluidos en este snapshot:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1">
                  <li>Todos los equipos de red, hostnames, IPs y <strong>códigos de inventario (`asset_id`)</strong>.</li>
                  <li>Perfiles de credenciales del Vault con claves cifradas en AES-256-GCM.</li>
                  <li>Directorio de usuarios y roles RBAC (Admin, Engineer, Operator, Auditor).</li>
                  <li>Historial de auditoría y comandos ejecutados en el terminal.</li>
                </ul>
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
                  disabled={isCreating}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generando Snapshot...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Crear Snapshot Ahora</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: UPLOAD EXTERNAL BACKUP */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Subir Respaldo Externo</h3>
                  <p className="text-xs text-slate-400">Importa un archivo JSON de respaldo descargado previamente de NetGateway.</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {uploadError && (
              <div className="my-3 p-3 bg-rose-950/60 border border-rose-800 rounded text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4 py-4 text-xs">
              <div
                className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/50 rounded-lg p-6 text-center cursor-pointer transition-colors"
                onClick={() => {
                  const input = document.getElementById('backup-file-picker');
                  if (input) input.click();
                }}
              >
                <input
                  id="backup-file-picker"
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleUploadFileSelected(e.target.files[0]);
                    }
                  }}
                />
                <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-white font-medium mb-1">
                  {uploadFileName ? `Archivo seleccionado: ${uploadFileName}` : 'Selecciona o arrastra tu archivo JSON de respaldo'}
                </p>
                <p className="text-slate-500 text-[11px]">Formatos aceptados: netgateway-backup-*.json</p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">O pega el contenido JSON directamente:</label>
                <textarea
                  rows={4}
                  placeholder='{"version": "1.0.0", "devices": [...], ...}'
                  value={uploadText}
                  onChange={(e) => setUploadText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadText.trim()}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Validando y Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Registrar Respaldo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIGURE AUTOMATED BACKUP SCHEDULE */}
      {/* ========================================================================= */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-950/80 border border-amber-700/60 flex items-center justify-center text-amber-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Política de Respaldos Automáticos</h3>
                  <p className="text-xs text-slate-400">Configura la frecuencia, hora y rotación de snapshots programados.</p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4 py-4 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                <div>
                  <div className="font-semibold text-white">Habilitar Scheduler Automático</div>
                  <div className="text-[11px] text-slate-400">Genera copias periódicas sin intervención del operador.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleEnabled}
                    onChange={(e) => setScheduleEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Frecuencia</label>
                  <select
                    value={scheduleFreq}
                    onChange={(e) => setScheduleFreq(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="daily">Diaria (Daily)</option>
                    <option value="weekly">Semanal (Weekly)</option>
                    <option value="hourly">Cada hora (Hourly)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Hora de Ejecución (HH:MM)</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Política de Retención (Rotación Máxima)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={scheduleRetention}
                    onChange={(e) => setScheduleRetention(Math.max(1, Number(e.target.value)))}
                    className="w-24 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-slate-400 text-xs">
                    Conservar los últimos <strong>{scheduleRetention}</strong> snapshots (elimina automáticamente los más antiguos para preservar espacio en disco).
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingSchedule}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
                >
                  {isSavingSchedule ? 'Guardando...' : 'Guardar Política'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESTORE SYSTEM CONFIRMATION (CRITICAL) */}
      {/* ========================================================================= */}
      {selectedBackupForRestore && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-600/80 rounded-xl max-w-xl w-full p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-950 border border-amber-600/60 flex items-center justify-center text-amber-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Confirmar Restauración del Sistema</h3>
                  <p className="text-xs text-amber-400/90 font-medium">Operación de alto impacto operacional</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBackupForRestore(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="bg-amber-950/40 border border-amber-800/60 rounded-lg p-3.5 text-amber-200 space-y-2">
                <p className="font-semibold">
                  Estás a punto de restaurar la plataforma al snapshot:
                </p>
                <div className="font-mono text-xs bg-slate-950/70 p-2 rounded border border-amber-900/50 text-white">
                  {selectedBackupForRestore.filename} ({selectedBackupForRestore.size_formatted})
                </div>
                <p className="text-[11px] text-amber-300/80">
                  ⚠️ Los datos actuales del sistema serán sobrescritos por el contenido de este archivo.
                </p>
              </div>

              {/* Safety Pre-Restore Guarantee */}
              <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-lg p-3 text-emerald-300 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-emerald-200">Garantía de Snapshot de Seguridad:</div>
                  <div className="text-[11px] text-emerald-400/90 mt-0.5">
                    Antes de aplicar los cambios, el servidor generará automáticamente una copia de seguridad del estado actual. Si algo falla o necesitas revertir, podrás restaurar ese snapshot de seguridad.
                  </div>
                </div>
              </div>

              {/* Selective components checklist */}
              <div>
                <label className="block text-slate-300 font-semibold mb-2">
                  Selecciona los módulos a restaurar:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={restoreComponents.devices}
                      onChange={(e) => setRestoreComponents({ ...restoreComponents, devices: e.target.checked })}
                      className="rounded text-cyan-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-medium text-white">Inventario de Equipos</div>
                      <div className="text-[10px] text-slate-400">{selectedBackupForRestore.device_count} routers, switches e IPs</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={restoreComponents.credentials}
                      onChange={(e) => setRestoreComponents({ ...restoreComponents, credentials: e.target.checked })}
                      className="rounded text-cyan-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-medium text-white">Vault de Credenciales</div>
                      <div className="text-[10px] text-slate-400">{selectedBackupForRestore.credential_count} perfiles cifrados</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={restoreComponents.users}
                      onChange={(e) => setRestoreComponents({ ...restoreComponents, users: e.target.checked })}
                      className="rounded text-cyan-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-medium text-white">Usuarios y Roles RBAC</div>
                      <div className="text-[10px] text-slate-400">{selectedBackupForRestore.user_count} cuentas locales</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={restoreComponents.audit_logs}
                      onChange={(e) => setRestoreComponents({ ...restoreComponents, audit_logs: e.target.checked })}
                      className="rounded text-cyan-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-medium text-white">Historial de Auditoría</div>
                      <div className="text-[10px] text-slate-400">Fusionar registros históricos</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedBackupForRestore(null)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isRestoring}
                  onClick={handleConfirmRestore}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-sm shadow-amber-600/30"
                >
                  {isRestoring ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Restaurando Plataforma...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Confirmar y Restaurar Estado</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
