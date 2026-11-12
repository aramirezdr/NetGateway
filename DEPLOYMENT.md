# Enterprise Deployment Guide — NetGateway

> **Language / Idioma:** **English (Primary)** | [Versión en Español (Secundaria)](#guía-de-despliegue-empresarial--netgateway-español)

This guide provides step-by-step instructions for deploying **NetGateway** in your enterprise on-premise infrastructure (bare-metal servers, Proxmox/VMware virtual machines, or cloud VPC instances) to manage your inventory and establish direct, interactive web CLI sessions with physical/virtual routers, switches, and firewalls.

---

## Table of Contents
1. [Server Prerequisites](#server-prerequisites)
2. [Option 1: Docker & Docker Compose Deployment (Recommended)](#option-1-docker--docker-compose-deployment-recommended)
3. [Option 2: Podman Deployment (Rootless & Enterprise Linux / RHEL / Rocky)](#option-2-podman-deployment-rootless--enterprise-linux--rhel--rocky)
4. [Option 3: Native Node.js & systemd Service](#option-3-native-nodejs--systemd-service)
5. [Option 4: Nginx Reverse Proxy with SSL (HTTPS / WSS)](#option-4-nginx-reverse-proxy-with-ssl-https--wss)
6. [Option 5: Python FastAPI Reference Backend (asyncssh)](#option-5-python-fastapi-reference-backend-asyncssh)
7. [Data Persistence Architecture (`./data:/app/data`)](#data-persistence-architecture-datadata)
8. [System Backups & Disaster Recovery (Web UI & REST API)](#system-backups--disaster-recovery-web-ui--rest-api)
9. [Verifying Connectivity with Real Network Devices](#verifying-connectivity-with-real-network-devices)
10. [Versión en Español](#guía-de-despliegue-empresarial--netgateway-español)

---

## Server Prerequisites

- **Operating System:** Ubuntu 22.04/24.04 LTS, Debian 12, RHEL 8/9, Rocky Linux 9, or AlmaLinux 9.
- **Recommended Hardware:**
  - 2 vCPU
  - 4 GB RAM
  - 20 GB SSD storage
- **Network Connectivity:**
  - Routed L3 access or trunked interface to the management VLAN/subnet of your network devices (e.g., `10.x.x.x` or `172.16.x.x`).
  - Outbound firewall rules permitted from NetGateway host to network assets:
    - **SSH:** Port `22` (TCP)
    - **Telnet:** Port `23` (TCP)
    - **Terminal Servers / Console Pods:** Ports `2001` through `2016+` (TCP)
  - Inbound firewall rules to NetGateway:
    - Port `443` (HTTPS / WSS) with Reverse Proxy, or Port `3000` (Direct)

---

## Option 1: Docker & Docker Compose Deployment (Recommended)

This is the fastest, fully isolated method for running NetGateway in production.

### 1. Clone or copy the project to your server
```bash
git clone <YOUR_REPOSITORY_URL> netgateway
cd netgateway
```

### 2. Configure Environment Variables
Create your production `.env` file:
```bash
cp .env.example .env
nano .env
```
Set a strong, high-entropy secret for JWT token signing and AES-256-GCM vault encryption:
```env
PORT=3000
NODE_ENV=production
JWT_SECRET="EnterYourVeryLongAndSecureEnterpriseSecretKey2026!"
```

### 3. Build and launch with Docker Compose
```bash
# Build images and start in detached mode
docker compose up -d --build

# Verify container status and logs
docker compose ps
docker compose logs -f
```

The gateway will be accessible at: `http://<YOUR_SERVER_IP>:3000`

> 💡 **Tip for Isolated Management VLANs (Direct L3 Routing):**
> If your server has dedicated network interfaces (NICs) connected to isolated out-of-band management VLANs, you can uncomment `network_mode: "host"` in `docker-compose.yml`. This allows the container to use the host's native kernel routing table directly without traversing Docker NAT.

---

## Option 2: Podman Deployment (Rootless & Enterprise Linux / RHEL / Rocky)

Podman is an OCI-compliant, daemonless, rootless container engine natively integrated into Red Hat Enterprise Linux (RHEL 8/9), Rocky Linux, AlmaLinux, Fedora, and Debian/Ubuntu. It eliminates the security risks of running a root Docker daemon (`dockerd`) in strict enterprise environments.

### 1. Run via Podman Compose
When using `podman compose` on RHEL/Rocky/Fedora with the docker-compose provider, ensure the user-level Podman socket is enabled:
```bash
# Enable the rootless Podman API socket (required once by docker-compose plugin)
systemctl --user enable --now podman.socket

# Build and run rootless using docker-compose.yml
podman compose up -d --build

# Verify container status and logs
podman compose ps
podman compose logs -f
```

> ⚠️ **Troubleshooting `podman.sock: connect: no such file or directory`:**
> If `podman compose` fails with:
> `failed to connect to the docker API at unix:///run/user/<UID>/podman/podman.sock`
> This happens because the external `docker-compose` plugin requires an active Podman API socket.
> - **Fix 1:** Run `systemctl --user enable --now podman.socket` once under your regular user.
> - **Fix 2 (Recommended):** Use **Method 2 (Native Podman CLI)** below, which is completely daemonless and does not require any sockets or services running.

### 2. Run via Native Podman CLI (Rootless Container)
```bash
# 1. Build the OCI container image
podman build -t netgateway:latest .

# 2. Run the container as an unprivileged user
podman run -d \
  --name netgateway \
  --restart unless-stopped \
  -p 3000:3000 \
  -v ./data:/app/data:Z \
  --env-file .env \
  netgateway:latest

# 3. Check logs
podman logs -f netgateway
```

> 💡 **Direct L3 Routing to Isolated Management VLANs with Podman:**
> To let NetGateway communicate with your management network interfaces without bridge overhead or port NAT:
> ```bash
> podman run -d \
>   --name netgateway \
>   --network host \
>   -v ./data:/app/data:Z \
>   --env-file .env \
>   netgateway:latest
> ```

### 3. Autostart via systemd (Podman Quadlet for RHEL 9 / Rocky 9 / Fedora)
On modern systemd systems, you can run NetGateway as a managed systemd service without Docker daemon:
Create `~/.config/containers/systemd/netgateway.container`:
```ini
[Unit]
Description=NetGateway Enterprise Web Terminal Container
After=network-online.target

[Container]
Image=netgateway:latest
PublishPort=3000:3000
Volume=%h/netgateway/data:/app/data:Z
EnvironmentFile=%h/netgateway/.env
Restart=always

[Install]
WantedBy=default.target
```
Enable and start the user service:
```bash
systemctl --user daemon-reload
systemctl --user enable --now netgateway.service
loginctl enable-linger $USER
```

---

## Option 3: Native Node.js & systemd Service

For bare-metal or VM deployments without containers:

### 1. Install Node.js 22 LTS
On Ubuntu / Debian:
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
```
On RHEL 9 / Rocky Linux:
```bash
sudo dnf module enable -y nodejs:22
sudo dnf install -y nodejs git
```

### 2. Install dependencies and compile the production build
```bash
sudo mkdir -p /opt/netgateway
sudo cp -r . /opt/netgateway/
cd /opt/netgateway
npm install
npm run build
```

### 3. Configure the systemd Service (`/etc/systemd/system/netgateway.service`)
```ini
[Unit]
Description=NetGateway Enterprise Network Terminal Gateway
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/netgateway
ExecStart=/usr/bin/npx tsx /opt/netgateway/server.ts
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=JWT_SECRET=YourEnterpriseSecretKey2026!

[Install]
WantedBy=multi-user.target
```

### 4. Enable and start the system service
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now netgateway
sudo systemctl status netgateway
```

---

## Option 4: Nginx Reverse Proxy with SSL (HTTPS / WSS)

In enterprise networks, interactive terminal sessions must be encrypted end-to-end via TLS (`https://` and `wss://`).

1. Install Nginx:
   ```bash
   # On RHEL / Rocky Linux / AlmaLinux / CentOS:
   sudo dnf install -y nginx

   # On Ubuntu / Debian:
   sudo apt install -y nginx
   ```

2. Copy the included configuration:
   ```bash
   # On RHEL / Rocky Linux (standard conf.d directory):
   sudo cp nginx.conf /etc/nginx/conf.d/netgateway.conf

   # On Ubuntu / Debian (sites-available directory):
   sudo cp nginx.conf /etc/nginx/sites-available/netgateway.conf
   sudo ln -s /etc/nginx/sites-available/netgateway.conf /etc/nginx/sites-enabled/
   ```

3. Configure SELinux & Firewall (CRITICAL for RHEL / Rocky Linux / CentOS):
   ```bash
   # Allow Nginx to connect to the backend container upstream on port 3000
   sudo setsebool -P httpd_can_network_connect 1

   # Open HTTP and HTTPS ports in firewalld
   sudo firewall-cmd --permanent --add-service=http --add-service=https
   sudo firewall-cmd --reload
   ```

4. Test and enable Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl enable --now nginx
   ```

> ⚠️ **Critical for WebSocket Sessions:** The `location /api/v1/ws/` block in `nginx.conf` sets `proxy_read_timeout 86400s;` and connection upgrade headers (`Upgrade $http_upgrade;`). This ensures long-running CLI sessions do not time out during operator idle periods.

---

## Option 5: Python FastAPI Reference Backend (asyncssh)

If your enterprise backend policy requires Python:
1. Navigate to the `/backend` directory:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
2. Run FastAPI with Uvicorn:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
   ```

---

## 💾 Data Persistence Architecture (`./data:/app/data`)

NetGateway utilizes an atomic, transactional JSON database engine stored in `./data` on your host filesystem and mounted inside the container to `/app/data`.

### Persistent Host File Layout (`./data/`)
| Host Path | Internal Function |
| :--- | :--- |
| `./data/devices.json` | Stores registered routers, switches, firewalls, and **physical asset codes (`asset_id`)**. |
| `./data/credentials.json` | Stores AES-256-GCM encrypted TACACS+, password, and SSH key vault profiles. |
| `./data/users.json` | Stores local operator and administrative accounts with `bcrypt` password hashes. |
| `./data/audit_logs.json` | Stores compliance audit records for command execution and session lifecycle. |
| `./data/backup_schedule.json` | Stores automated snapshot scheduling and retention rotation policies. |
| `./data/backups/*.json` | Immutable, timestamped point-in-time system backup archives with SHA-256 checksums. |

### Guaranteeing Zero Data Loss across Rebuilds (`--build`):
Whenever you update source code and rebuild the image:
```bash
docker compose up -d --build
# or with Podman:
podman compose up -d --build
```
Because `./data` is a **host bind mount**, all devices, credentials, audit records, and backups remain completely untouched on your host machine.

### Manual Host Backup (CLI Archive):
```bash
# Create a timestamped archive of the complete data volume
tar -czvf netgateway_backup_$(date +%F).tar.gz ./data/
```

### Manual Host Restore (CLI Archive):
```bash
# 1. Stop the container
docker compose down   # or podman compose down

# 2. Extract the archive into the project directory
tar -xzvf netgateway_backup_2026-11-12.tar.gz

# 3. Start the container
docker compose up -d  # or podman compose up -d
```

---

## 🗄️ System Backups & Disaster Recovery (Web UI & REST API)

NetGateway features a comprehensive Disaster Recovery subsystem directly accessible in the **`Backups`** view:

1. **On-Demand Snapshots:**
   * Click **`Crear Respaldo Ahora`** and specify an optional description (e.g., *"Pre-core router maintenance"*).
   * Generates a point-in-time JSON archive in `./data/backups/netgateway-backup-*.json` and computes its cryptographic SHA-256 checksum.
2. **Offline Cold Storage Download:**
   * Click **`Descargar`** on any snapshot to store the `.json` file on an administrator PC or external backup tape/SAN.
3. **External Archive Upload:**
   * Click **`Subir Respaldo`** to import an existing `.json` file from another server or historical backup.
4. **Pre-Restore Safety Guarantee:**
   * Click **`Restaurar`** to recover a previous state.
   * **Safety Mechanism:** Before overwriting the active environment, the backend automatically generates a safety backup snapshot of the current state.
   * **Selective Restore:** Selectively restore Devices, Credentials, Users, or Audit Logs.
5. **Automated Scheduler & Retention Rotation:**
   * Click **`Programación Automática`** to enable Daily, Weekly, or Hourly automatic backups at a specific time (e.g., `02:00`).
   * Configure retention count (e.g., keep the last 10 snapshots) to automatically prune older files and conserve disk space.

---

## Verifying Connectivity with Real Network Devices

1. Open NetGateway in your browser and log in with your administrative account (`admin` / `AdminPassword2026!`).
2. Navigate to **`Credentials Vault`** and store your SSH keys or TACACS+/RADIUS credentials with AES-256 encryption.
3. Click **`+ Add Network Device`** (or **`Bulk Import`** to import multiple devices via CSV/JSON).
4. Enter your real router/switch/firewall management IP (e.g., `10.240.0.1`), vendor, port, and **ID de Inventario (`asset_id`)**.
5. Select the corresponding Vault Credential profile.
6. Click the **`Ping`** button to run an ICMP reachability test from the server to the device.
7. Click **`Web CLI`** to open the interactive browser-based terminal session.

---
---

# Guía de Despliegue Empresarial — NetGateway (Español)

> **Idioma:** [English (Primary)](#enterprise-deployment-guide--netgateway) | **Español (Secundaria)**

Esta sección detalla los pasos para desplegar **NetGateway** en tu propia infraestructura corporativa (servidores físicos, máquinas virtuales en Proxmox/VMware, o instancias en la nube) para gestionar tu inventario y conectarte a tus routers, switches y firewalls reales.

---

## Tabla de Contenidos
1. [Requisitos Previos del Servidor](#requisitos-previos-del-servidor)
2. [Opción 1: Despliegue con Docker y Docker Compose (Recomendado)](#opción-1-despliegue-con-docker-y-docker-compose-recomendado)
3. [Opción 2: Despliegue con Podman (Rootless y Enterprise Linux / RHEL / Rocky)](#opción-2-despliegue-con-podman-rootless-y-enterprise-linux--rhel--rocky)
4. [Opción 3: Despliegue Nativo con Node.js y systemd](#opción-3-despliegue-nativo-con-nodejs-y-systemd)
5. [Opción 4: Reverse Proxy con Nginx y Certificados SSL (HTTPS/WSS)](#opción-4-reverse-proxy-con-nginx-y-certificados-ssl-httpswss)
6. [Opción 5: Backend de Referencia en Python (FastAPI + asyncssh)](#opción-5-backend-de-referencia-en-python-fastapi--asyncssh)
7. [Persistencia de Datos y Respaldos (Docker & Podman)](#-persistencia-de-datos-y-respaldos-docker--podman)
8. [Módulo Integrado de Respaldos (Web UI & REST API)](#️-módulo-integrado-de-respaldos-web-ui--rest-api)
9. [Verificación de Conectividad con tus Equipos Reales](#verificación-de-conectividad-con-tus-equipos-reales)

---

## Requisitos Previos del Servidor

- **Sistema Operativo:** Ubuntu 22.04/24.04 LTS, Debian 12, RHEL 8/9, Rocky Linux 9 o AlmaLinux 9.
- **Hardware Recomendado:**
  - 2 vCPU
  - 4 GB RAM
  - 20 GB de almacenamiento SSD
- **Conectividad de Red:**
  - Acceso enrutado hacia la VLAN o subred de gestión de tus equipos de red (ej: `10.x.x.x` o `172.16.x.x`).
  - Puertos de salida habilitados en firewall hacia los equipos:
    - **SSH:** Puerto `22` (TCP)
    - **Telnet:** Puerto `23` (TCP)
    - **Terminal Servers / Consolas:** Puertos `2001` a `2016` (TCP)
  - Puerto de entrada hacia el servidor NetGateway:
    - Puerto `443` (HTTPS / WSS) o `3000` (Directo)

---

## Opción 1: Despliegue con Docker y Docker Compose (Recomendado)

Es la forma más rápida y aislada de ejecutar NetGateway en producción.

### 1. Clonar o copiar el proyecto en tu servidor
```bash
git clone <URL_DE_TU_REPOSITORIO> netgateway
cd netgateway
```

### 2. Configurar variables de entorno
Crea tu archivo `.env`:
```bash
cp .env.example .env
nano .env
```
Define una clave segura para la firma de tokens JWT y cifrado AES-256 de credenciales:
```env
PORT=3000
NODE_ENV=production
JWT_SECRET="ColocaAquiUnaClaveSecretaMuyLargaYSegura2026!"
```

### 3. Iniciar el contenedor con Docker Compose
```bash
# Construir y levantar en segundo plano
docker compose up -d --build

# Verificar que el contenedor esté corriendo
docker compose ps
docker compose logs -f
```

La aplicación estará accesible en: `http://IP_DE_TU_SERVIDOR:3000`

> 💡 **Tip para VLANs de Gestión Aisladas:**
> Si tu servidor tiene múltiples tarjetas de red físicas (NICs) o interfaces troncales conectadas a VLANs de red de gestión, puedes descomentar `network_mode: "host"` en `docker-compose.yml`. Esto permite que el contenedor use directamente la tabla de enrutamiento del host Linux para alcanzar tus switches y routers sin pasar por NAT de Docker.

---

## Opción 2: Despliegue con Podman (Rootless y Enterprise Linux / RHEL / Rocky)

Podman es un motor de contenedores compatible con OCI, sin demonio y con ejecución sin privilegios de root (rootless), integrado nativamente en Red Hat Enterprise Linux (RHEL 8/9), Rocky Linux, AlmaLinux, Fedora y Debian/Ubuntu. Elimina el riesgo de seguridad de ejecutar demonios con privilegios de root (`dockerd`) en entornos corporativos exigentes.

### 1. Ejecución con Podman Compose
Al utilizar `podman compose` en RHEL/Rocky/Fedora con el proveedor docker-compose, asegúrate de activar el socket de Podman a nivel de usuario:
```bash
# Activar el socket API rootless de Podman (requerido una sola vez por el plugin docker-compose)
systemctl --user enable --now podman.socket

# Construir y levantar sin root usando docker-compose.yml
podman compose up -d --build

# Verificar estado y logs
podman compose ps
podman compose logs -f
```

> ⚠️ **Solución al error `podman.sock: connect: no such file or directory`:**
> Si `podman compose` falla con:
> `failed to connect to the docker API at unix:///run/user/<UID>/podman/podman.sock`
> Esto ocurre porque el plugin externo `docker-compose` necesita que el socket de Podman esté activo.
> - **Solución 1:** Ejecuta `systemctl --user enable --now podman.socket` una sola vez con tu usuario normal.
> - **Solución 2 (Recomendada):** Usa el **Método 2 (CLI nativo de Podman)** a continuación (`podman build` y `podman run`), el cual no requiere demonios ni sockets activos.

### 2. Ejecución con CLI nativo de Podman (Contenedor Rootless)
```bash
# 1. Construir la imagen de contenedor OCI
podman build -t netgateway:latest .

# 2. Ejecutar como usuario sin privilegios root
podman run -d \
  --name netgateway \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  netgateway:latest

# 3. Ver logs en tiempo real
podman logs -f netgateway
```

> 💡 **Enrutamiento L3 Directo a VLANs de Gestión con Podman:**
> Para permitir que el contenedor use directamente la pila de red del host y alcance tus routers/switches sin pasar por NAT ni bridges virtuales:
> ```bash
> podman run -d \
>   --name netgateway \
>   --network host \
>   -v ./data:/app/data:Z \
>   --env-file .env \
>   netgateway:latest
> ```

### 3. Inicio automático con systemd (Podman Quadlet para RHEL 9 / Rocky 9 / Fedora)
En distribuciones modernas con systemd, puedes gestionar NetGateway como un servicio del sistema sin requerir demonios de Docker:
Crea el archivo `~/.config/containers/systemd/netgateway.container`:
```ini
[Unit]
Description=Contenedor NetGateway Web Terminal
After=network-online.target

[Container]
Image=netgateway:latest
PublishPort=3000:3000
Volume=%h/netgateway/data:/app/data:Z
EnvironmentFile=%h/netgateway/.env
Restart=always

[Install]
WantedBy=default.target
```
Recarga e inicia el servicio a nivel de usuario:
```bash
systemctl --user daemon-reload
systemctl --user enable --now netgateway.service
loginctl enable-linger $USER
```

---

## Opción 3: Despliegue Nativo con Node.js y systemd

Si prefieres ejecutar directamente en el sistema operativo sin contenedores:

### 1. Instalar Node.js 22 LTS
En Ubuntu/Debian:
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
```
En RHEL 9 / Rocky Linux:
```bash
sudo dnf module enable -y nodejs:22
sudo dnf install -y nodejs git
```

### 2. Instalar dependencias y compilar el frontend
```bash
sudo mkdir -p /opt/netgateway
sudo cp -r . /opt/netgateway/
cd /opt/netgateway
npm install
npm run build
```

### 3. Crear el servicio systemd (`/etc/systemd/system/netgateway.service`)
```ini
[Unit]
Description=NetGateway Enterprise Network Terminal Gateway
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/netgateway
ExecStart=/usr/bin/npx tsx /opt/netgateway/server.ts
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=JWT_SECRET=TuClaveSecretaEmpresarial2026!

[Install]
WantedBy=multi-user.target
```

### 4. Activar e iniciar el servicio
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now netgateway
sudo systemctl status netgateway
```

---

## Opción 4: Reverse Proxy con Nginx y Certificados SSL (HTTPS/WSS)

Para entornos corporativos donde se requiere HTTPS y certificados válidos (Let's Encrypt o CA interna):

1. Instala Nginx:
   ```bash
   # En RHEL / Rocky Linux / AlmaLinux / CentOS:
   sudo dnf install -y nginx

   # En Ubuntu / Debian:
   sudo apt install -y nginx
   ```

2. Copia el archivo `nginx.conf` suministrado:
   ```bash
   # En RHEL / Rocky Linux (directorio estándar conf.d):
   sudo cp nginx.conf /etc/nginx/conf.d/netgateway.conf

   # En Ubuntu / Debian (directorio sites-available):
   sudo cp nginx.conf /etc/nginx/sites-available/netgateway.conf
   sudo ln -s /etc/nginx/sites-available/netgateway.conf /etc/nginx/sites-enabled/
   ```

3. Configura SELinux y Firewall (CRÍTICO en RHEL / Rocky Linux / CentOS):
   ```bash
   # Permite que Nginx se conecte al contenedor de NetGateway en el puerto 3000
   sudo setsebool -P httpd_can_network_connect 1

   # Abre los puertos HTTP y HTTPS en el firewall
   sudo firewall-cmd --permanent --add-service=http --add-service=https
   sudo firewall-cmd --reload
   ```

4. Prueba y habilita Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl enable --now nginx
   ```

> ⚠️ **Importante para WebSockets:** El bloque `location /api/v1/ws/` en `nginx.conf` incluye `proxy_read_timeout 86400s;` y cabeceras `Upgrade $http_upgrade;`. Esto garantiza que las sesiones de terminal SSH no se corten por inactividad.

---

## Opción 5: Backend de Referencia en Python (FastAPI + asyncssh)

Si tu infraestructura corporativa exige la ejecución del backend en Python:
1. Navega a la carpeta `/backend`:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
2. Ejecuta FastAPI con Uvicorn:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
   ```

---

## 💾 Persistencia de Datos y Respaldos (Docker & Podman)

NetGateway utiliza un motor de almacenamiento JSON transaccional con escrituras atómicas en disco montado en `./data:/app/data`.

### Archivos de Persistencia en el Host (`./data/`)
| Archivo | Contenido |
|---|---|
| `devices.json` | Equipos registrados, IPs, protocolos, puertos y **códigos de inventario / activo (`asset_id`)**. |
| `credentials.json` | Perfiles de acceso SSH/Telnet cifrados con AES-256-GCM. |
| `users.json` | Cuentas locales de usuarios, hashes bcrypt y roles RBAC (Admin, Engineer, Operator, Auditor). |
| `audit_logs.json` | Historial de auditoría, aperturas de sesión SSH y comandos ejecutados. |
| `backup_schedule.json` | Configuración de programación automática y retención de snapshots. |
| `backups/*.json` | Snapshots inmutables de respaldo fechados con hash criptográfico SHA-256. |

### Cómo Crear un Respaldo (Backup)
```bash
# Crear un archivo comprimido con la fecha actual
tar -czvf netgateway_backup_$(date +%F).tar.gz ./data/
```

### Cómo Restaurar un Respaldo
```bash
# Detener el contenedor
docker compose down   # o podman compose down

# Restaurar la carpeta data
tar -xzvf netgateway_backup_2026-11-12.tar.gz

# Iniciar nuevamente
docker compose up -d  # o podman compose up -d
```

### Comportamiento ante `--build`
Cada vez que realices cambios de código y ejecutes:
```bash
docker compose up -d --build
# o con Podman:
podman compose up -d --build
```
El volumen montado `./data:/app/data` mantiene **intactos** todos los equipos agregados, credenciales guardadas y registros de auditoría, eliminando cualquier pérdida de información entre versiones y despliegues.

---

## 🗄️ Módulo Integrado de Respaldos (Web UI & REST API)

NetGateway incluye ahora una pestaña dedicada de **Backups (Respaldos del Sistema)** accesible directamente en la barra de navegación superior:

1. **Creación de Snapshots Bajo Demanda:**
   * Haz clic en **`Crear Respaldo Ahora`** y agrega una nota o motivo (ej. "Pre-actualización de firmware").
   * El sistema genera un archivo JSON con timestamp en `./data/backups/netgateway-backup-*.json` y calcula su hash SHA-256.
2. **Descarga a la Máquina Local (Offsite Storage):**
   * Haz clic en **`Descargar`** en cualquier snapshot para guardar una copia de seguridad en tu equipo o moverla a un almacenamiento frío/seguro.
3. **Subida / Importación de Respaldos Externos:**
   * Haz clic en **`Subir Respaldo`** para cargar un archivo `.json` desde tu ordenador y registrarlo en el servidor.
4. **Restauración con Protección Pre-Restore:**
   * Haz clic en **`Restaurar`** en cualquier snapshot.
   * **Garantía de Seguridad:** Antes de aplicar cualquier cambio, el backend genera automáticamente un snapshot de seguridad previo del estado actual.
   * Puedes elegir restaurar todos los módulos o seleccionar específicamente: Equipos, Vault de Credenciales, Usuarios RBAC, o Logs de Auditoría.
5. **Programación Automática (Scheduler):**
   * Configura respaldos diarios o semanales con hora programada (ej. `02:00`).
   * Define la **política de retención** (ej. conservar los últimos 10 respaldos y rotar automáticamente los más antiguos para cuidar el espacio en disco).

---

## Verificación de Conectividad con tus Equipos Reales

1. Inicia sesión en NetGateway con la cuenta `admin` / `AdminPassword2026!`.
2. Ve al **`Credentials Vault`** y guarda tus claves SSH o credenciales TACACS+/RADIUS con cifrado AES-256.
3. Ve a **`+ Add Network Device`** (o **`Bulk Import`** para importar múltiples equipos desde CSV/JSON).
4. Ingresa la IP de gestión de tu switch o router real (ej: `10.240.0.1`), fabricante, puerto y el **Código de Inventario (`asset_id`)**.
5. Selecciona el perfil de credencial correspondiente.
6. Haz clic en **`Ping`** para verificar que el servidor alcanza el equipo mediante ICMP.
7. Haz clic en **`Web CLI`** para abrir la consola SSH interactiva directamente en tu navegador.



