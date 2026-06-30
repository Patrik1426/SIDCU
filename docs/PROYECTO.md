# SIGECAP — Sistema de Gestión y Capacitación de Servidores Públicos

## Documento Consolidado: PRD · TRD · UI/UX · Flujos · Backend · Roadmap

**Versión:** 2.0  
**Fecha:** 2026-06-25  
**Estado:** En producción  
**URL:** https://sigecap-production.up.railway.app/

---

## 1. Resumen Ejecutivo

### ¿Qué es?

Plataforma web para la Secretaría de Cultura que centraliza el registro, gestión y capacitación de servidores públicos. Incluye CRUD completo, auditoría, reportes, importación masiva, portal de capacitación con progresión por niveles, y sistema de roles.

### Problema que resuelve

- Registro manual/disperso en hojas de cálculo
- Sin trazabilidad de cambios
- Sin control de capacitación ni seguimiento de niveles
- Sin control de acceso por rol
- Sin reportes centralizados

### Usuarios objetivo

| Usuario | Descripción |
|---------|-------------|
| Administrador | Control total: servidores, usuarios, cursos, instituciones, solicitudes, auditoría, reportes |
| Capturista | Crear servidores, importar CSV |
| Consultor | Solo lectura: ver servidores, reportes, exportar datos |
| Usuario (Servidor Público) | Portal personal: onboarding, catálogo cursos, solicitar inscripción, constancia PDF |

---

## 2. PRD — Requerimientos de Producto

### 2.1 Funcionalidades principales

#### Autenticación
- Login con CURP + contraseña (sin email)
- Registro público: user ingresa CURP → sistema vincula a servidor existente si lo encuentra
- Contraseñas visibles para admin
- Bloqueo de login si cuenta desactivada
- JWT httpOnly cookies (7 días)
- Opción "Recordarme" (30 días)

#### CRUD de Servidores Públicos
- Alta con validación de RFC y CURP
- Campos: nombre, RFC, CURP, cargo, dependencia, UPA (Sector), CMAO (CMAO1-18), UA (Dirección), nivel progresión (0-N5), grupo función, estatus
- Selección múltiple y eliminación masiva
- Badge Registrado/Pendiente
- Catálogos auto-crecientes (UPA, UA) con ComboInput

#### Portal de Capacitación (rol user)
- Onboarding obligatorio de 3 pasos (no puede navegar sin completar)
- Onboarding idempotente (reintentos no duplican datos)
- Catálogo de cursos (sin filtro de nivel)
- Máximo 2 cursos activos por usuario
- Validación de empalme de fechas
- Constancia de registro PDF descargable
- Solicitud de baja con motivo

#### Gestión de Cursos
- CRUD con vista cuadrícula y lista
- Selección múltiple y eliminación masiva
- Importación CSV con detección de encoding
- Asignación de instituciones con días + horarios

#### Gestión de Usuarios
- Crear, cambiar rol, activar/desactivar, eliminar
- Al eliminar: servidor queda inactivo (CURP bloqueada)
- Al desactivar: servidor sincronizado a inactivo
- Al reactivar: servidor recreado automáticamente

#### Importación masiva CSV
- Servidores, cursos e instituciones
- Defaults automáticos para campos vacíos
- Detección de encoding (UTF-8/Latin-1)
- Validación de duplicados dentro del CSV y contra DB
- Resumen visual: importados/omitidos/errores
- Parser que respeta comillas (campos con comas)
- Procesamiento en lotes de 50

#### Auditoría
- Registro automático de toda mutación sobre servidores
- Estado anterior y posterior (JSON)
- Filtrable por servidor, usuario, acción

#### Exportación
- Excel y PDF con todos los campos
- Colores institucionales guinda en PDF

### 2.2 Roles y permisos

| Funcionalidad | admin | capturista | consultor | user |
|---------------|:-----:|:----------:|:---------:|:----:|
| Dashboard | ✓ | ✓ | ✓ | ✗ |
| Portal capacitación | ✗ | ✗ | ✗ | ✓ |
| Ver servidores | ✓ | ✓ | ✓ | ✗ |
| Crear servidores | ✓ | ✓ | ✗ | ✗ |
| Editar servidores | ✓ | ✗ | ✗ | ✗ |
| Eliminar servidores | ✓ | ✗ | ✗ | ✗ |
| Gestión cursos | ✓ | ✗ | ✗ | ✗ |
| Gestión instituciones | ✓ | ✗ | ✗ | ✗ |
| Gestión solicitudes | ✓ | ✗ | ✗ | ✗ |
| Gestión usuarios | ✓ | ✗ | ✗ | ✗ |
| Auditoría | ✓ | ✗ | ✗ | ✗ |
| Reportes | ✓ | ✗ | ✓ | ✗ |
| Importar CSV | ✓ | ✓ | ✗ | ✗ |
| Solicitar cursos | ✗ | ✗ | ✗ | ✓ |
| Constancia PDF | ✗ | ✗ | ✗ | ✓ |

### 2.3 Reglas de negocio

- **Login:** CURP + contraseña (sin email)
- **RFC:** Único por servidor. Si no se tiene, se genera temporal (PEND...)
- **CURP:** Único por servidor y por usuario. Validación de formato oficial
- **Nivel gobierno:** Solo federal
- **Niveles progresión:** 0 (Nuevo ingreso), N1-N5
- **Máximo cursos activos:** 2 por usuario
- **Empalme fechas:** No permitido entre cursos del mismo usuario
- **Baja:** CURP queda bloqueada, solo admin puede reactivar
- **Onboarding:** Obligatorio, idempotente, una sola vez
- **Auditoría:** Toda mutación genera registro automático

---

## 3. Arquitectura Técnica (TRD)

### 3.1 Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React + TypeScript | 19 / 5.9 |
| Bundler | Vite | 7 |
| Estilos | Tailwind CSS | 4 |
| Animaciones | framer-motion | 11 |
| Router | wouter | 3 |
| Backend | Express + tRPC | 4 / 11.6 |
| Validación | Zod | 4 |
| Base de datos | MySQL | 9.7 |
| ORM | Drizzle | 0.44 |
| Auth | bcryptjs + jsonwebtoken | 2 / 9 |
| Gráficas | Recharts | 2 |
| Exportación | xlsx, jspdf + jspdf-autotable | 0.18 / 2 |
| Rate limiting | express-rate-limit | 8.5 |
| Deploy | Railway | — |
| Tipografía | Noto Sans (Google Fonts) | — |

### 3.2 Estructura del proyecto

```
sigecap/
├── client/
│   ├── public/                    # Imágenes institucionales
│   │   ├── joven-mexicana.png
│   │   ├── gobierno.png
│   │   └── Gobierno-blanco.png
│   ├── index.html
│   └── src/
│       ├── App.tsx                # Router + rutas protegidas
│       ├── main.tsx               # Entry point + tRPC setup
│       ├── index.css              # Paleta centralizada + tipografía
│       ├── components/
│       │   ├── DashboardLayout.tsx # Sidebar colapsable + guard onboarding
│       │   ├── ServidorForm.tsx    # Form crear/editar servidor
│       │   ├── ConfirmModal.tsx    # Modal confirmación reutilizable
│       │   ├── Skeleton.tsx        # Loading states
│       │   ├── ComboInput.tsx      # Dropdown + texto libre
│       │   ├── ImportarCSVModal.tsx # Modal importación CSV
│       │   └── ui/                # Componentes shadcn
│       ├── pages/
│       │   ├── Home.tsx           # Login/Registro (CURP)
│       │   ├── Dashboard.tsx      # Panel admin
│       │   ├── Servidores.tsx     # CRUD tabla + selección múltiple
│       │   ├── Usuarios.tsx       # Gestión usuarios
│       │   ├── GestionCursos.tsx  # CRUD cursos grid/lista
│       │   ├── Instituciones.tsx  # CRUD instituciones
│       │   ├── GestionSolicitudes.tsx # Admin solicitudes
│       │   ├── Onboarding.tsx     # 3 pasos obligatorio
│       │   ├── Portal.tsx         # Dashboard user + constancia
│       │   ├── CatalogoCursos.tsx # Catálogo para users
│       │   ├── MisSolicitudes.tsx # Solicitudes del user
│       │   ├── Auditoria.tsx      # Log de cambios
│       │   ├── Reportes.tsx       # Gráficas
│       │   └── Importacion.tsx    # Importar CSV servidores
│       ├── hooks/
│       │   └── useAuth.ts
│       └── lib/
│           ├── trpc.ts
│           └── exportar.ts        # Excel/PDF client-side
│
├── server/
│   ├── index.ts                   # Express + rate limiting + health check
│   ├── trpc.ts                    # Procedures (public/protected/admin)
│   ├── auth.ts                    # Hash, verify, JWT
│   ├── db.ts                      # Queries Drizzle + connection pool + circuit breaker
│   ├── routers.ts                 # Auth router + appRouter
│   ├── middleware/
│   │   ├── auth.ts                # Context JWT
│   │   ├── rateLimiter.ts         # Rate limiting por ruta
│   │   └── circuitBreaker.ts      # Protección DB
│   └── routers/
│       ├── servidores.ts          # CRUD + auditoría + UPAs + UAs
│       ├── usuarios.ts            # Gestión + eliminar
│       ├── perfil.ts              # Onboarding + baja
│       ├── cursos.ts              # CRUD + importar + eliminar
│       ├── instituciones.ts       # CRUD + importar
│       ├── solicitudes.ts         # Crear + aprobar + rechazar + completar
│       └── importacion.ts         # Importar servidores CSV
│
├── drizzle/
│   └── schema.ts                  # 9 tablas + índices compuestos
│
├── docs/                          # Documentación
├── nixpacks.toml                  # Config Railway
└── package.json
```

### 3.3 Schema de base de datos (9 tablas)

#### `users`
| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | INT | PK |
| nombre | VARCHAR(255) | NOT NULL |
| curp | VARCHAR(18) | INDEX |
| email | VARCHAR(320) | NULLABLE |
| password_hash | VARCHAR(255) | NOT NULL |
| password_visible | VARCHAR(255) | NULLABLE |
| role | ENUM | DEFAULT 'user' |
| is_active | BOOLEAN | DEFAULT true |
| Índices | | curp, role+is_active |

#### `servidores_publicos`
| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | INT | PK |
| user_id | INT | FK → users, INDEX |
| nombre_completo | VARCHAR(255) | NOT NULL, INDEX |
| rfc | VARCHAR(13) | NOT NULL, UNIQUE |
| curp | VARCHAR(18) | NOT NULL, UNIQUE |
| cargo, dependencia | VARCHAR(255) | NOT NULL |
| nivel | ENUM | federal/estatal/municipal/otro |
| upa | VARCHAR(100) | INDEX |
| cmao | VARCHAR(50) | INDEX |
| ua | VARCHAR(255) | INDEX |
| nivel_progresion | INT | DEFAULT 0, INDEX |
| grupo_funcion | ENUM | INDEX |
| estatus | ENUM | activo/inactivo, INDEX |
| Índices compuestos | | estatus+userId, dependencia+estatus |

#### `perfiles_servidor`
| Columna | Tipo | Notas |
|---------|------|-------|
| completado | BOOLEAN | Marca onboarding completado |
| solicitud_baja | BOOLEAN | Solicitud pendiente |
| Índices | | userId, completado, solicitudBaja |

#### `cursos` · `instituciones` · `cursos_instituciones` · `solicitudes_curso` · `auditoria` · `password_reset_tokens`
Tablas con índices individuales y compuestos optimizados para queries frecuentes.

### 3.4 Seguridad e Infraestructura

| Componente | Implementación |
|-----------|---------------|
| Rate limiting | Login: 20/15min, API: 500/15min, Import: 5/5min |
| Circuit breaker | 5 fallos → pausa 30s → auto-recovery |
| Health check | `/api/health` — DB, memoria, uptime, circuit state |
| Connection pool | 20 conexiones MySQL + keep-alive |
| Contraseñas | bcrypt 12 rounds |
| Sesiones | JWT httpOnly + sameSite lax |
| Índices | 30+ índices incluyendo compuestos |

---

## 4. UI/UX

### 4.1 Identidad Gráfica

- Paleta institucional Gobierno de México 2024-2030
- Primary: guinda (#611232), Accent: dorado (#a57f2c), Navy: verde oscuro (#002f2a)
- Tipografía: Noto Sans (institucional)
- Imagotipo oficial en login y sidebar
- Joven Mexicana en login

### 4.2 Componentes reutilizables

- **ConfirmModal** — 3 variantes (danger/warning/success), animado
- **Skeleton** — Card, Table, Stats, Page para loading states
- **ComboInput** — Dropdown + texto libre para catálogos auto-crecientes
- **ImportarCSVModal** — Drag & drop, preview, resumen importados/omitidos/errores

### 4.3 Sidebar colapsable

- Toggle ‹/› arriba junto al logo
- Modo expandido: icono + texto
- Modo colapsado: solo iconos con tooltip
- Navegación dinámica según rol

---

## 5. Deploy y Producción

### 5.1 Railway

- **URL:** https://sigecap-production.up.railway.app/
- **Build:** `pnpm build` (Vite) + `pnpm db:push` (Drizzle)
- **Start:** `NODE_ENV=production tsx server/index.ts`
- **DB:** MySQL en Railway (red privada)
- **Health check:** `/api/health`

### 5.2 Variables de entorno

```env
DATABASE_URL=mysql://...     # MySQL connection string
JWT_SECRET=...               # Secreto para JWT
NODE_ENV=production          # Modo producción
PORT=3000                    # Puerto (Railway lo asigna)
```

### 5.3 Comandos

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Desarrollo (Express + Vite HMR) |
| `pnpm build` | Build producción |
| `pnpm start` | Servidor producción |
| `pnpm db:push` | Aplicar schema a DB |
| `pnpm test` | Tests (Vitest) |

---

## 6. Pendiente

| Feature | Prioridad | Notas |
|---------|-----------|-------|
| Bloques de cursos | Alta | Definir en próxima reunión |
| Dashboard mejorado | Media | Estadísticas por UPA, CMAO, nivel progresión |
| Reportes por UPA/nivel | Media | Gráficas nuevos campos |
| Carga archivos S3 | Baja | Requiere cuenta AWS |
| Email recuperación | Baja | Requiere SMTP |
| Tema oscuro | Baja | Placeholder existe |

---

*Documento actualizado el 2026-06-25.*
