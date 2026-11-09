# NetGateway — Enterprise Network Device Inventory & Web Terminal Gateway

> **Language / Idioma:** **English (Primary)** | [Versión en Español (Secundaria)](#netgateway--inventario-de-dispositivos-de-red-y-gateway-de-terminal-web-empresarial-español)

[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![xterm.js](https://img.shields.io/badge/xterm.js-5.3+-F34F29?logo=gnometerminal&logoColor=white)](https://xtermjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Podman](https://img.shields.io/badge/Podman-Rootless_Ready-892CA0?logo=podman&logoColor=white)](https://podman.io/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

**NetGateway** is a secure, enterprise-grade web platform for managing network infrastructure inventory and providing full, interactive browser CLI access directly to routers, switches, next-generation firewalls, and out-of-band console servers.

It bridges web clients and physical/virtual network equipment (Cisco, HP/Aruba Comware, Palo Alto PAN-OS, OpenGear, etc.) using a non-blocking asynchronous architecture over WebSockets and Pseudo-Terminal (PTY) allocation.

---

## 📋 Table of Contents
1. [Key Features](#-key-features)
2. [Repository Structure](#-repository-structure)
3. [Quick Start (Local Development)](#-quick-start-local-development)
4. [Docker & Podman Deployment (Production)](#-docker--podman-deployment-production)
5. [Initial Administrator Account & Security Hardening](#-initial-administrator-account--security-hardening)
6. [Connecting to Real Physical / Virtual Hardware](#-connecting-to-real-physical--virtual-hardware)
7. [Versión en Español (Documentación Secundaria)](#netgateway--inventario-de-dispositivos-de-red-y-gateway-de-terminal-web-empresarial-español)

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
- **Credential Profile Binding**: Visual display of linked vault credentials per device with instant inline reassignment capability.
- **Bulk Import Engine (CSV & JSON)**: Import hundreds of devices in a single batch via file upload (drag-and-drop) or direct text pasting. Includes downloadable CSV/JSON templates, real-time syntax and IP validation, and an interactive live preview table before committing.
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
- **Dynamic Device Accounting**: Real-time counter of network inventory assets currently linked to each credential profile.

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
│   │   ├── Navbar.tsx             # Top navigation bar with active session counters
│   │   ├── LoginScreen.tsx        # Strict username/password authentication screen
│   │   ├── DeviceInventory.tsx    # High-density inventory table, prober & vault linker
│   │   ├── WebTerminal.tsx        # xterm.js terminal with FitAddon & multi-tabs
│   │   ├── CredentialsVault.tsx   # AES-256-GCM encrypted secrets manager
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
├── DEPLOYMENT.md                  # Comprehensive server deployment guide (EN / ES)
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

## 🐳 Docker & Podman Deployment (Production)

To deploy NetGateway on any Linux server, Proxmox VM, or cloud instance using OCI containers:

### With Docker & Docker Compose:
```bash
# 1. Create your environment configuration
cp .env.example .env
# Edit .env to set a secure JWT_SECRET

# 2. Build and run with Docker Compose
docker compose up -d --build

# 3. View logs
docker compose logs -f
```

### With Podman (Rootless & Enterprise Linux):
```bash
# Option A: Run via Podman Compose (enable socket first if required by plugin)
systemctl --user enable --now podman.socket
podman compose up -d --build

# Option B: Run via native Podman CLI (Daemonless - No socket needed!)
podman build -t netgateway:latest .
podman run -d --name netgateway --restart unless-stopped -p 3000:3000 --env-file .env netgateway:latest
```

> 💡 *If `podman compose` reports `podman.sock: connect: no such file or directory`, run `systemctl --user enable --now podman.socket` or use Option B (native CLI).*

The service will be listening on port `3000` (or `443` if using Nginx reverse proxy).

For detailed production instructions, Podman Quadlet / systemd autostart, and isolated VLAN host networking, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 🔑 Initial Administrator Account & Security Hardening

Authentication is strictly enforced across all REST and WebSocket endpoints. There are no client-side role bypasses or unauthenticated backdoors:

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
4. Select the corresponding **Vault Credential Profile**.
5. Click **`Ping`** to verify ICMP latency.
6. Click **`Web CLI`** to establish a real-time, bidirectional pseudo-terminal directly in your browser.

---
---

# NetGateway — Inventario de Dispositivos de Red y Gateway de Terminal Web Empresarial (Español)

> **Idioma:** [English (Primary)](#netgateway--enterprise-network-device-inventory--web-terminal-gateway) | **Español (Secundaria)**

**NetGateway** es una plataforma web segura de nivel empresarial para gestionar el inventario de infraestructura de red y proporcionar acceso CLI interactivo directamente desde el navegador a routers, switches, firewalls de próxima generación y servidores de consola fuera de banda.

Conecta clientes web con equipamiento de red físico y virtual (Cisco, HP/Aruba Comware, Palo Alto PAN-OS, OpenGear, etc.) mediante una arquitectura asíncrona no bloqueante sobre WebSockets y asignación de Pseudo-Terminales (PTY).

---

## 🚀 Características Principales

### 1. Gateway de Terminal Web Interactivo (`xterm.js` + WebSockets + PTY)
- **Canalización Bidireccional en Tiempo Real**: Las pulsaciones de teclas se capturan mediante `term.onData`, se envían vía WebSocket al PTY del backend, y la salida estándar (stdout/stderr) se transmite de vuelta al navegador en milisegundos.
- **Ajuste Dinámico de Resolución**: Utiliza `FitAddon` y `ResizeObserver` para sincronizar las columnas (`cols`) y filas (`rows`) con el servidor sin cortes de texto.
- **Pestañas Multi-Dispositivo**: Abre y mantén múltiples sesiones CLI simultáneas con switches, firewalls y routers de núcleo, alternando entre pestañas con un solo clic.
- **Motores CLI por Fabricante y SSH Directo**:
  - **Cisco Systems (IOS-XE)**: Modos de privilegios (`Router>`, `Router#`, `Router(config)#`), comandos `enable`, `conf t`, `show ip int brief`, `show run`, `show version`, `ping` y guardado en NVRAM (`write memory`).
  - **HP / Aruba (Comware v7)**: Vista de usuario `<HPE>`, vista de sistema `[HPE]`, `display current-configuration`, `display ip int brief` y `save`.
  - **Palo Alto Networks (PAN-OS)**: `admin@PA-5220>`, `configure`, `show system info` y colas de `commit`.
  - **Servidores de Consola Fuera de Banda**: Acceso a líneas serie (puertos 2001+) para recuperación ante desastres.
- **Personalización de Terminal**: 4 paletas de color (*Dark Slate*, *Cyber Cyan*, *Matrix Green*, *Amber CRT*), ajuste de tipografía, limpiador de buffer, copiado y barra rápida de comandos.

### 2. Inventario de Dispositivos y Registro de Infraestructura
- **Metadatos Completos de Activos**: Hostname, IP de gestión, fabricante, modelo, versión de firmware/SO, protocolo (SSH, Telnet, Terminal Server), puerto, ubicación física en rack y etiquetas.
- **Diseño Tipográfico Limpio (Zero-Pill)**: Interfaz de alta densidad sin recuadros innecesarios ni elementos visuales saturados, empleando separadores tipográficos limpios (`·` y `/`).
- **Sonda ICMP Integrada**: Herramienta de ping en vivo que reporta latencia de ida y vuelta (RTT) y porcentaje de pérdida de paquetes.
- **Enlace de Credenciales**: Indicador visual del perfil de credencial asignado por equipo y reasignación directa desde el modal de detalles.
- **Motor de Importación Masiva (CSV y JSON)**: Importa cientos de equipos en lote mediante subida de archivos (drag-and-drop) o pegado directo. Incluye plantillas descargables en CSV/JSON, validación en tiempo real de sintaxis e IPs, y tabla de previsualización interactiva antes de registrar.
- **Ciclo de Vida de Activos**: Registro, inspección, actualización y desmantelamiento de equipos con validación y trazabilidad.

### 3. Control de Acceso Basado en Roles (RBAC) y Gestión de Usuarios
- **Autenticación Empresarial Robusta**: Tokens JSON Web (JWT) firmados con HMAC-SHA256 y contraseñas cifradas en servidor con `bcrypt (salt 10)`.
- **4 Roles Granulares**:
  - 🛡️ **Administrador (`admin`)**: Control total de la plataforma, gestión de usuarios, vault de credenciales, inventario y Web CLI.
  - ⚡ **Ingeniero de Red (`net_engineer`)**: Gestión de activos de red y acceso a terminales interactivas.
  - 🖥️ **Operador NOC (`operator`)**: Ejecución de comandos de diagnóstico y resolución en equipos autorizados.
  - 📋 **Auditor de Cumplimiento (`auditor`)**: Acceso estricto de solo lectura al inventario y a los registros de auditoría (el acceso al CLI está bloqueado por política).
- **Gestión de Cuentas**: Creación de nuevos usuarios, asignación de permisos personalizados, suspensión/activación de cuentas y cambio de contraseñas.

### 4. Vault de Credenciales Seguras (AES-256-GCM)
- **Almacenamiento Zero-Knowledge**: Almacena credenciales TACACS+, llaves privadas SSH Ed25519/RSA y contraseñas Enable secret de Cisco (privilegio 15).
- **Cifrado en Reposo**: Cifrado con AES-256-GCM con vectores de inicialización (IV) de 12 bytes y etiquetas de autenticación. Las contraseñas en texto claro nunca se registran en logs ni se exponen en las respuestas de la API.
- **Contador Dinámico de Equipos**: Calcula en tiempo real cuántos dispositivos del inventario están utilizando cada perfil de credencial.

### 5. Pista de Auditoría y Cumplimiento Normativo
- **Registro Detallado de Comandos**: Registra cada comando ejecutado en CLI, aperturas y cierres de sesión, modificaciones de usuarios y altas de equipos.
- **Exportación a CSV**: Descarga en un clic para auditorías de cumplimiento normativo (SOC2, ISO 27001, PCI-DSS).

### 6. Topología de Red y Matriz de Acceso
- **Mapa Lógico de Infraestructura**: Visualización jerárquica dividida en Seguridad Perimetral, Núcleo del Datacenter, Conmutación de Agregación, Acceso de Campus y Consolas Fuera de Banda, con accesos directos al terminal.

---

## ⚡ Inicio Rápido (Desarrollo Local)

### Requisitos Previos
- Node.js `20.x` o `22.x` LTS
- npm `10.x+`

### Instalación y Ejecución
```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/netgateway.git
cd netgateway

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo (Frontend + Backend en puerto 3000)
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🐳 Despliegue con Docker y Podman (Producción)

Para desplegar NetGateway en cualquier servidor Linux, máquina virtual Proxmox/VMware o instancia en la nube usando contenedores OCI:

### Con Docker y Docker Compose:
```bash
# 1. Crear el archivo de entorno
cp .env.example .env
# Edita .env y define una clave segura para JWT_SECRET

# 2. Construir y levantar con Docker Compose
docker compose up -d --build

# 3. Ver los logs en tiempo real
docker compose logs -f
```

### Con Podman (Rootless y Enterprise Linux / RHEL / Rocky):
```bash
# Opción A: Ejecutar con Podman Compose (activar socket previamente si lo requiere el plugin)
systemctl --user enable --now podman.socket
podman compose up -d --build

# Opción B: Ejecutar mediante el CLI nativo de Podman (¡Sin demonios ni sockets!)
podman build -t netgateway:latest .
podman run -d --name netgateway --restart unless-stopped -p 3000:3000 --env-file .env netgateway:latest
```

> 💡 *Si `podman compose` reporta `podman.sock: connect: no such file or directory`, ejecuta `systemctl --user enable --now podman.socket` o utiliza la Opción B (CLI nativo directo).*

El servicio estará disponible en el puerto `3000` (o en el `443` si se utiliza el proxy inverso de Nginx).

Para instrucciones detalladas sobre inicio automático con systemd (Podman Quadlet), enrutamiento directo en VLANs de gestión y proxy inverso con certificados SSL, consulta [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 🔑 Cuenta de Administrador Inicial y Seguridad

La autenticación es obligatoria en todos los endpoints REST y sockets WebSocket. No existen accesos demo inseguros:

| Rol | Usuario Inicial | Contraseña Inicial | Privilegios |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin` | `AdminPassword2026!` | Control total, Gestión de Usuarios, Vault, Inventario, Web CLI |

> 🔒 **Aviso de Seguridad para Producción:**
> Tras el primer despliegue, inicia sesión como `admin`, accede al apartado **`Users & RBAC`** y cambia la contraseña por defecto o crea las cuentas individuales de los administradores. Todas las contraseñas se almacenan con hash criptográfico `bcrypt (salt 10)`.

---

## 🔌 Conexión con Equipos Reales Físicos o Virtuales

Para conectar NetGateway con switches reales o laboratorios virtuales (EVE-NG, GNS3, Cisco CML, Proxmox):

1. Asegúrate de que el servidor donde corre NetGateway tenga conectividad IP enrutada hacia la VLAN de gestión.
2. En NetGateway, ve a **`Credentials Vault`** y añade el perfil de usuario y contraseña o clave SSH.
3. En **`Inventory`**, pulsa en **`+ Add Network Device`** e introduce la IP de gestión real del equipo y el puerto (`22` para SSH directo o `2001+` para consola serie).
4. Selecciona el **Perfil de Credencial del Vault** asignado al equipo.
5. Pulsa en **`Ping`** para validar la conectividad ICMP.
6. Pulsa en **`Web CLI`** para abrir la sesión interactiva en tiempo real en tu navegador.

---

## 📄 Licencia

Este proyecto está distribuido bajo la Licencia Apache 2.0. Consulta el archivo [LICENSE](LICENSE) para más detalles.
