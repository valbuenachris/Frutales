# Frutales — Guía de despliegue con Docker

Todo se ejecuta con Docker Compose: PostgreSQL 16, la API de Express/Prisma y el
cliente de React servido por nginx (que además hace de proxy para `/api` hacia el
contenedor de la API). En producción la aplicación se expone a través de
**Nginx Proxy Manager**: el contenedor `client` se une a la red externa
`npm_net` y no publica puertos en el host.

```
Navegador ──▶ Nginx Proxy Manager ──▶ client (nginx :80) ──▶ proxy /api ──▶ server (:4000) ──▶ db (postgres:5432)
              (npm_net)               (npm_net + frutales_default)
```

| Servicio  | Imagen                      | Publicado en            | Notas                                     |
| --------- | --------------------------- | ----------------------- | ----------------------------------------- |
| `db`      | `postgres:16-alpine`        | solo interno            | Datos en el volumen `postgres_data`       |
| `migrate` | imagen build del servidor   | solo interno            | Ejecución única: migraciones + admin inicial |
| `server`  | imagen de producción        | solo interno            | Usuario no-root, healthcheck en `/health` |
| `client`  | `nginx:alpine` + build Vite | `npm_net` como `frutales-client` | SPA + proxy inverso de `/api`    |

## 0. Requisito previo: la red `npm_net`

La red externa compartida con el contenedor de Nginx Proxy Manager debe existir
(ya existe si NPM está corriendo):

```bash
docker network ls | grep npm_net || docker network create npm_net
```

## 1. Configuración inicial

```bash
cd frutales

# Crea el archivo de entorno, protégelo y asigna una contraseña fuerte.
cp .env.example .env
chmod 600 .env
openssl rand -base64 32   # copia el resultado en POSTGRES_PASSWORD
openssl rand -base64 48   # copia el resultado en JWT_SECRET
nano .env                 # contraseñas, JWT_SECRET, admin y DATABASE_URL
```

`.env` está en `.gitignore` — nunca lo subas al repositorio. En servidores
compartidos mantenlo con permisos `chmod 600`.

Variables de `.env`:

| Variable            | Propósito                                                                 |
| ------------------- | ------------------------------------------------------------------------- |
| `POSTGRES_USER`     | Usuario de la base de datos que crea el contenedor `db`                   |
| `POSTGRES_PASSWORD` | Contraseña de la base de datos — **cámbiala**                             |
| `POSTGRES_DB`       | Nombre de la base de datos                                                |
| `DATABASE_URL`      | Cadena de conexión de la API; el host debe ser `db` (servicio de compose). Mantén usuario/contraseña/base sincronizados con `POSTGRES_*` — no se expanden automáticamente |
| `NODE_ENV`          | `production` para el contenedor de la API                                 |
| `CLIENT_ORIGIN`     | Origen CORS (el navegador usa `/api` del mismo origen, casi nunca aplica) |
| `JWT_SECRET`        | Secreto para firmar las sesiones (mínimo 32 caracteres, **obligatorio**). Genéralo con `openssl rand -base64 48` |
| `JWT_EXPIRES_IN`    | Duración de la sesión (por defecto `7d`)                                  |
| `ADMIN_NAME`        | Nombre del administrador inicial (opcional)                               |
| `ADMIN_EMAIL`       | Correo del administrador inicial (opcional)                               |
| `ADMIN_PASSWORD`    | Contraseña del administrador inicial, mínimo 8 caracteres (opcional)      |

> El administrador inicial solo se crea si `ADMIN_EMAIL` y `ADMIN_PASSWORD`
> están definidos y el correo aún no existe. Cámbialo desde la pantalla
> **Usuarios** después del primer ingreso.

## 2. Despliegue en producción

```bash
docker compose up --build -d
```

Ese único comando:

1. construye las imágenes de la API y del cliente,
2. inicia PostgreSQL y espera a que esté saludable,
3. ejecuta el contenedor de inicialización `migrate` (`prisma migrate deploy` + `npm run db:seed`) y espera a que termine con éxito,
4. inicia la API y espera a que pase su healthcheck de `/health`,
5. inicia nginx y lo conecta a `npm_net` como **`frutales-client`** — quien lo
   expone a internet es Nginx Proxy Manager (no un puerto del host).

Verifica el estado (todos deben mostrar `healthy` / `exited (0)` en `migrate`):

```bash
docker compose ps

# El cliente debe aparecer en npm_net con el alias único:
docker network inspect npm_net --format '{{range .Containers}}{{.Name}} {{end}}'

# Prueba de humo desde dentro de la red:
docker run --rm --network npm_net alpine wget -qO- http://frutales-client/health
docker run --rm --network npm_net alpine wget -qO- http://frutales-client/api/health
```

## 2b. Publicar en Nginx Proxy Manager

En la interfaz de NPM: **Hosts → Proxy Hosts → Add Proxy Host**

| Campo                    | Valor                                                        |
| ------------------------ | ------------------------------------------------------------ |
| Domain Names             | `frutales.tudominio.com` (registro A → IP del servidor)      |
| Scheme                   | `http`                                                       |
| Forward Hostname/IP      | `frutales-client` (alias único en `npm_net`)                 |
| Forward Port             | `80`                                                         |
| Block Common Exploits    | activado                                                     |
| Websockets Support       | desactivado (no se necesita — API HTTP simple)               |
| Pestaña SSL              | Solicita un certificado Let's Encrypt, Force SSL y HTTP/2    |

`client` también resuelve en `npm_net`, pero el alias `frutales-client` evita
colisiones si otros proyectos también tienen un servicio llamado `client`.

> **Comprobantes (fotos):** las imágenes viajan como base64; para que NPM no las
> rechace, agrega en la pestaña **Advanced** del Proxy Host:
> `client_max_body_size 6m;` (el nginx del cliente ya lo permite).

Parar / actualizar:

```bash
docker compose down          # detiene y elimina contenedores (los datos se conservan)
docker compose up --build -d # reconstruye después de traer código nuevo
```

## 3. Desarrollo local (recarga en caliente)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

| URL                     | Qué                                               |
| ----------------------- | ------------------------------------------------- |
| http://localhost:5173   | Servidor de desarrollo Vite (recarga en caliente) |
| http://localhost:4000   | API (recarga en caliente con `tsx watch`)         |
| localhost:5432          | PostgreSQL (para `psql`, Prisma Studio, ...)      |

El override monta `server/src` y `client/src` como volúmenes, ejecuta
`npm run dev` en ambos contenedores y publica todos los puertos. Los cambios en
el código se recargan automáticamente; los cambios en `package.json`,
`prisma/schema.prisma` o los Dockerfiles requieren reconstruir.

> El override de desarrollo publica el puerto **5432**, así que detén cualquier
> PostgreSQL local primero (o edita el mapeo de puertos en
> `docker-compose.dev.yml`). También se une a `npm_net`, así que en máquinas sin
> NPM créala una vez: `docker network create npm_net`.

## 4. Migraciones manuales

Aplica migraciones pendientes sin reiniciar la pila (usa la misma imagen que el
contenedor `migrate`):

```bash
docker compose run --rm migrate npm run prisma:deploy
```

Crear/actualizar el administrador inicial sin reiniciar la pila (es idempotente;
usa las variables `ADMIN_*` del `.env`):

```bash
docker compose run --rm migrate npm run db:seed
```

Crea una migración nueva después de editar `server/prisma/schema.prisma` (modo desarrollo):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml run --rm \
  server npx prisma migrate dev --name <nombre_migracion>
```

Explora los datos con Prisma Studio (modo desarrollo, abre en el puerto 5555):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml run --rm --service-ports \
  server npx prisma studio
```

## 5. Registros (logs)

```bash
docker compose logs -f            # todos los servicios
docker compose logs -f server     # solo la API
docker compose logs -f client     # log de acceso/errores de nginx
docker compose logs -f db         # PostgreSQL
```

## 6. Copia de seguridad / restauración del volumen de la base de datos

Copia de seguridad (volcado SQL comprimido):

```bash
docker compose exec db sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' | gzip > backup-$(date +%F-%H%M).sql.gz
```

Restauración:

```bash
gunzip -c backup-2026-01-01-1200.sql.gz | docker compose exec -T db sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Alternativa: copia el volumen en bruto (con la pila detenida para consistencia):

```bash
docker compose down
docker run --rm -v frutales_postgres_data:/data -v "$PWD":/backup alpine \
  tar czf /backup/postgres_data-$(date +%F).tar.gz -C /data .
docker compose up -d
```

## Notas y solución de problemas

- **Tamaño de las imágenes.** Ambas imágenes de la app son builds multi-etapa
  sobre alpine; el runtime de la API instala solo dependencias de producción
  (`npm ci --omit=dev`) y el cliente Prisma generado (con su motor) se copia
  desde la etapa de build, así que la CLI de Prisma nunca llega a la imagen de
  runtime.
- **Migraciones como contenedor de inicialización.** `server` espera a que
  `migrate` termine (`service_completed_successfully`), así que las migraciones
  y el seed del administrador se ejecutan exactamente una vez por despliegue,
  antes de que arranque la API.
- **Sin `JWT_SECRET` la API no arranca.** Es intencional: todas las sesiones se
  firman con ese secreto. En producción usa uno distinto al de desarrollo.
- **Olvidaste la contraseña del único admin.** Define temporalmente otro
  `ADMIN_EMAIL` en `.env`, ejecuta `docker compose run --rm migrate npm run db:seed`
  y usa esa cuenta para restablecer la anterior desde **Usuarios**.
- **`migrate` termina con (0)** y aparece como `exited (0)` en
  `docker compose ps` — es lo esperado.
- **Error 502 en Nginx Proxy Manager** significa que NPM no puede alcanzar el
  contenedor del cliente: verifica que `docker network inspect npm_net` liste
  `frutales-client`, y luego `docker compose ps` / `docker compose logs server`.
- **Credenciales incorrectas** producen errores `P1000`/`P1001` de Prisma en el
  log del servidor — corrige `.env`, mantén `DATABASE_URL` sincronizado con
  `POSTGRES_*` y ejecuta `docker compose up -d`.
- **Nunca ejecutes migraciones contra bases de datos compartidas o de solo
  lectura.** La pila de compose solo habla con su propio servicio `db`.
