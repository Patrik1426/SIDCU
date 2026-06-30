# Puntos para Reunión — Secretaría de Cultura

**Fecha de elaboración:** 20 de junio de 2026  
**Sistema:** Portal de Registro y Capacitación de Servidores Públicos

---

## 1. Estado Actual del Sistema

### Módulos completados
- Login con CURP + contraseña (sin email)
- Dashboard admin con estadísticas
- CRUD de Servidores Públicos (alta, edición, baja, búsqueda, filtros, selección múltiple)
- Campos: UPA (Sector), CMAO (CMAO1-CMAO18), UA (Dirección), Nivel Progresión (0-N5)
- Registro vinculado: user se registra con CURP → se vincula a servidor existente
- Validación de CURP/RFC: bloquea duplicados y servidores dados de baja
- Onboarding obligatorio: user no puede navegar sin completar perfil
- Onboarding idempotente: reintentos no duplican datos
- Constancia de registro PDF descargable desde portal del user
- Badge Registrado/Pendiente en tabla de servidores
- Auditoría de cambios (registro automático de toda mutación)
- Reportes con gráficas (Recharts)
- Exportación Excel/PDF con todos los campos y colores institucionales
- Importación masiva CSV con defaults, detección encoding, validación duplicados contra DB
- Gestión de Cursos con vista cuadrícula/lista, selección múltiple, eliminación masiva
- Máximo 2 cursos activos por usuario, validación empalme de fechas
- Gestión de Instituciones con importación CSV
- Gestión de Usuarios (crear, cambiar rol, activar/desactivar, eliminar)
- Contraseñas visibles para admin
- Al eliminar usuario: servidor queda inactivo (CURP bloqueada para re-registro)
- Al desactivar usuario: servidor sincronizado a inactivo
- Al reactivar usuario: servidor recreado automáticamente
- Portal de Capacitación (onboarding, catálogo, solicitudes, progresión 0-N5)
- Sistema de baja de servidores (solicitud por usuario + aprobación admin)
- Sidebar colapsable con identidad gráfica institucional (Gobierno de México)
- ConfirmModal reutilizable (reemplaza confirm() nativo en todo el sistema)
- Skeleton loading components
- ComboInput para catálogos auto-crecientes (UPA, UA)
- Deploy en Railway (producción)
- Nivel de gobierno: solo federal

### Seguridad e infraestructura
- Rate limiting: login (20/15min), API (500/15min), importación (5/5min)
- Circuit breaker: protección automática si DB se satura (5 fallos → pausa 30s)
- Health check endpoint (`/api/health`): estado DB, memoria, uptime, circuit breaker
- Connection pooling: 20 conexiones MySQL con keep-alive
- Índices compuestos optimizados para queries frecuentes
- Contraseñas hasheadas con bcrypt (12 rounds)
- JWT httpOnly cookies
- Bloqueo de login si cuenta desactivada

### Módulos pendientes de desarrollo
- **Bloques de cursos** — definir en siguiente reunión
- **Carga de archivos a S3** — placeholder existe, falta integración
- **Email de recuperación de contraseña** — token existe, falta envío
- **Tema oscuro** — placeholder existe, no implementado

---

## 2. Decisiones Pendientes (requieren respuesta)

### Carga de archivos (S3)
- [ ] ¿Qué tipos de archivos se van a subir? (constancias, identificaciones, comprobantes, etc.)
- [ ] ¿Hay un bucket de S3 ya creado? ¿Credenciales AWS disponibles?
- [ ] ¿Tamaño máximo por archivo?
- [ ] ¿Los archivos se asocian al servidor público, al curso, o a ambos?

### Recuperación de contraseña
- [ ] ¿Qué servicio de email se usará? (SendGrid, SES, SMTP institucional, etc.)
- [ ] ¿Hay un dominio de correo institucional para enviar desde ahí?
- [ ] ¿La URL de reset apunta al mismo dominio del sistema o a otro?

### Despliegue / Infraestructura
- [ ] ¿Dónde se va a hospedar? (servidor propio, VPS, AWS, etc.)
- [ ] ¿Se necesita Docker para empaquetar?
- [ ] ¿Dominio y SSL ya disponibles?
- [ ] ¿La base de datos MySQL se queda local o se migra a RDS/servicio externo?

### Catálogo de Cursos
- [ ] ¿Quién carga los cursos iniciales? ¿Hay un catálogo base para importar?
- [ ] ¿Las instituciones capacitadoras ya están definidas? ¿Cuáles son?
- [ ] ¿Cuántos niveles de progresión son? (actualmente 4) ¿Qué cursos corresponden a cada nivel?
- [ ] ¿El cupo por curso-institución se maneja manualmente o hay un sistema externo?

### Roles y Permisos
- [ ] ¿El rol "capturista" puede también aprobar solicitudes de cursos, o solo el admin?
- [ ] ¿Se necesitan más roles aparte de admin, capturista, consultor, user?
- [ ] ¿Los consultores pueden exportar datos de todos los servidores o solo los de su dependencia?

### Proceso de Baja
- [ ] Cuando un servidor fallece, ¿quién registra la baja? ¿El admin directamente o se necesita un flujo especial?
- [ ] ¿Qué pasa con los datos del servidor después de la baja? ¿Se conservan indefinidamente o hay política de retención?
- [ ] ¿Se necesita un motivo específico predefinido (fallecimiento, renuncia, jubilación, etc.) o texto libre?

---

## 3. Datos Iniciales Necesarios

- [ ] Lista de dependencias del municipio (para dropdown en formularios)
- [ ] Catálogo de cargos comunes
- [ ] Lista de instituciones capacitadoras
- [ ] Cursos base con sus requisitos de nivel
- [ ] Usuarios admin iniciales (nombre, email)

---

## 4. Temas Operativos

- [ ] ¿Quién será el administrador principal del sistema?
- [ ] ¿Se necesita capacitación para los capturistas?
- [ ] ¿Hay fecha límite para el lanzamiento?
- [ ] ¿Se requiere manual de usuario?

---

## 5. Mejoras Opcionales (para priorizar)

| Mejora | Esfuerzo | Impacto |
|--------|----------|---------|
| Tema oscuro | Bajo | Bajo |
| Notificaciones por email al aprobar/rechazar solicitud | Medio | Alto |
| Dashboard de métricas para directivos | Medio | Alto |
| Exportar historial de capacitación por servidor | Bajo | Medio |
| Firma digital en constancias | Alto | Alto |
| App móvil / PWA | Alto | Medio |
