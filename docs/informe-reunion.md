# Informe para Reunión — Sistema de Registro y Capacitación de Servidores Públicos

**Secretaría de Cultura del Municipio**  
**Fecha de elaboración:** 21 de junio de 2026  
**Elaborado por:** Área de Desarrollo de Sistemas

---

## Objetivo del documento

Presentar el estado actual del sistema y plantear las preguntas que requieren respuesta por parte de la dirección y las áreas involucradas para poder continuar con la alimentación de datos, la configuración operativa y la puesta en producción del sistema.

---

## I. Estado del Sistema

El sistema se encuentra funcional en ambiente de desarrollo y producción (Railway) con los siguientes módulos operativos:

| Módulo | Estado | Descripción |
|--------|--------|-------------|
| Autenticación | ✅ Completo | Login con CURP + contraseña, registro vinculado a servidor existente |
| Servidores Públicos | ✅ Completo | CRUD, selección múltiple, UPA/CMAO/UA, Nivel 0-N5, badge Registrado/Pendiente |
| Importación masiva | ✅ Completo | CSV con defaults, encoding auto, validación duplicados contra DB, procesamiento en lotes |
| Gestión de Cursos | ✅ Completo | Vista cuadrícula/lista, selección múltiple, máximo 2 cursos activos, validación empalme fechas |
| Gestión de Instituciones | ✅ Completo | CRUD, importación CSV, asignación a cursos con horarios |
| Gestión de Usuarios | ✅ Completo | CRUD, roles, activar/desactivar/eliminar, contraseñas visibles para admin |
| Auditoría | ✅ Completo | Registro automático de toda operación sobre servidores |
| Reportes | ✅ Completo | Gráficas por dependencia, grupo de función, estatus |
| Exportación | ✅ Completo | Excel y PDF con todos los campos, colores institucionales guinda |
| Portal de Capacitación | ✅ Completo | Onboarding obligatorio, catálogo, solicitudes, constancia PDF, progresión 0-N5 |
| Sistema de Baja | ✅ Completo | Solicitud por usuario + aprobación admin, CURP bloqueada post-baja |
| Seguridad | ✅ Completo | Rate limiting, circuit breaker, health check, bcrypt, JWT httpOnly |
| Identidad Gráfica | ✅ Completo | Paleta Gob. México, Noto Sans, sidebar colapsable, imagotipo oficial |
| Deploy Producción | ✅ Completo | Railway con health check, connection pooling, índices optimizados |
| Bloques de cursos | ⏳ Pendiente | Definir en siguiente reunión |
| Carga de archivos | ⏳ Pendiente | Requiere definiciones (ver sección III) |
| Recuperación de contraseña | ⏳ Pendiente | Requiere servicio de correo (ver sección III) |

---

## II. Preguntas Prioritarias — Alimentación de Datos

Estas preguntas son las más urgentes porque bloquean la carga inicial de información al sistema.

### 1. Catálogo de cursos de capacitación

El sistema permite importar cursos de forma masiva mediante archivo CSV. Para alimentar el catálogo necesitamos definir:

- **¿Existe un catálogo oficial de cursos de capacitación para servidores públicos del municipio?** Si es así, ¿quién nos lo puede proporcionar y en qué formato está?
- **¿Cuáles son las categorías de cursos que se manejan?** Actualmente el sistema contempla: obligatorio, optativo y especializado. ¿Son correctas o se necesitan otras?
- **¿Cuántos niveles de progresión debe tener un servidor?** Actualmente son 4 niveles. ¿Qué cursos corresponden a cada nivel? ¿Cuántos cursos debe completar un servidor para subir de nivel?
- **¿Hay cursos que apliquen solo para cierto nivel de gobierno (federal, estatal, municipal)?** ¿O todos los cursos están disponibles para todos?

### 2. Instituciones capacitadoras

El sistema requiere registrar las instituciones donde se imparten los cursos para poder asignar sedes, horarios y cupos.

- **¿Cuáles son las instituciones que actualmente imparten capacitación a los servidores públicos del municipio?** Necesitamos: nombre, dirección, persona de contacto, teléfono y correo electrónico.
- **¿Se trabaja con universidades, centros de capacitación municipales, plataformas en línea, o una combinación?**
- **¿Las instituciones cambian frecuentemente o es un catálogo relativamente estable?**

### 3. Servidores públicos existentes

- **¿Existe un padrón actual de servidores públicos del municipio?** ¿En qué formato está (Excel, sistema anterior, nómina)?
- **¿Qué datos del padrón ya están validados (RFC, CURP)?** El sistema valida ambos con formato oficial.
- **¿Cuántos servidores públicos aproximadamente se van a registrar?** Esto nos ayuda a dimensionar la base de datos y los tiempos de carga.
- **¿Las dependencias del municipio están estandarizadas en algún catálogo?** Nos serviría para un dropdown en el formulario en lugar de texto libre.

### 4. Datos de contacto y responsables

- **¿Quién será el administrador principal del sistema?** Nombre y correo electrónico para crear la cuenta inicial.
- **¿Cuántos capturistas se necesitan y de qué áreas?** Para crear sus cuentas con el rol correspondiente.
- **¿Hay personal de consulta (solo lectura) que necesite acceso?** Para asignarles el rol de consultor.

---

## III. Preguntas Técnicas — Infraestructura y Servicios

Estas preguntas son necesarias para la puesta en producción.

### 5. Despliegue del sistema

- **¿Dónde se va a hospedar el sistema?** Opciones: servidor propio del municipio, servicio en la nube (AWS, DigitalOcean), o servidor compartido. Cada opción tiene diferentes costos y requisitos.
- **¿Se cuenta con un dominio para el sistema?** Ejemplo: `capacitacion.municipio.gob.mx`
- **¿Se cuenta con certificado SSL (HTTPS)?** Es necesario para la seguridad de los datos personales (RFC, CURP).
- **La base de datos MySQL, ¿se queda en el mismo servidor o se necesita un servicio separado?**

### 6. Correo electrónico

- **¿El municipio cuenta con un servidor de correo institucional (SMTP)?** Se necesita para:
  - Recuperación de contraseñas
  - Notificaciones de aprobación/rechazo de solicitudes (mejora futura)
- **Si no hay SMTP, ¿se autoriza usar un servicio externo?** (ejemplo: SendGrid, Amazon SES)
- **¿Desde qué dirección de correo se enviarían las notificaciones?** Ejemplo: `noreply@capacitacion.municipio.gob.mx`

### 7. Carga de archivos

- **¿Se necesita que los servidores públicos puedan subir documentos al sistema?** (constancias, identificaciones, comprobantes de capacitación)
- **Si sí, ¿qué tipos de archivos?** PDF, imágenes (JPG/PNG), Word, otros.
- **¿Los documentos se asocian al servidor, al curso completado, o a ambos?**
- **¿Se cuenta con almacenamiento en la nube (Amazon S3, Google Cloud Storage)?** ¿O se usaría almacenamiento local en el servidor?

---

## IV. Preguntas Operativas — Reglas de Negocio

### 8. Roles y permisos

El sistema actualmente maneja 4 roles:

| Rol | Permisos |
|-----|----------|
| **Administrador** | Control total: usuarios, servidores, cursos, instituciones, solicitudes, reportes, auditoría |
| **Capturista** | Crear servidores, importar CSV, subir archivos |
| **Consultor** | Solo lectura: ver servidores, reportes, exportar datos |
| **Usuario** | Portal personal: ver cursos, solicitar inscripción, ver su progreso |

- **¿Estos roles son suficientes o se necesitan otros?** Ejemplo: supervisor de área, director, coordinador de capacitación.
- **¿El capturista debería poder aprobar solicitudes de inscripción a cursos, o eso es exclusivo del administrador?**
- **¿Los consultores pueden ver datos de todas las dependencias o solo de la suya?**

### 9. Proceso de baja de servidores

El sistema permite dos formas de baja:
1. **Baja directa por admin:** El administrador desactiva al servidor desde la gestión
2. **Solicitud de baja por usuario:** El servidor solicita su propia baja con motivo, y el admin aprueba

- **Cuando un servidor fallece, ¿quién y cómo registra la baja?** ¿El admin directamente, o se requiere un documento soporte?
- **¿Se necesitan motivos predefinidos para la baja?** Ejemplo: renuncia, jubilación, fallecimiento, cambio de adscripción, término de contrato. ¿O se deja como texto libre?
- **¿Los datos de un servidor dado de baja se conservan indefinidamente o hay una política de retención/eliminación?**

### 10. Proceso de capacitación

- **¿Cómo se valida que un servidor completó un curso?** ¿El admin marca como completado manualmente, o se requiere evidencia (constancia, calificación)?
- **¿Hay un tiempo máximo para completar un curso una vez aprobada la solicitud?**
- **¿Un servidor puede solicitar el mismo curso más de una vez?** (ejemplo: si fue rechazado, ¿puede volver a solicitarlo?)
- **¿Hay un máximo de cursos simultáneos que un servidor puede tener aprobados?**

---

## V. Próximos Pasos (según respuestas)

| Prioridad | Acción | Depende de |
|-----------|--------|------------|
| 🔴 Alta | Cargar catálogo inicial de cursos | Respuesta a pregunta 1 |
| 🔴 Alta | Registrar instituciones capacitadoras | Respuesta a pregunta 2 |
| 🔴 Alta | Importar padrón de servidores existentes | Respuesta a pregunta 3 |
| 🔴 Alta | Crear cuentas de usuarios admin/capturista | Respuesta a pregunta 4 |
| 🟡 Media | Configurar dominio y SSL | Respuesta a pregunta 5 |
| 🟡 Media | Configurar servicio de correo | Respuesta a pregunta 6 |
| 🟢 Baja | Implementar carga de archivos | Respuesta a pregunta 7 |
| 🟢 Baja | Ajustar roles si se requieren cambios | Respuesta a pregunta 8 |

---

## VI. Formatos para Importación

El sistema acepta archivos CSV para carga masiva. Se adjunta la guía detallada de importación como documento separado (`guia-importacion-csv.md`) con:

- Formato exacto de cada columna
- Valores válidos para campos de catálogo
- Validaciones de RFC y CURP
- Ejemplos de archivos listos para importar
- Errores comunes y soluciones

**Nota:** Cada pantalla de importación en el sistema incluye un botón para descargar la plantilla CSV con las columnas correctas y un registro de ejemplo.

---

*Documento elaborado para facilitar la toma de decisiones en reunión. Las respuestas a estas preguntas permitirán avanzar con la alimentación del sistema y definir la fecha de puesta en producción.*
