# Puntos para Reunión — Secretaría de Cultura

**Fecha de elaboración:** 20 de junio de 2026  
**Sistema:** Portal de Registro y Capacitación de Servidores Públicos

---

## 1. Estado Actual del Sistema

### Módulos completados
- Login con "Recordarme" (cookie sesión vs 30 días)
- Dashboard admin con estadísticas
- CRUD de Servidores Públicos (alta, edición, baja, búsqueda, filtros)
- Auditoría de cambios (registro automático de toda mutación)
- Reportes con gráficas (Recharts)
- Exportación Excel/PDF (client-side)
- Importación masiva CSV con validación
- Gestión de Usuarios (crear, cambiar rol, activar/desactivar)
- Portal de Capacitación (onboarding, catálogo, solicitudes, progresión de niveles)
- Sistema de baja de servidores (solicitud por usuario + aprobación admin)

### Módulos pendientes de desarrollo
- **Carga de archivos a S3** — la página placeholder existe, falta integración con AWS
- **Email de recuperación de contraseña** — la generación de token existe, falta el envío de correo
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
