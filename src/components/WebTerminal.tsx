import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import type { Device, ActiveTerminalTab, User } from '../types/index.ts';
import { getStoredToken } from '../services/api.ts';
import { 
  Play, 
  RotateCcw, 
  Trash2, 
  Copy, 
  Check, 
  X, 
  Maximize2, 
  Terminal as TerminalIcon,
  Activity,
  Layers,
  ChevronRight,
  ShieldAlert,
  Bug,
  Code2,
  Pause,
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  Send,
  Eye,
  EyeOff
} from 'lucide-react';

export interface RawStreamEntry {
  id: string;
  timestamp: string; // HH:mm:ss.SSS
  direction: 'TX' | 'RX'; // TX = Client -> SSH Bridge; RX = SSH Bridge -> Client
  text: string;
  hex: string;
  byteLength: number;
  charCodes: number[];
}

interface WebTerminalProps {
  tabs: ActiveTerminalTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewSession: (device: Device) => void;
  availableDevices: Device[];
  currentUser: User;
}

export const WebTerminal: React.FC<WebTerminalProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewSession,
  availableDevices,
  currentUser,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<number>(14);
  const [terminalTheme, setTerminalTheme] = useState<'slate' | 'cyber' | 'matrix' | 'amber'>('slate');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [sessionDuration, setSessionDuration] = useState<string>('00:00');
  const [quickCmdInput, setQuickCmdInput] = useState('');

  // Raw Stream Inspector & Packet Debugger State
  const [showInspector, setShowInspector] = useState(false);
  const [rawLogs, setRawLogs] = useState<RawStreamEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'TX' | 'RX'>('ALL');
  const [viewFormat, setViewFormat] = useState<'visual' | 'hex' | 'both'>('both');
  const [autoScroll, setAutoScroll] = useState(true);
  const [testCmdInput, setTestCmdInput] = useState('show version');
  const [testEol, setTestEol] = useState<'CR' | 'CRLF' | 'LF' | 'NONE'>('CR');
  const [logsCopied, setLogsCopied] = useState(false);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const logRawStream = (direction: 'TX' | 'RX', rawData: unknown) => {
    if (isPausedRef.current) return;
    const text = typeof rawData === 'string' ? rawData : String(rawData ?? '');
    if (!text) return;

    const now = new Date();
    const timeStr = `${now.toTimeString().split(' ')[0]}.${String(now.getMilliseconds()).padStart(3, '0')}`;
    const charCodes = Array.from(text).map(c => c.charCodeAt(0));
    const hex = charCodes.map(code => code.toString(16).padStart(2, '0')).join(' ');

    const entry: RawStreamEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: timeStr,
      direction,
      text,
      hex,
      byteLength: text.length,
      charCodes,
    };

    // Also output to browser DevTools console for deep debugging
    const color = direction === 'TX' ? '#38bdf8' : '#34d399';
    console.debug(`%c[WebTerminal ${direction}] (${text.length}B)%c ${text} | HEX: ${hex}`, `color: ${color}; font-weight: bold`, 'color: #94a3b8');

    setRawLogs(prev => {
      const next = [...prev, entry];
      if (next.length > 500) {
        return next.slice(next.length - 500);
      }
      return next;
    });
  };

  // Auto-scroll inspector logs
  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [rawLogs, autoScroll]);

  // Re-fit xterm when inspector panel is toggled
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fitAddonRef.current && termInstanceRef.current) {
        fitAddonRef.current.fit();
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'resize',
            cols: termInstanceRef.current.cols,
            rows: termInstanceRef.current.rows,
          }));
        }
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [showInspector]);

  const currentTab = tabs.find(t => t.tabId === activeTabId);

  // Theme palettes for xterm
  const themes = {
    slate: {
      background: '#090d16',
      foreground: '#e2e8f0',
      cursor: '#38bdf8',
      selectionBackground: '#0284c740',
      black: '#1e293b',
      red: '#ef4444',
      green: '#10b981',
      yellow: '#f59e0b',
      blue: '#3b82f6',
      magenta: '#a855f7',
      cyan: '#06b6d4',
      white: '#f8fafc',
      brightBlack: '#64748b',
      brightRed: '#f87171',
      brightGreen: '#34d399',
      brightYellow: '#fbbf24',
      brightBlue: '#60a5fa',
      brightMagenta: '#c084fc',
      brightCyan: '#22d3ee',
      brightWhite: '#ffffff',
    },
    cyber: {
      background: '#040b14',
      foreground: '#38bdf8',
      cursor: '#00f0ff',
      selectionBackground: '#00f0ff33',
      black: '#0f172a',
      red: '#ff2a55',
      green: '#00ffaa',
      yellow: '#ffd600',
      blue: '#00b4d8',
      magenta: '#d946ef',
      cyan: '#00f0ff',
      white: '#e0f2fe',
    },
    matrix: {
      background: '#020d06',
      foreground: '#22c55e',
      cursor: '#4ade80',
      selectionBackground: '#22c55e33',
      black: '#052e16',
      red: '#ef4444',
      green: '#22c55e',
      yellow: '#eab308',
      blue: '#3b82f6',
      magenta: '#ec4899',
      cyan: '#14b8a6',
      white: '#86efac',
    },
    amber: {
      background: '#0d0a02',
      foreground: '#f59e0b',
      cursor: '#fbbf24',
      selectionBackground: '#f59e0b33',
      black: '#291d03',
      red: '#ef4444',
      green: '#10b981',
      yellow: '#f59e0b',
      blue: '#3b82f6',
      magenta: '#d946ef',
      cyan: '#06b6d4',
      white: '#fde68a',
    },
  };

  // Session duration timer
  useEffect(() => {
    if (!currentTab || connectionStatus !== 'connected') return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - currentTab.startTime) / 1000);
      const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const secs = (elapsed % 60).toString().padStart(2, '0');
      setSessionDuration(`${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [currentTab, connectionStatus]);

  // Connect to terminal session via WebSocket
  useEffect(() => {
    if (!currentTab || !terminalRef.current) return;

    if (currentUser.role === 'auditor') {
      setConnectionStatus('error');
      return;
    }

    setConnectionStatus('connecting');

    // Clean up previous terminal instance if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (termInstanceRef.current) {
      termInstanceRef.current.dispose();
      termInstanceRef.current = null;
    }

    // Initialize xterm
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: fontSize,
      lineHeight: 1.25,
      theme: themes[terminalTheme],
      scrollback: 5000,
      convertEol: true,
      allowTransparency: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    termInstanceRef.current = term;
    fitAddonRef.current = fitAddon;

    // Connect WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = getStoredToken() || '';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/ws/terminal/${currentTab.deviceId}?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      // Send initial terminal dimensions
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'resize',
          cols: term.cols,
          rows: term.rows,
        }));
      }
    };

    ws.onmessage = (event) => {
      const rawText = typeof event.data === 'string' ? event.data : '';
      logRawStream('RX', rawText);
      term.write(event.data);
    };

    ws.onerror = () => {
      setConnectionStatus('error');
      term.write('\r\n\x1b[31m[WebSocket Connection Error - Gateway handshake failed]\x1b[0m\r\n');
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
    };

    // Piping user keystrokes into WebSocket
    const onDataDisposable = term.onData((data) => {
      logRawStream('TX', data);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    // Resize observer
    const handleResize = () => {
      try {
        if (fitAddonRef.current && termInstanceRef.current && ws.readyState === WebSocket.OPEN) {
          fitAddonRef.current.fit();
          ws.send(JSON.stringify({
            type: 'resize',
            cols: termInstanceRef.current.cols,
            rows: termInstanceRef.current.rows,
          }));
        }
      } catch (e) {
        // Ignore resize during tab switches
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      onDataDisposable.dispose();
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      term.dispose();
    };
  }, [currentTab?.tabId, terminalTheme, currentUser.role]);

  // Update font size
  useEffect(() => {
    if (termInstanceRef.current && fitAddonRef.current) {
      termInstanceRef.current.options.fontSize = fontSize;
      fitAddonRef.current.fit();
    }
  }, [fontSize]);

  const sendCommand = (cmd: string, eol: 'CR' | 'CRLF' | 'LF' | 'NONE' = 'CR') => {
    const eolMap = {
      CR: '\r',
      CRLF: '\r\n',
      LF: '\n',
      NONE: '',
    };
    const payload = cmd + eolMap[eol];
    logRawStream('TX', payload);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(payload);
    }
  };

  const handleCopyBuffer = () => {
    if (!termInstanceRef.current) return;
    termInstanceRef.current.selectAll();
    const text = termInstanceRef.current.getSelection();
    termInstanceRef.current.clearSelection();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (termInstanceRef.current) {
      termInstanceRef.current.clear();
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send('\x0c'); // Form feed / Ctrl+L
      }
    }
  };

  const handleReconnect = () => {
    if (currentTab) {
      // Re-trigger effect by re-selecting tab
      onSelectTab(currentTab.tabId);
    }
  };

  if (currentUser.role === 'auditor') {
    return (
      <div className="max-w-4xl mx-auto my-12 p-8 border border-amber-800/40 bg-slate-900 rounded-xl text-center">
        <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Interactive Terminal Restricted</h2>
        <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
          Your current user role (<strong className="text-amber-300">Auditor</strong>) enforces strict read-only compliance access. Direct interactive CLI execution is disabled by RBAC policy.
        </p>
        <div className="text-xs text-slate-500">
          Switch to <span className="text-cyan-400 font-semibold">Admin</span>, <span className="text-cyan-400 font-semibold">Engineer</span>, or <span className="text-cyan-400 font-semibold">Operator</span> in the top right to launch CLI sessions.
        </div>
      </div>
    );
  }

  // Quick command suggestions based on vendor
  const vendorQuickCommands = currentTab?.device.vendor === 'Cisco'
    ? [
        { label: 'sh ip int br', cmd: 'show ip interface brief' },
        { label: 'sh run', cmd: 'show running-config' },
        { label: 'sh ver', cmd: 'show version' },
        { label: 'enable', cmd: 'enable' },
        { label: 'conf t', cmd: 'configure terminal' },
        { label: 'ping 8.8.8.8', cmd: 'ping 8.8.8.8' },
        { label: 'write mem', cmd: 'write memory' },
      ]
    : currentTab?.device.vendor === 'HP/Aruba'
    ? [
        { label: 'dis cur', cmd: 'display current-configuration' },
        { label: 'dis ip int br', cmd: 'display ip interface brief' },
        { label: 'dis ver', cmd: 'display version' },
        { label: 'sys', cmd: 'system-view' },
        { label: 'save', cmd: 'save' },
      ]
    : currentTab?.device.vendor === 'Palo Alto'
    ? [
        { label: 'show sys info', cmd: 'show system info' },
        { label: 'configure', cmd: 'configure' },
        { label: 'commit', cmd: 'commit' },
        { label: 'exit', cmd: 'exit' },
      ]
    : [
        { label: 'ping 8.8.8.8', cmd: 'ping 8.8.8.8' },
        { label: 'exit', cmd: 'exit' },
      ];

  return (
    <div className="flex flex-col h-[calc(100vh-4.1rem)] bg-slate-950">
      
      {/* Tab bar for multi-device concurrent sessions */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 pt-2 flex items-center justify-between gap-4 overflow-x-auto shrink-0">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = tab.tabId === activeTabId;
            return (
              <div
                key={tab.tabId}
                onClick={() => onSelectTab(tab.tabId)}
                className={`group flex items-center gap-2 px-3 py-2 text-xs font-mono rounded-t-md cursor-pointer transition-all border-t-2 select-none ${
                  isActive
                    ? 'bg-slate-950 text-cyan-400 border-cyan-500 font-semibold shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 border-transparent hover:bg-slate-850 hover:text-slate-200'
                }`}
              >
                <TerminalIcon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span className="truncate max-w-[140px]">{tab.device.hostname}</span>
                <span className="text-slate-600 font-sans">({tab.device.management_ip})</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.tabId);
                  }}
                  className="p-0.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 ml-1 opacity-60 group-hover:opacity-100"
                  title="Close Terminal Session"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {tabs.length === 0 && (
            <div className="text-xs text-slate-500 py-2 italic flex items-center gap-2">
              <span>No active terminal sessions. Launch a device below or from the inventory.</span>
            </div>
          )}
        </div>

        {/* Quick Launch New Session Dropdown */}
        <div className="flex items-center gap-2 pb-2">
          <select
            onChange={(e) => {
              const dev = availableDevices.find(d => d.id === e.target.value);
              if (dev) onNewSession(dev);
              e.target.value = '';
            }}
            defaultValue=""
            className="text-xs bg-slate-800 text-slate-300 border border-slate-700 rounded px-2.5 py-1 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="" disabled>+ Connect Device...</option>
            {availableDevices.map(d => (
              <option key={d.id} value={d.id}>
                {d.hostname} ({d.management_ip} - {d.vendor})
              </option>
            ))}
          </select>
        </div>
      </div>

      {currentTab ? (
        <div className="flex flex-col flex-1 min-h-0 bg-slate-950">
          {/* Terminal Session Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-slate-800/80 bg-slate-900/40 text-xs text-slate-300 shrink-0">
            {/* Left metadata */}
            <div className="flex items-center gap-3 font-mono">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                      : connectionStatus === 'connecting'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-red-500'
                  }`}
                />
                <span className="font-semibold text-white">{currentTab.device.hostname}</span>
              </div>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">{currentTab.device.management_ip}:{currentTab.device.port}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">{currentTab.device.vendor} [{currentTab.device.os_version}]</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400 tabular-nums">PTY Session: {sessionDuration}</span>
            </div>

            {/* Right action controls */}
            <div className="flex items-center gap-2">
              {/* Theme selector */}
              <select
                value={terminalTheme}
                onChange={(e) => setTerminalTheme(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none"
                title="Terminal Theme"
              >
                <option value="slate">Dark Slate</option>
                <option value="cyber">Cyber Cyan</option>
                <option value="matrix">Matrix Green</option>
                <option value="amber">Amber CRT</option>
              </select>

              {/* Font size */}
              <div className="flex items-center border border-slate-700 bg-slate-800 rounded">
                <button
                  onClick={() => setFontSize(Math.max(11, fontSize - 1))}
                  className="px-2 py-0.5 text-slate-300 hover:text-white hover:bg-slate-700"
                  title="Decrease font"
                >
                  -
                </button>
                <span className="px-1.5 text-slate-400 font-mono text-xs">{fontSize}px</span>
                <button
                  onClick={() => setFontSize(Math.min(20, fontSize + 1))}
                  className="px-2 py-0.5 text-slate-300 hover:text-white hover:bg-slate-700"
                  title="Increase font"
                >
                  +
                </button>
              </div>

              {/* Clear buffer */}
              <button
                onClick={handleClear}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="Clear screen buffer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Copy buffer */}
              <button
                onClick={handleCopyBuffer}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="Copy terminal buffer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {/* Reconnect */}
              <button
                onClick={handleReconnect}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="Reconnect session"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Raw Stream Inspector Toggle */}
              <button
                onClick={() => setShowInspector(!showInspector)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
                  showInspector
                    ? 'bg-cyan-950/90 border-cyan-500 text-cyan-300 shadow-sm'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title="Toggle Raw Stream Inspector & Line-Ending Debugger"
              >
                <Bug className={`w-3.5 h-3.5 ${showInspector ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>Stream Inspector</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-900/60 text-cyan-300 border border-cyan-800/80">
                  {rawLogs.length}
                </span>
              </button>
            </div>
          </div>

          {/* Quick command suggestion toolbar for network engineers */}
          <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-900/60 border-b border-slate-800/60 overflow-x-auto text-xs shrink-0">
            <span className="text-slate-500 font-mono text-[11px] whitespace-nowrap">Quick Send:</span>
            {vendorQuickCommands.map((item, idx) => (
              <button
                key={idx}
                onClick={() => sendCommand(item.cmd)}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 rounded text-xs font-mono transition-colors whitespace-nowrap border border-slate-700/50"
              >
                {item.label}
              </button>
            ))}

            {/* Custom command one-liner */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (quickCmdInput.trim()) {
                  sendCommand(quickCmdInput.trim());
                  setQuickCmdInput('');
                }
              }}
              className="flex items-center gap-1 ml-auto shrink-0"
            >
              <input
                type="text"
                placeholder="Type CLI command + Enter..."
                value={quickCmdInput}
                onChange={(e) => setQuickCmdInput(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-2.5 py-0.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-48 font-mono"
              />
              <button
                type="submit"
                className="px-2 py-0.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-xs"
              >
                Send
              </button>
            </form>
          </div>

          {/* xterm.js container */}
          <div className="relative flex-1 w-full bg-[#090d16] p-2 min-h-0 overflow-hidden">
            <div ref={terminalRef} className="w-full h-full" />
          </div>

          {/* Terminal Bottom Status Bar */}
          <div className="flex items-center justify-between px-4 py-1 bg-slate-950 border-t border-slate-800 text-[11px] font-mono text-slate-400 shrink-0">
            <div className="flex items-center gap-4">
              <span>Status: <span className={connectionStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'}>{connectionStatus.toUpperCase()}</span></span>
              <span>Encoding: UTF-8</span>
              <span>Emulation: xterm-256color</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Auth: {currentUser.username} ({currentUser.role})</span>
              <span>Protocol: {currentTab.device.connection_type} / PTY</span>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center bg-slate-950">
          <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 mb-4 shadow-inner">
            <TerminalIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Active Terminal Sessions</h3>
          <p className="text-slate-400 text-sm max-w-md mb-6">
            Launch a real-time interactive CLI session targeting any core router, edge firewall, access switch, or out-of-band console server.
          </p>

          <div className="w-full max-w-2xl bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 text-left">
              Quick Connect to Inventory Device
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              {availableDevices.slice(0, 4).map((dev) => (
                <div
                  key={dev.id}
                  onClick={() => onNewSession(dev)}
                  className="flex items-center justify-between p-3 rounded bg-slate-850 hover:bg-slate-800 border border-slate-700/60 hover:border-cyan-500/50 cursor-pointer transition-all group"
                >
                  <div>
                    <div className="text-xs font-mono font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">
                      {dev.hostname}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {dev.management_ip} · {dev.vendor} {dev.model}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
