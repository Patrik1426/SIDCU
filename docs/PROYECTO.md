# Casa de la Cultura — Registro de Servidores Públicos

## Documento Consolidado: PRD · TRD · UI/UX · Flujos · Backend · Roadmap

**Versión:** 1.0  
**Fecha:** 2026-06-19  
**Estado:** En desarrollo

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [PRD — Requerimientos de Producto](#2-prd--requerimientos-de-producto)
3. [Arquitectura Técnica (TRD)](#3-arquitectura-técnica-trd)
4. [UI/UX](#4-uiux)
5. [Flujos de Sistema](#5-flujos-de-sistema)
6. [Backend](#6-backend)
7. [Roadmap](#7-roadmap)
8. [Setup & Deployment](#8-setup--deployment)

---

## 1. Resumen Ejecutivo

### ¿Qué es?

Sistema web interno para el registro, gestión y consulta de servidores públicos de la Casa de la Cultura. Centraliza la información de personal gubernamental con trazabilidad completa de cambios.

### Problema que resuelve

- Registro manual/disperso de servidores públicos en hojas de cálculo
- Sin trazabilidad de cambios (quién modificó qué y cuándo)
- Sin control de acceso por rol
- Sin reportes ni estadísticas centralizados

### Usuarios objetivo

| Usuario | Descripción |
|---------|-------------|
| Administrador | Control total del sistema: gestión de personal, usuarios, auditoría |
| Capturista | Personal de captura de datos: alta de servidores, importación masiva |
| Consultor | Personal de consulta: visualización de datos y reportes (solo lectura) |
| Usuario básico | Acceso mínimo: solo dashboard general |

### Beneficios clave

- Registro centralizado con validación automática (RFC, CURP)
- Auditoría automática de cada cambio
- Control de acceso granular por rol
- Reportes y estadísticas en tiempo real
- Exportación de datos (Excel/PDF)
- Importación masiva vía CSV

---

## 2. PRD — Requerimientos de Producto

### 2.1 Funcionalidades principales

#### Autenticación y autorización
- Registro de usuarios con email/contraseña
- Login con JWT almacenado en cookie httpOnly (7 días)
- Recuperación de contraseña por token
- 4 roles con permisos diferenciados

#### CRUD de servidores públicos
- Alta con validación de RFC y CURP (formatos oficiales)
- Edición con registro automático de cambios
- Eliminación con confirmación y auditoría
- Listado con filtros: búsqueda, dependencia, nivel, estatus, grupo de función
- Paginación (20 registros por página)

#### Auditoría
- Registro automático en cada crear/actualizar/eliminar
- Almacena estado anterior y posterior (JSON)
- Filtrable por servidor, usuario, tipo de acción
- Paginación de registros

#### Gestión de usuarios (admin)
- Listado con búsqueda por nombre/email
- Cambio de rol
- Activar/desactivar cuentas

### 2.2 Roles y permisos

| Funcionalidad | admin | capturista | consultor | user |
|---------------|:-----:|:----------:|:---------:|:----:|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Ver servidores | ✓ | ✓ | ✓ | ✗ |
| Crear servidores | ✓ | ✓ | ✗ | ✗ |
| Editar servidores | ✓ | ✗ | ✗ | ✗ |
| Eliminar servidores | ✓ | ✗ | ✗ | ✗ |
| Estadísticas | ✓ | ✗ | ✗ | ✗ |
| Auditoría | ✓ | ✗ | ✗ | ✗ |
| Gestión usuarios | ✓ | ✗ | ✗ | ✗ |
| Reportes | ✓ | ✗ | ✓ | ✗ |
| Importar CSV | ✓ | ✓ | ✗ | ✗ |
| Subir archivos (S3) | ✓ | ✓ | ✗ | ✗ |

### 2.3 Reglas de negocio

- **RFC:** Formato `/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/` — único por servidor
- **CURP:** Formato `/^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/` — único por servidor
- **Grupos de función:** ADMO (Administrativo), TECN (Técnico), SERV (Servicios), COMUN (Comunicación), PROFE (Profesional), EDU (Educación)
- **Niveles de gobierno:** Federal, Estatal, Municipal, Otro
- **Estatus:** Activo, Inactivo (default: activo)
- **Auditoría:** Toda mutación de servidores genera registro automáticamente con estado anterior/posterior
- **Contraseñas:** Mínimo 8 caracteres, hash bcrypt con salt rounds 12
- **Sesión:** JWT expira en 7 días, cookie httpOnly + sameSite lax

---

## 3. Arquitectura Técnica (TRD)

### 3.1 Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React + TypeScript | 19 / 5.9 |
| Bundler | Vite | 7 |
| Estilos | Tailwind CSS | 4 |
| Componentes UI | Radix UI (shadcn) | — |
| Router | wouter | 3 |
| Backend | Express + tRPC | 4 / 11.6 |
| Validación | Zod | 4 |
| Base de datos | MySQL | 8+ |
| ORM | Drizzle | 0.44 |
| Auth | bcryptjs + jsonwebtoken | 2 / 9 |
| Storage | AWS S3 | — |
| Gráficas | Recharts | 2 |
| Exportación | xlsx, jspdf + jspdf-autotable | 0.18 / 2 |
| Testing | Vitest | — |
| Package manager | pnpm | — |

### 3.2 Estructura del proyecto

```
casa_cultura/
├── client/src/
│   ├── App.tsx                          # Router principal + rutas protegidas
│   ├── main.tsx                         # Entry point + tRPC/QueryClient setup
│   ├── index.css                        # Tailwind + estilos globales
│   ├── components/
│   │   ├── DashboardLayout.tsx          # Layout con sidebar + nav por rol
│   │   ├── ServidorForm.tsx             # Formulario reutilizable crear/editar
│   │   └── ui/                          # Componentes shadcn
│   ├── pages/
│   │   ├── Home.tsx                     # Login / Registro
│   │   ├── Servidores.tsx               # CRUD tabla + modal
│   │   ├── Usuarios.tsx                 # Gestión usuarios (admin)
│   │   ├── RecuperarContrasena.tsx       # Solicitar reset
│   │   ├── RestablecerContrasena.tsx     # Confirmar reset
│   │   └── NotFound.tsx                 # 404
│   ├── contexts/
│   │   └── ThemeContext.tsx             # Tema oscuro (placeholder)
│   ├── hooks/
│   │   └── useAuth.ts                   # Estado auth + mutations
│   └── lib/
│       └── trpc.ts                      # Cliente tRPC
│
├── server/
│   ├── index.ts                         # Express + Vite dev middleware
│   ├── trpc.ts                          # Init tRPC + procedures (public/protected/admin)
│   ├── auth.ts                          # Hash, verify, JWT generate/verify
│   ├── db.ts                            # Queries Drizzle (users, servidores, auditoría)
│   ├── routers.ts                       # Auth router + appRouter
│   ├── middleware/auth.ts               # Context JWT desde cookie
│   ├── routers/
│   │   ├── servidores.ts                # CRUD + auditoría + estadísticas
│   │   └── usuarios.ts                  # Gestión usuarios (admin)
│   └── auth.test.ts                     # Tests unitarios auth
│
├── shared/
│   ├── types.ts                         # Tipos compartidos (Role, GrupoFuncion, etc.)
│   └── const.ts                         # Constantes (COOKIE_NAME, ROLES, etc.)
│
├── drizzle/
│   ├── schema.ts                        # 5 tablas + tipos + índices
│   └── migrations/                      # SQL generado
│
├── .env                                 # Variables de entorno (no en git)
├── drizzle.config.ts                    # Config Drizzle
├── vite.config.ts                       # Config Vite + aliases
├── vitest.config.ts                     # Config tests
├── tsconfig.json                        # TypeScript
└── package.json                         # Scripts + dependencias
```

### 3.3 Schema de base de datos

#### Tabla `users`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | INT | PK, auto_increment |
| nombre | VARCHAR(255) | NOT NULL |
| email | VARCHAR(320) | NOT NULL, UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL |
| role | ENUM('admin','capturista','consultor','user') | DEFAULT 'user' |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW(), ON UPDATE |
| last_signed_in | TIMESTAMP | NULLABLE |

#### Tabla `servidores_publicos`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | INT | PK, auto_increment |
| nombre_completo | VARCHAR(255) | NOT NULL |
| rfc | VARCHAR(13) | NOT NULL, UNIQUE, INDEX |
| curp | VARCHAR(18) | NOT NULL, UNIQUE, INDEX |
| cargo | VARCHAR(255) | NOT NULL |
| dependencia | VARCHAR(255) | NOT NULL, INDEX |
| nivel | ENUM('federal','estatal','municipal','otro') | INDEX |
| fecha_ingreso | TIMESTAMP | NOT NULL |
| datos_contacto | VARCHAR(255) | NULLABLE |
| grupo_funcion | ENUM('ADMO','TECN','SERV','COMUN','PROFE','EDU') | INDEX |
| estatus | ENUM('activo','inactivo') | DEFAULT 'activo', INDEX |
| observaciones | TEXT | NULLABLE |
| creado_por | INT | NOT NULL (FK users) |
| actualizado_por | INT | NOT NULL (FK users) |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW(), ON UPDATE |

#### Tabla `auditoria`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | INT | PK, auto_increment |
| servidor_id | INT | NOT NULL, INDEX |
| usuario_id | INT | NOT NULL, INDEX |
| accion | ENUM('crear','actualizar','eliminar') | NOT NULL |
| cambios_anteriores | TEXT | NULLABLE (JSON) |
| cambios_posterior | TEXT | NULLABLE (JSON) |
| descripcion | TEXT | NULLABLE |
| created_at | TIMESTAMP | DEFAULT NOW(), INDEX |

#### Tabla `archivos_cargados`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | INT | PK, auto_increment |
| nombre_original | VARCHAR(255) | NOT NULL |
| tipo_archivo | VARCHAR(50) | NOT NULL |
| tamano_bytes | BIGINT | NOT NULL |
| s3_key | VARCHAR(500) | NOT NULL |
| s3_url | TEXT | NOT NULL |
| cargado_por | INT | NOT NULL (FK users) |
| created_at | TIMESTAMP | DEFAULT NOW() |

#### Tabla `password_reset_tokens`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | INT | PK, auto_increment |
| user_id | INT | NOT NULL |
| token | VARCHAR(255) | NOT NULL, UNIQUE |
| expires_at | TIMESTAMP | NOT NULL |
| used_at | TIMESTAMP | NULLABLE |
| created_at | TIMESTAMP | DEFAULT NOW() |

### 3.4 API — Endpoints tRPC

#### Router `auth`

| Procedimiento | Tipo | Auth | Input | Output |
|---------------|------|------|-------|--------|
| `register` | mutation | público | `{nombre, email, password}` | `{success, id}` |
| `login` | mutation | público | `{email, password}` | `{success, user}` |
| `me` | query | público | — | `user \| null` |
| `logout` | mutation | público | — | `{success}` |
| `solicitarRestablecimiento` | mutation | público | `{email}` | `{success}` |
| `restablecerContrasena` | mutation | público | `{token, password}` | `{success}` |

#### Router `servidores`

| Procedimiento | Tipo | Roles | Input |
|---------------|------|-------|-------|
| `crear` | mutation | admin, capturista | ServidorInput completo |
| `listar` | query | admin, capturista, consultor | `{search?, dependencia?, nivel?, estatus?, grupoFuncion?, page?, limit?}` |
| `obtener` | query | admin, capturista, consultor | `{id}` |
| `actualizar` | mutation | admin | `{id, ...campos parciales}` |
| `eliminar` | mutation | admin | `{id}` |
| `estadisticas` | query | admin | — |
| `auditoria` | query | admin | `{servidorId?, usuarioId?, accion?, page?, limit?}` |

#### Router `usuarios`

| Procedimiento | Tipo | Auth | Input |
|---------------|------|------|-------|
| `listar` | query | admin | `{search?}` |
| `cambiarRol` | mutation | admin | `{id, role}` |
| `toggleActivo` | mutation | admin | `{id}` |

---

## 4. UI/UX

### 4.1 Páginas

| Ruta | Página | Auth | Descripción |
|------|--------|------|-------------|
| `/` | Home | No | Login/Registro con tabs |
| `/dashboard` | Dashboard | Sí (todos) | Panel principal (pendiente) |
| `/servidores` | Servidores | Sí (admin, capturista, consultor) | CRUD tabla con filtros y modal |
| `/archivos` | Carga de Archivos | Sí (admin, capturista) | Upload a S3 (pendiente) |
| `/usuarios` | Gestión Usuarios | Sí (admin) | Tabla con cambio rol/estado |
| `/auditoria` | Auditoría | Sí (admin) | Log de cambios (pendiente) |
| `/reportes` | Reportes | Sí (admin, consultor) | Gráficas y exportación (pendiente) |
| `/recuperar-contrasena` | Recuperar Contraseña | No | Formulario email |
| `/restablecer-contrasena/:token` | Restablecer Contraseña | No | Nueva contraseña |

### 4.2 Layout principal (DashboardLayout)

```
┌─────────────────────────────────────────────────┐
│ ┌──────────┐ ┌──────────────────────────────────┐│
│ │ SIDEBAR  │ │         CONTENIDO PRINCIPAL      ││
│ │          │ │                                   ││
│ │ Logo CC  │ │  (Página renderizada según ruta)  ││
│ │          │ │                                   ││
│ │ Nav:     │ │                                   ││
│ │ Dashboard│ │                                   ││
│ │ Servid.  │ │                                   ││
│ │ Archivos │ │                                   ││
│ │ Usuarios │ │                                   ││
│ │ Auditor. │ │                                   ││
│ │ Reportes │ │                                   ││
│ │          │ │                                   ││
│ │ ──────── │ │                                   ││
│ │ Usuario  │ │                                   ││
│ │ Cerrar   │ │                                   ││
│ └──────────┘ └──────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

- Sidebar colapsable en móvil (< 1024px)
- Navegación dinámica según rol del usuario
- Indicador de ruta activa
- Sección usuario: nombre, email, botón logout

### 4.3 Componentes principales

#### ServidorForm (crear/editar)
- Layout 2 columnas (1 en móvil)
- Campos: nombreCompleto, RFC, CURP, cargo, dependencia, nivel, grupoFuncion, fechaIngreso, estatus, datosContacto, observaciones
- Auto-uppercase en RFC y CURP
- Validación inline con mensajes de error
- Props: `initialData`, `onSubmit`, `onCancel`, `loading`, `submitLabel`

#### Página Servidores
- Barra de filtros: búsqueda texto, dropdowns (dependencia, nivel, estatus, grupo)
- Botón "Nuevo Servidor" (admin/capturista)
- Tabla con columnas: nombre, RFC, CURP, cargo, dependencia, nivel, estatus
- Acciones por fila: editar (admin), eliminar (admin) con confirmación
- Modal para crear/editar con ServidorForm
- Paginación 20 items/página

---

## 5. Flujos de Sistema

### 5.1 Autenticación

```
REGISTRO:
  Usuario → Form(nombre, email, password)
    → POST auth.register
    → Validar email único
    → Hash password (bcrypt, salt 12)
    → Insertar user (role=user)
    → Respuesta éxito

LOGIN:
  Usuario → Form(email, password)
    → POST auth.login
    → Buscar user por email
    → Verificar password vs hash
    → Generar JWT (payload: id, email, role, exp: 7d)
    → Set cookie httpOnly "casa_cultura_session"
    → Redirect /dashboard

VERIFICAR SESIÓN:
  Cada request → Middleware lee cookie
    → verifyToken(jwt)
    → ctx.user = decoded | null

LOGOUT:
  → POST auth.logout
  → Limpiar cookie
  → Redirect /
```

### 5.2 Recuperación de contraseña

```
SOLICITAR:
  Usuario → Form(email)
    → POST auth.solicitarRestablecimiento
    → Buscar user (si no existe, responde éxito igual — no revelar)
    → Generar token random 32 bytes hex
    → Guardar en password_reset_tokens (expira 24h)
    → TODO: Enviar email con link
    → Respuesta éxito

RESTABLECER:
  Usuario → /restablecer-contrasena/:token
    → Form(password, confirmPassword)
    → POST auth.restablecerContrasena
    → Validar token existe, no usado, no expirado
    → Hash nueva password
    → Actualizar user.passwordHash
    → Marcar token como usado
    → Redirect a login
```

### 5.3 CRUD Servidores con auditoría

```
CREAR:
  Capturista/Admin → Form ServidorForm
    → POST servidores.crear
    → Validar RFC/CURP formato + unicidad
    → Insertar registro
    → Crear auditoría (accion='crear', cambiosPosterior=JSON)
    → Refresh lista

EDITAR (solo admin):
  → GET servidores.obtener(id) → cargar datos actuales
  → Form ServidorForm con initialData
  → POST servidores.actualizar
  → Leer estado anterior
  → Actualizar registro
  → Crear auditoría (accion='actualizar', anterior=JSON, posterior=JSON)
  → Refresh lista

ELIMINAR (solo admin):
  → Confirmación UI
  → POST servidores.eliminar
  → Leer estado completo antes de borrar
  → Eliminar registro
  → Crear auditoría (accion='eliminar', cambiosAnteriores=JSON)
  → Refresh lista
```

### 5.4 Gestión de usuarios (admin)

```
LISTAR:
  Admin → GET usuarios.listar({search?})
    → Tabla con nombre, email, rol, estado, última conexión

CAMBIAR ROL:
  Admin → Dropdown rol en tabla
    → POST usuarios.cambiarRol({id, role})
    → Actualizar DB
    → Refresh lista

TOGGLE ESTADO:
  Admin → Botón activar/desactivar
    → POST usuarios.toggleActivo({id})
    → Invertir is_active
    → Refresh lista
```

---

## 6. Backend

### 6.1 Middleware y procedures

```typescript
// Niveles de acceso tRPC:
publicProcedure    → Sin auth requerida
protectedProcedure → Requiere JWT válido (ctx.user != null)
adminProcedure     → Requiere JWT + role='admin'
requireRole(roles) → Requiere JWT + role en lista permitida
```

### 6.2 Autenticación (server/auth.ts)

| Función | Descripción |
|---------|-------------|
| `hashPassword(password)` | bcrypt hash, salt rounds 12 |
| `verifyPassword(password, hash)` | Comparar plaintext vs hash |
| `generateToken(user)` | JWT con `{id, email, role}`, expira 7 días |
| `verifyToken(token)` | Verificar firma + expiración, retorna payload o null |

### 6.3 Queries DB (server/db.ts)

#### Usuarios
- `getUserByEmail(email)` — Buscar por email
- `getUserById(id)` — Buscar por ID
- `createUser(data)` — Crear usuario
- `listarUsuarios(search?)` — Listar con búsqueda
- `cambiarRolUsuario(id, role)` — Cambiar rol
- `toggleActivoUsuario(id)` — Toggle activo/inactivo
- `actualizarPasswordUsuario(userId, hash)` — Actualizar contraseña

#### Servidores
- `crearServidor(data)` — Insertar nuevo servidor público
- `listarServidores(filtros)` — Listar con paginación y filtros (search, dependencia, nivel, estatus, grupoFuncion)
- `obtenerServidorPorId(id)` — Obtener por ID
- `actualizarServidor(id, data)` — Actualizar registro
- `eliminarServidor(id)` — Eliminar registro
- `getServidoresStats()` — Conteos por estatus, nivel, grupoFuncion

#### Auditoría
- `crearAuditoria(data)` — Registrar cambio
- `listarAuditoria(filtros)` — Listar con paginación (servidorId, usuarioId, accion)

#### Tokens
- `crearTokenRestablecimiento(userId, token, expiresAt)` — Crear token reset
- `obtenerTokenRestablecimiento(token)` — Buscar token
- `marcarTokenComoUsado(id)` — Marcar usado

### 6.4 Validaciones Zod

```typescript
// Servidor input
{
  nombreCompleto: z.string().min(2),
  rfc: z.string().regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/),
  curp: z.string().regex(/^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/),
  cargo: z.string().min(2),
  dependencia: z.string().min(2),
  nivel: z.enum(["federal", "estatal", "municipal", "otro"]),
  fechaIngreso: z.date(),
  datosContacto: z.string().nullable().optional(),
  grupoFuncion: z.enum(["ADMO", "TECN", "SERV", "COMUN", "PROFE", "EDU"]),
  estatus: z.enum(["activo", "inactivo"]).default("activo"),
  observaciones: z.string().nullable().optional(),
}
```

### 6.5 Tests existentes

**server/auth.test.ts** — Tests unitarios:
- `hashPassword()` genera hashes diferentes cada vez
- `verifyPassword()` valida correcta/incorrecta
- `generateToken() + verifyToken()` round-trip JWT
- `verifyToken()` retorna null para token inválido

---

## 7. Roadmap

### Features pendientes (por implementar)

| Feature | Prioridad | Descripción |
|---------|-----------|-------------|
| **Dashboard** | Alta | Panel con estadísticas generales, gráficas de distribución por nivel/grupo/estatus, actividad reciente |
| **Página Auditoría** | Alta | UI para visualizar log de auditoría con filtros y paginación (backend ya existe) |
| **Reportes con gráficas** | Media | Página con gráficas Recharts: distribución por dependencia, nivel, grupo función, tendencias temporales |
| **Exportación Excel** | Media | Exportar listado de servidores filtrado a archivo .xlsx (librería xlsx ya instalada) |
| **Exportación PDF** | Media | Exportar listado/reportes a PDF (jspdf + jspdf-autotable ya instalados) |
| **Importación CSV** | Media | Carga masiva de servidores desde archivo CSV con validación y preview |
| **Carga de archivos S3** | Baja | Upload de documentos asociados a servidores, almacenamiento en AWS S3 |
| **Envío de email reset** | Baja | Integrar servicio email para enviar links de recuperación de contraseña |
| **Tema oscuro** | Baja | ThemeContext ya existe como placeholder, implementar toggle y estilos |

### Estado actual por módulo

| Módulo | Estado | Notas |
|--------|--------|-------|
| Auth (login/registro/reset) | ✅ Completo | Falta envío email para reset |
| CRUD Servidores | ✅ Completo | Backend + frontend funcional |
| Auditoría | ⚠️ Parcial | Backend listo, falta UI |
| Gestión Usuarios | ✅ Completo | Admin puede gestionar roles/estado |
| Dashboard | ❌ Pendiente | Solo placeholder |
| Reportes | ❌ Pendiente | Solo placeholder |
| Exportación | ❌ Pendiente | Librerías instaladas |
| Importación CSV | ❌ Pendiente | Router definido pero sin implementación |
| Archivos S3 | ❌ Pendiente | Tabla DB lista, falta lógica |

---

## 8. Setup & Deployment

### 8.1 Requisitos

- Node.js 18+
- MySQL 8+ (o 9.x)
- pnpm
- (Opcional) Cuenta AWS para S3

### 8.2 Variables de entorno

Crear archivo `.env` en la raíz del proyecto:

```env
# Requeridas
DATABASE_URL=mysql://root:password@localhost:3306/casa_cultura
JWT_SECRET=cambiar-en-produccion

# Opcionales (para carga de archivos)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=

# Opcionales
PORT=3000
```

### 8.3 Instalación

```bash
# 1. Instalar dependencias
pnpm install

# 2. Crear base de datos
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS casa_cultura;"

# 3. Aplicar schema
pnpm db:push

# 4. Iniciar servidor de desarrollo
pnpm dev
# → http://localhost:3000
```

### 8.4 Comandos disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Servidor desarrollo (Express + Vite HMR) en :3000 |
| `pnpm build` | Build producción (Vite + TypeScript check) |
| `pnpm start` | Servidor producción |
| `pnpm test` | Ejecutar tests (Vitest) |
| `pnpm check` | Verificación TypeScript |
| `pnpm db:push` | Aplicar schema Drizzle a DB |
| `pnpm db:generate` | Generar migraciones |
| `pnpm db:migrate` | Ejecutar migraciones |
| `pnpm db:studio` | Editor visual DB (Drizzle Studio) |

### 8.5 Producción

```bash
# Build
pnpm build

# Configurar NODE_ENV
NODE_ENV=production

# Iniciar
pnpm start
# Sirve frontend estático desde dist/client + API en mismo puerto
```

---

*Documento generado el 2026-06-19. Actualizar conforme avance el desarrollo.*
