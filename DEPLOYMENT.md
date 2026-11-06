# Guía de Despliegue Empresarial — NetGateway

Esta guía detalla los pasos para desplegar **NetGateway** en tu propia infraestructura corporativa (servidores físicos, máquinas virtuales en Proxmox/VMware, o instancias en la nube) para gestionar tu inventario y conectarte a tus routers, switches y firewalls reales.

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
2. Ve a **`+ Add Network Device`**.
3. Ingresa la IP de gestión de tu switch o router real (ej: `10.10.1.1`).
4. Haz clic en **`Ping`** para verificar que el servidor alcanza el equipo mediante ICMP.
5. Registra las credenciales de acceso SSH en el **`Credentials Vault`**.
6. Haz clic en **`Web CLI`** para abrir la consola SSH interactiva directamente en tu navegador.
