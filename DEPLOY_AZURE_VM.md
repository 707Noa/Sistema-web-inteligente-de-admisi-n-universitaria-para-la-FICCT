# Despliegue en Azure VM — CUP-FICCT

Arquitectura resultante:

```
Internet
   │  (80 / 443)
   ▼
Azure VM (Ubuntu)
   │
   ▼
Nginx  (nginx:stable-alpine)
   │  proxy_pass http://backend:${BACKEND_PORT}
   ▼
backend  (Docker service interno)
   │
   ├── frontend  (Docker service interno)
```

---

## 1. Requisitos previos en Azure

### 1.1 Crear la VM
- Imagen recomendada: **Ubuntu 22.04 LTS**
- Tamaño mínimo: **B2s** (2 vCPU, 4 GB RAM)
- Disco: mínimo **30 GB** (Premium SSD recomendado)

### 1.2 Abrir puertos en el Network Security Group (NSG)
En Azure Portal → VM → Networking → "Add inbound port rule":

| Puerto | Protocolo | Descripción |
|--------|-----------|-------------|
| 22     | TCP       | SSH |
| 80     | TCP       | HTTP (certbot y redirección a HTTPS) |
| 443    | TCP       | HTTPS |

> No es necesario abrir los puertos internos de `backend` o `frontend` en Azure. Solo `nginx` necesita 80 y 443.

---

## 2. Instalar Docker en la VM

Conéctate a la VM por SSH:

```bash
ssh azureuser@<IP-PUBLICA-DE-LA-VM>
```

Instala Docker y el plugin Compose:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Agregar tu usuario al grupo docker (evita usar sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verificar instalación
docker --version
docker compose version
```

---

## 3. Clonar el repositorio

```bash
git clone https://github.com/tu-org/CUP-FICCT-Sistema-Web-de-Admision-Universitaria.git
cd CUP-FICCT-Sistema-Web-de-Admision-Universitaria
```

---

## 4. Configurar variables de entorno

Copia el ejemplo y completa los valores:

```bash
cp .env.example .env
nano .env
```

### Variables obligatorias para producción

```env
APP_ENV=prod

FRONTEND_DOMAIN=app-primerpacialsw.duckdns.org
API_DOMAIN=api-primerpacialsw.duckdns.org
CERTBOT_EMAIL=tu_correo@gmail.com
CERTBOT_CERT_NAME=app-primerpacialsw.duckdns.org

# URLs de acceso en producción
API_URL=https://api-primerpacialsw.duckdns.org/api
AI_URL=https://api-primerpacialsw.duckdns.org/ai
WS_URL=wss://api-primerpacialsw.duckdns.org/ws
ALLOWED_ORIGINS=https://app-primerpacialsw.duckdns.org

APP_URL=https://api-primerpacialsw.duckdns.org
FRONTEND_URL=https://app-primerpacialsw.duckdns.org
CORS_ORIGIN=https://app-primerpacialsw.duckdns.org
SESSION_DOMAIN=app-primerpacialsw.duckdns.org
SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:8000,127.0.0.1:5173,api-primerpacialsw.duckdns.org

BACKEND_PORT=8000
FRONTEND_PORT=5173
NGINX_PORT_HTTP=80
NGINX_PORT_HTTPS=443

JWT_SECRET=<secreto-largo-y-aleatorio>
SESSION_SECRET=<otro-secreto-largo>

DATABASE_URL=postgresql://postgres:postgres@postgres:5432/cupficct
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=cupficct
DB_USERNAME=postgres
DB_PASSWORD=postgres

PGADMIN_EMAIL=admin@local
PGADMIN_PASSWORD=admin
```

> `APP_ENV=prod` activa la configuración de Nginx para producción y hace que el contenedor `nginx` espere los certificados en `nginx/certs/` antes de iniciar.

> Si estás en desarrollo local, mantén `APP_ENV=local` y las URLs de conexión en modo `localhost`.

---

## 5. Obtener certificado SSL con Certbot

> Omite este paso si usas la IP pública directa (solo HTTP) o si Azure termina el SSL.

Instala certbot:

```bash
sudo apt-get install -y certbot
```

Genera el certificado (la VM debe tener el puerto 80 abierto y el dominio apuntando a la IP pública):

```bash
sudo certbot certonly --standalone \
  --non-interactive \
  --agree-tos \
  --email tu@email.com \
  -d $CERTBOT_CERT_NAME
```

Copia los certificados al directorio del proyecto:

```bash
sudo mkdir -p nginx/certs
sudo cp /etc/letsencrypt/live/$CERTBOT_CERT_NAME/fullchain.pem nginx/certs/fullchain.pem
sudo cp /etc/letsencrypt/live/$CERTBOT_CERT_NAME/privkey.pem nginx/certs/privkey.pem
sudo chown $USER:$USER nginx/certs/*.pem
```

> Nota: el servicio `nginx` en `docker-compose.yml` ahora espera que los archivos `nginx/certs/fullchain.pem` y `nginx/certs/privkey.pem` existan antes de iniciar. Si levantas el contenedor antes de obtener el certificado, se quedará en espera y no producirá error de arranque inmediato.

Para renovación automática añade al cron:

```bash
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && \
  cp /etc/letsencrypt/live/$CERTBOT_CERT_NAME/fullchain.pem $(pwd)/nginx/certs/fullchain.pem && \
  cp /etc/letsencrypt/live/$CERTBOT_CERT_NAME/privkey.pem $(pwd)/nginx/certs/privkey.pem && \
  docker compose exec nginx nginx -s reload") | crontab -
```

### Modo solo HTTP (sin certificado SSL)

Si aún no tienes dominio ni certificado, usa `APP_ENV=local` y el archivo `nginx/conf.d/local.conf` en lugar de `app.conf`.

```nginx
server {
    listen 80;
    server_name _;

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        proxy_pass http://frontend:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 6. Desplegar con un solo docker-compose

### Iniciar los servicios

```bash
docker compose --env-file .env up -d --build
```

### Verificar que los contenedores están corriendo

```bash
docker compose ps
```

> Si `APP_ENV=prod` y el contenedor `nginx` se inicia antes de generar los certificados, se quedará en espera hasta que los archivos `nginx/certs/fullchain.pem` y `nginx/certs/privkey.pem` existan.

Deberías ver algo como:

```
NAME          IMAGE                  STATUS          PORTS
...-nginx-1   nginx:stable-alpine    Up (healthy)    0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
...-backend-1 your-backend-image   Up (healthy)
...-frontend-1 your-frontend-image Up (healthy)
```

---

## 7. Probar el despliegue

Con dominio configurado:

```bash
curl -I https://$FRONTEND_DOMAIN
```

Con IP pública (HTTP):

```bash
curl -I http://<IP-PUBLICA>
```

Debes recibir `HTTP/2 200` o `HTTP/1.1 301` (si redirige a HTTPS).

---

## 8. Comandos útiles

```bash
docker compose logs -f

docker compose logs -f nginx
docker compose logs -f backend

docker compose restart nginx
docker compose restart backend
docker compose down

docker stats
```

---

## 9. Estructura de archivos relevantes

```
.
├── docker-compose.yml          # Un solo archivo docker-compose para desarrollo y producción
├── .env.example                # Plantilla de variables (sí va a git)
├── .env                        # Variables reales (NO va a git)
├── nginx/
│   ├── conf.d/
│   │   ├── app.conf            # Plantilla nginx para producción
│   │   └── local.conf          # Plantilla nginx para desarrollo local
│   └── certs/
│       ├── fullchain.pem       # Certificado SSL (NO va a git)
│       └── privkey.pem         # Clave privada SSL (NO va a git)
└── DEPLOY_AZURE_VM.md          # Esta guía
```

---

## Notas de seguridad

- Los archivos `nginx/certs/*.pem` están en `.gitignore`. Nunca los subas al repositorio.
- El archivo `.env` está en `.gitignore`. Nunca lo subas al repositorio.
- El contenedor `nginx` usa `APP_ENV` para elegir entre `app.conf` y `local.conf`.
- En Azure solo necesitas exponer `80` y `443` en el NSG; los servicios internos `backend` y `frontend` se comunican dentro de la red Docker.
