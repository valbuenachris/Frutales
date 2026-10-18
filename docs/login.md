# Plan de implementación — Login de Frutales

> **Estado:** implementado. Para desplegar, define `JWT_SECRET` y `ADMIN_*` en el `.env` del servidor y ejecuta `docker compose up --build -d` (el servicio `migrate` aplica la migración y crea el admin inicial).

**Decisiones confirmadas:** usuarios en PostgreSQL con roles (`admin`/`usuario`), sesión con JWT en cookie `httpOnly`, datos compartidos y sin registro público.

## 1. Backend (`server/`)

**Dependencias:** `bcryptjs`, `jose` (JWT ESM), `cookie-parser`, `express-rate-limit`.

**Base de datos** (`prisma/schema.prisma`):

```prisma
enum UserRole { admin usuario }

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role         UserRole @default(usuario)
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  @@map("users")
}
```

- Migración aditiva `usuarios` con `prisma migrate dev --create-only`, revisión del SQL, luego `prisma migrate deploy` + `prisma generate` (evita resetear la BD local con datos).
- Seed idempotente `prisma/seed.ts`: crea el admin inicial desde `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`; si ya existe, no lo modifica. Script `npm run db:seed`.

**Variables nuevas** (`server/src/config/env.ts`, `.env`, `.env.example`, compose):

- `JWT_SECRET` (mínimo 32 caracteres, obligatorio).
- `JWT_EXPIRES_IN` (default `7d`).
- `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (solo para el seed).

**Módulo auth** (`src/modules/auth/`):

- `POST /api/auth/login`: valida email/contraseña con Zod, normaliza email, compara hash bcrypt, responde `{ data: user }` y setea cookie `frutales_session` (`httpOnly`, `sameSite=lax`, `secure` en producción, `maxAge` 7 días).
- `POST /api/auth/logout`: borra la cookie.
- `GET /api/auth/me`: devuelve el usuario autenticado.
- Errores genéricos: `401 Credenciales inválidas`.
- Rate limit en login (p. ej. 10 intentos/15 min por IP).

**Middleware** (`src/middleware/require-auth.ts`):

- Verifica el JWT, carga el usuario en BD (así refleja cambios de rol, desactivación o borrado) y lo adjunta al request.
- `requireRole('admin')` para gestión de usuarios.

**Usuarios** (`src/modules/users/`), solo admin:

- `GET /api/users`, `POST /api/users`, `PUT /api/users/:id`, `DELETE /api/users/:id`.
- Validaciones: email único, contraseña mínimo 8, rol válido; no permitir autodesactivarse/autoborarse ni dejar el sistema sin admin.
- Nunca devolver `passwordHash`.

**Protección global** (`app.ts`): todo `/api/*` requiere sesión salvo `/api/health` y `/api/auth/login`; `/api/auth/logout` y `/api/auth/me` usan el middleware. Configurar `trust proxy` para obtener la IP real detrás de nginx.

**Docker/seed:** el servicio `migrate` ejecutará `prisma migrate deploy && npm run db:seed`, recibiendo las variables del admin; si no están definidas, el seed avisa y no crea nada. Actualizar `docker-compose.yml`, `docker-compose.dev.yml`, `.env.example` y `DOCKER.md`.

## 2. Frontend (`client/`)

- `src/types/auth.ts` (usuario y rol) y `src/api/auth.ts` / `src/api/users.ts`.
- `apiRequest`: agregar `credentials: 'include'`; al recibir `401` fuera de `/auth/*`, emitir evento para cerrar sesión globalmente.
- `src/auth/AuthProvider.tsx`: consulta `GET /auth/me` con TanStack Query, expone `user`, `login`, `logout`; limpia la caché de queries al entrar/salir.
- `src/auth/RequireAuth.tsx`: mientras carga muestra estado de carga; sin sesión redirige a `/login` guardando la ruta de origen; `RequireAdmin` para `/usuarios`.
- `src/pages/LoginPage.tsx`: mobile-first, tarjeta centrada, email/contraseña, autocompletado, mostrar/ocultar contraseña, errores en español, estado de carga y redirección al origen.
- `src/pages/UsersPage.tsx`: listado y modal de crear/editar (nombre, email, contraseña, rol, activo) con confirmación de borrado.
- `App.tsx`: `AuthProvider` → rutas; `/login` pública y el resto dentro de `RequireAuth` + `AppLayout`.
- `Layout.tsx`: bloque de usuario (nombre/email, rol) con botón "Cerrar sesión"; ítem "Usuarios" visible solo para admin.

## 3. Ajuste importante para desarrollo

Con cookies no se puede usar `VITE_API_URL=http://localhost:4000/api` en Docker dev (puerto cruzado). Se cambiará a `/api` y el proxy de Vite apuntará a `http://server:4000` mediante `VITE_PROXY_TARGET`; en local sin Docker ya funciona el proxy actual. Producción no requiere cambios en nginx: SPA y API comparten origen.

## 4. Verificación

- `server`: `npm run typecheck`, `npm run build`, migración aplicada y `npm run db:seed`.
- `client`: `npm run typecheck`, `npm run build`.
- Smoke test con `node -e "fetch(...)"`: `/api/projects` sin cookie → 401; login → cookie; `/auth/me` → usuario; logout → 401; admin crea/edita/elimina usuario; usuario normal recibe 403 en `/api/users`.

## 5. Documentación

Actualizar `README.md` (login, admin inicial, endpoints, variables), `DOCKER.md` y las reglas de autenticación en `AGENTS.md`.

**Nota:** no se incluye registro público ni recuperación de contraseña; un admin puede resetear contraseñas desde "Usuarios". El admin inicial debe cambiar su contraseña tras el primer acceso.
