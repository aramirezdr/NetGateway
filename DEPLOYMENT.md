# Enterprise Deployment Guide — NetGateway

> **Language / Idioma:** **English (Primary)** | [Versión en Español (Secundaria)](#guía-de-despliegue-empresarial--netgateway-español)

This guide provides step-by-step instructions for deploying **NetGateway** in your enterprise on-premise infrastructure (bare-metal servers, Proxmox/VMware virtual machines, or cloud VPC instances) to manage your inventory and establish direct, interactive web CLI sessions with physical/virtual routers, switches, and firewalls.

---

## Table of Contents
1. [Server Prerequisites](#server-prerequisites)
2. [Option 1: Docker & Docker Compose Deployment (Recommended)](#option-1-docker--docker-compose-deployment-recommended)
3. [Option 2: Native Node.js & systemd Service](#option-2-native-nodejs--systemd-service)
4. [Option 3: Nginx Reverse Proxy with SSL (HTTPS / WSS)](#option-3-nginx-reverse-proxy-with-ssl-https--wss)
5. [Option 4: Python FastAPI Reference Backend (asyncssh)](#option-4-python-fastapi-reference-backend-asyncssh)
6. [Verifying Connectivity with Real Network Devices](#verifying-connectivity-with-real-network-devices)
7. [Versión en Español](#guía-de-despliegue-empresarial--netgateway-español)

---

## Server Prerequisites

- **Operating System:** Ubuntu 22.04/24.04 LTS, Debian 12, RHEL 9, or Rocky Linux 9.
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

## Option 2: Native Node.js & systemd Service

For bare-metal or VM deployments without Docker:

### 1. Install Node.js 22 LTS
On Ubuntu / Debian:
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
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

## Option 3: Nginx Reverse Proxy with SSL (HTTPS / WSS)

In enterprise networks, interactive terminal sessions must be encrypted end-to-end via TLS (`https://` and `wss://`).

1. Install Nginx:
   ```bash
   sudo apt install -y nginx
   ```
2. Copy the included `nginx.conf` file:
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/netgateway.conf
   sudo ln -s /etc/nginx/sites-available/netgateway.conf /etc/nginx/sites-enabled/
   ```
3. Edit your domain name and SSL certificate paths:
   ```bash
   sudo nano /etc/nginx/sites-available/netgateway.conf
   ```
4. Test and reload Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

> ⚠️ **Critical for WebSocket Sessions:** The `location /api/v1/ws/` block in `nginx.conf` sets `proxy_read_timeout 86400s;` and connection upgrade headers (`Upgrade $http_upgrade;`). This ensures long-running CLI sessions do not time out during operator idle periods.

---

## Option 4: Python FastAPI Reference Backend (asyncssh)

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

## Verifying Connectivity with Real Network Devices

1. Open NetGateway in your browser and log in with your administrative account (`admin` / `AdminPassword2026!`).
2. Navigate to **`Credentials Vault`** and store your SSH keys or TACACS+/RADIUS credentials with AES-256 encryption.
3. Click **`+ Add Network Device`**.
4. Enter your real router/switch/firewall management IP (e.g., `10.240.0.1`), vendor, and select the corresponding Vault Credential profile.
5. Click the **`Ping`** button to run an ICMP reachability test from the server to the device.
6. Click **`Web CLI`** to open the interactive browser-based terminal session.

---
---

# Guía de Despliegue Empresarial — NetGateway (Español)

> **Idioma:** [English (Primary)](#enterprise-deployment-guide--netgateway) | **Español (Secundaria)**

Esta sección detalla los pasos para desplegar **NetGateway** en tu propia infraestructura corporativa (servidores físicos, máquinas virtuales en Proxmox/VMware, o instancias en la nube) para gestionar tu inventario y conectarte a tus routers, switches y firewalls reales.

---

## Requisitos Previos del Servidor

- **Sistema Operativo:** Ubuntu 22.04/24.04 LTS, Debian 12, RHEL 9 o Rocky Linux 9.
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

## Opción 2: Despliegue Nativo con Node.js y systemd

Si prefieres ejecutar directamente en el sistema operativo sin Docker:

### 1. Instalar Node.js 22 LTS
En Ubuntu/Debian:
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
```

### 2. Instalar dependencias y compilar el frontend
```bash
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

## Opción 3: Reverse Proxy con Nginx y Certificados SSL (HTTPS/WSS)

Para entornos corporativos donde se requiere HTTPS y certificados válidos (Let's Encrypt o CA interna):

1. Instala Nginx:
   ```bash
   sudo apt install -y nginx
   ```
2. Copia el archivo `nginx.conf` suministrado:
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/netgateway.conf
   sudo ln -s /etc/nginx/sites-available/netgateway.conf /etc/nginx/sites-enabled/
   ```
3. Edita tu dominio o IP y la ruta de los certificados SSL:
   ```bash
   sudo nano /etc/nginx/sites-available/netgateway.conf
   ```
4. Prueba y recarga Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

> ⚠️ **Importante para WebSockets:** El bloque `location /api/v1/ws/` en `nginx.conf` incluye `proxy_read_timeout 86400s;` y cabeceras `Upgrade $http_upgrade;`. Esto garantiza que las sesiones de terminal SSH no se corten por inactividad.

---

## Opción 4: Backend de Referencia en Python (FastAPI + asyncssh)

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

## Verificación de Conectividad con tus Equipos Reales

1. Inicia sesión en NetGateway con la cuenta `admin` / `AdminPassword2026!`.
2. Ve al **`Credentials Vault`** y guarda tus claves SSH o credenciales TACACS+/RADIUS con cifrado AES-256.
3. Ve a **`+ Add Network Device`**.
4. Ingresa la IP de gestión de tu switch o router real (ej: `10.240.0.1`), fabricante y selecciona el perfil de credencial correspondiente.
5. Haz clic en **`Ping`** para verificar que el servidor alcanza el equipo mediante ICMP.
6. Haz clic en **`Web CLI`** para abrir la consola SSH interactiva directamente en tu navegador.
