# NetGateway — Enterprise Network Device Inventory & Web Terminal Gateway

[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![xterm.js](https://img.shields.io/badge/xterm.js-5.3+-F34F29?logo=gnometerminal&logoColor=white)](https://xtermjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

**NetGateway** is a secure, enterprise-grade web platform for managing network infrastructure inventory and providing full, interactive browser CLI access directly to routers, switches, next-generation firewalls, and out-of-band console servers.

It bridges web clients and physical/virtual network equipment (Cisco, HP/Aruba Comware, Palo Alto PAN-OS, OpenGear, etc.) using a non-blocking asynchronous architecture over WebSockets and Pseudo-Terminal (PTY) allocation.

---

## 🚀 Key Features

### 1. Interactive Web Terminal Gateway (`xterm.js` + WebSockets + PTY)
- **Bidirectional Stream Piping**: Keystrokes are captured via `term.onData`, piped over WebSocket to the backend PTY, and standard output/error chunks are streamed back in real-time.
- **Dynamic Sizing**: Powered by `FitAddon` and `ResizeObserver` to synchronize terminal dimensions (`cols` and `rows`) with the server without text clipping.
- **Multi-Device Tabbed Interface**: Open and maintain simultaneous active CLI sessions across multiple switches, firewalls, and core routers with 1-click tab switching.
- **Network Vendor Engines & Direct SSH**:
  - **Cisco Systems (IOS-XE)**: Privilege modes (`Router>`, `Router#`, `Router(config)#`), `enable`, `conf t`, `show ip int brief`, `show run`, `show version`, `ping`, and NVRAM save (`write memory`).
  - **HP / Aruba (Comware v7)**: `<HPE>` user view, `[HPE]` system-view, `display current-configuration`, `display ip int brief`, and `save`.
  - **Palo Alto Networks (PAN-OS)**: `admin@PA-5220>`, `configure`, `show system info`, and candidate `commit` jobs.
  - **Terminal Server Out-of-band Pods**: Serial line access (ports 2001+) for emergency recovery.
- **Terminal Customization**: 4 color palettes (*Dark Slate*, *Cyber Cyan*, *Matrix Green*, *Amber CRT*), font resizing, clear screen buffer, buffer copy, and quick-send command toolbar.

### 2. Device Inventory & Infrastructure Registry
- **Comprehensive Asset Metadata**: Hostname, management IP, vendor, model, firmware/OS version, connection protocol (SSH, Telnet, Console Server), port, rack location, and tags.
- **Zero-Pill Typographic Discipline**: Clean, high-density table interface with unboxed metadata separators (`·` and `/`) preventing visual clutter.
- **ICMP Prober**: Live ping utility measuring round-trip time (RTT) and packet loss percentage.
- **Asset Lifecycle**: Add, inspect, update, and decommission hardware with validation and audit logging.

### 3. Role-Based Access Control (RBAC) & User Management
- **Enterprise Authentication**: JSON Web Tokens (JWT) signed with HMAC-SHA256 and passwords hashed with `bcrypt (salt 10)`.
- **4 Granular RBAC Roles**:
  - 🛡️ **Administrator (`admin`)**: Complete platform control, user creation/deletion, credential vault management, asset CRUD.
  - ⚡ **Network Engineer (`net_engineer`)**: Inventory asset management and interactive Web CLI terminal access.
  - 🖥️ **NOC Operator (`operator`)**: Terminal execution and diagnostics on authorized equipment.
  - 📋 **Compliance Auditor (`auditor`)**: Strict read-only access to inventory and audit logs (interactive CLI execution is blocked by policy).
- **User Management Portal**: Full CRUD to register new engineers, assign custom permissions, toggle accounts between *Active* and *Suspended*, or reset passwords.

### 4. Credentials Vault (AES-256-GCM)
- **Zero-Knowledge Storage**: Stores TACACS+ credentials, SSH Ed25519/RSA private keys, and Cisco privilege level 15 Enable secrets.
- **At-Rest Encryption**: Encrypted using AES-256-GCM with 12-byte initialization vectors and authentication tags. Cleartext secrets are never exposed in logs or client-facing API responses.

### 5. Security Audit Trail & Compliance Log
- **Granular Command Recording**: Logs every interactive CLI command, session connection, disconnection, user change, and asset creation.
- **CSV Export**: One-click export of audit logs for SOC2, ISO 27001, and PCI-DSS compliance audits.

### 6. Network Topology & Access Matrix
- **Logical Architectural Map**: Visual breakdown across Perimeter Security, Datacenter Core, Switched Aggregation Fabric, Campus Access, and Out-of-band Console Pods with direct terminal launch shortcuts.

---

## 📁 Repository Structure

```
├── backend/                       # Python 3.11+ FastAPI Reference Architecture
│   ├── app/
│   │   ├── main.py                # FastAPI entry point & WebSocket route
│   │   └── services/
│   │       └── terminal_bridge.py # asyncssh PTY bidirectional stream piping
│   └── requirements.txt           # Python dependencies (FastAPI, asyncssh, asyncpg)
├── src/                           # Frontend React 19 Application
│   ├── components/
│   │   ├── Navbar.tsx             # 3-zone header following Top Bar Contract
│   │   ├── LoginScreen.tsx        # Authentication screen with demo profiles
│   │   ├── DeviceInventory.tsx    # High-density inventory table & prober
│   │   ├── WebTerminal.tsx        # xterm.js terminal with FitAddon & multi-tabs
│   │   ├── CredentialsVault.tsx   # AES-256 encrypted secrets manager
│   │   ├── UserManagement.tsx     # RBAC user creation & status controls
│   │   ├── AuditLogView.tsx       # Security audit logs with CSV export
│   │   └── TopologyView.tsx       # Hierarchical access matrix visualizer
│   ├── services/
│   │   └── api.ts                 # Typed client API & JWT session manager
│   ├── types/
│   │   └── index.ts               # Core domain entity definitions
│   ├── App.tsx                    # Main root component & state orchestrator
│   └── index.css                  # Tailwind CSS v4 configuration
├── Dockerfile                     # Multi-stage production container build
├── docker-compose.yml             # Single-command container deployment
├── nginx.conf                     # Nginx reverse proxy with WebSocket upgrade
├── DEPLOYMENT.md                  # Comprehensive server deployment guide
├── server.ts                      # Full-stack Node.js + Express + WebSocket server
└── package.json                   # Dependencies and build scripts
```

---

## ⚡ Quick Start (Local Development)

### Prerequisites
- Node.js `20.x` or `22.x` LTS
- npm `10.x+`

### Installation & Execution
```bash
# 1. Clone the repository
git clone https://github.com/tu-usuario/netgateway.git
cd netgateway

# 2. Install dependencies
npm install

# 3. Start development server (Frontend + Backend on port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🐳 Docker Deployment (Production)

To deploy NetGateway on any Linux server, Proxmox VM, or cloud instance:

```bash
# 1. Create your environment configuration
cp .env.example .env
# Edit .env to set a secure JWT_SECRET

# 2. Build and run with Docker Compose
docker compose up -d --build

# 3. View logs
docker compose logs -f
```

The service will be listening on port `3000` (or `443` if using Nginx reverse proxy).

For detailed production instructions, systemd service setup, and VLAN network routing, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 🔑 Initial Administrator Account & Security Hardening

Authentication is strictly enforced across all REST and WebSocket endpoints. There are no client-side role bypasses or demo shortcuts:

| Role | Initial Username | Initial Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `AdminPassword2026!` | Full platform control, User management, Vault, Inventory CRUD, Web CLI |

> 🔒 **Security Notice for Production:**
> After first deployment, immediately log in as `admin`, navigate to **`Users & RBAC`**, and change the initial administrator password or create personalized administrator accounts. All passwords are encrypted at rest using `bcrypt (salt 10)`.

---

## 🔌 Connecting to Real Physical / Virtual Hardware

To bridge to physical switches or virtual labs (EVE-NG, GNS3, Cisco CML, Proxmox):

1. Ensure the host running NetGateway has routed IP reachability to your management VLAN.
2. In NetGateway, navigate to **`Credentials Vault`** and register the SSH username and password (or private key).
3. Under **`Inventory`**, click **`+ Add Network Device`** and enter the real management IP address and port (`22` for direct SSH, `2001+` for console servers).
4. Click **`Ping`** to verify ICMP latency.
5. Click **`Web CLI`** to establish a real-time, bidirectional pseudo-terminal directly in your browser.

---

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.
