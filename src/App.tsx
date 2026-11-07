import React, { useEffect, useState } from 'react';
import type { Device, Credential, AuditLogEntry, User, UserRole, ActiveTerminalTab } from './types/index.ts';
import { 
  fetchDevices, 
  fetchCredentials, 
  fetchAuditLogs, 
  createDevice, 
  bulkImportDevices,
  updateDevice, 
  deleteDevice, 
  pingDevice,
  createCredential,
  updateCredential,
  deleteCredential,
  getStoredUser,
  getStoredToken,
  clearSession 
} from './services/api.ts';
import { Navbar } from './components/Navbar.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { DeviceInventory } from './components/DeviceInventory.tsx';
import { WebTerminal } from './components/WebTerminal.tsx';
import { CredentialsVault } from './components/CredentialsVault.tsx';
import { AuditLogView } from './components/AuditLogView.tsx';
import { TopologyView } from './components/TopologyView.tsx';
import { UserManagement } from './components/UserManagement.tsx';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const token = getStoredToken();
    const stored = getStoredUser();
    return token && stored ? stored : null;
  });

  const [currentView, setCurrentView] = useState<'inventory' | 'terminal' | 'credentials' | 'audit' | 'topology' | 'users'>('inventory');
  const [devices, setDevices] = useState<Device[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Active terminal sessions
  const [terminalTabs, setTerminalTabs] = useState<ActiveTerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [devs, creds, logs] = await Promise.all([
        fetchDevices(),
        fetchCredentials(),
        fetchAuditLogs(),
      ]);
      setDevices(devs);
      setCredentials(creds);
      setAuditLogs(logs);

      // Pre-open the primary Core Router session if tabs are empty
      if (devs.length > 0 && terminalTabs.length === 0) {
        const coreDev = devs[0];
        const initialTab: ActiveTerminalTab = {
          tabId: `tab-${coreDev.id}`,
          deviceId: coreDev.id,
          device: coreDev,
          connected: true,
          startTime: Date.now(),
          title: coreDev.hostname,
        };
        setTerminalTabs([initialTab]);
        setActiveTabId(initialTab.tabId);
      }
    } catch (err) {
      console.error('Data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser?.id, currentUser?.role]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentView('inventory');
  };

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    setTerminalTabs([]);
    setActiveTabId(null);
  };


  const handleLaunchTerminal = (device: Device) => {
    const existing = terminalTabs.find(t => t.deviceId === device.id);
    if (existing) {
      setActiveTabId(existing.tabId);
      setCurrentView('terminal');
      return;
    }

    const newTab: ActiveTerminalTab = {
      tabId: `tab-${device.id}-${Date.now().toString(36)}`,
      deviceId: device.id,
      device: device,
      connected: true,
      startTime: Date.now(),
      title: device.hostname,
    };

    setTerminalTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.tabId);
    setCurrentView('terminal');
  };

  const handleCloseTerminalTab = (tabId: string) => {
    setTerminalTabs(prev => {
      const updated = prev.filter(t => t.tabId !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(updated.length > 0 ? updated[updated.length - 1].tabId : null);
      }
      return updated;
    });
  };

  const reloadData = async () => {
    try {
      const [devs, creds, logs] = await Promise.all([
        fetchDevices(),
        fetchCredentials(),
        fetchAuditLogs(),
      ]);
      setDevices(devs);
      setCredentials(creds);
      setAuditLogs(logs);
    } catch (e) {
      console.error('Reload failed:', e);
    }
  };

  const handleAddDevice = async (deviceData: Partial<Device>) => {
    await createDevice(deviceData);
    await reloadData();
  };

  const handleBulkImportDevices = async (deviceList: Partial<Device>[]) => {
    const res = await bulkImportDevices(deviceList);
    await reloadData();
    return res;
  };

  const handleUpdateDevice = async (id: string, updates: Partial<Device>) => {
    await updateDevice(id, updates);
    await reloadData();
  };

  const handleDeleteDevice = async (id: string) => {
    await deleteDevice(id);
    await reloadData();
  };

  const handleAddCredential = async (data: any) => {
    await createCredential(data);
    await reloadData();
  };

  const handleUpdateCredential = async (id: string, data: any) => {
    await updateCredential(id, data);
    await reloadData();
  };

  const handleDeleteCredential = async (id: string) => {
    await deleteCredential(id);
    await reloadData();
  };

  // If unauthenticated, show enterprise login screen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      {/* Top Bar Contract Navigation */}
      <Navbar
        currentTab={currentView}
        onSelectTab={setCurrentView}
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTerminalCount={terminalTabs.length}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <div className="text-sm font-mono text-slate-400">Cargando servicios de NetGateway...</div>
            </div>
          </div>
        ) : (
          <>
            {currentView === 'inventory' && (
              <DeviceInventory
                devices={devices}
                credentials={credentials}
                onLaunchTerminal={handleLaunchTerminal}
                onAddDevice={handleAddDevice}
                onBulkImportDevices={handleBulkImportDevices}
                onUpdateDevice={handleUpdateDevice}
                onDeleteDevice={handleDeleteDevice}
                onPingDevice={pingDevice}
                currentUser={currentUser}
                refreshDevices={reloadData}
              />
            )}

            {currentView === 'terminal' && (
              <WebTerminal
                tabs={terminalTabs}
                activeTabId={activeTabId}
                onSelectTab={setActiveTabId}
                onCloseTab={handleCloseTerminalTab}
                onNewSession={handleLaunchTerminal}
                availableDevices={devices}
                currentUser={currentUser}
              />
            )}

            {currentView === 'credentials' && (
              <CredentialsVault
                credentials={credentials}
                currentUser={currentUser}
                onAddCredential={handleAddCredential}
                onUpdateCredential={handleUpdateCredential}
                onDeleteCredential={handleDeleteCredential}
                refreshCredentials={reloadData}
              />
            )}

            {currentView === 'audit' && (
              <AuditLogView
                logs={auditLogs}
                refreshLogs={reloadData}
              />
            )}

            {currentView === 'topology' && (
              <TopologyView
                devices={devices}
                onLaunchTerminal={handleLaunchTerminal}
                onPingDevice={pingDevice}
              />
            )}

            {currentView === 'users' && currentUser.role === 'admin' && (
              <UserManagement
                currentUser={currentUser}
                onRefreshSession={reloadData}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
