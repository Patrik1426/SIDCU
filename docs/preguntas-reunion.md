# Preguntas para Reunión — Sistema de Capacitación de Servidores Públicos

**Casa de la Cultura del Municipio**  
**Fecha:** 21 de junio de 2026

---

## I. Preguntas Prioritarias — Alimentación de Datos

### 1. Catálogo de cursos de capacitación

- **¿Existe un catálogo oficial de cursos de capacitación para servidores públicos del municipio?** Si es así, ¿quién nos lo puede proporcionar y en qué formato está?
- **¿Cuáles son las categorías de cursos que se manejan?** Actualmente el sistema contempla: obligatorio, optativo y especializado. ¿Son correctas o se necesitan otras?
- **¿Cuántos niveles de progresión debe tener un servidor?** Actualmente son 4 niveles. ¿Qué cursos corresponden a cada nivel? ¿Cuántos cursos debe completar un servidor para subir de nivel?
- **¿Hay cursos que apliquen solo para cierto nivel de gobierno (federal, estatal, municipal)?** ¿O todos los cursos están disponibles para todos?

### 2. Instituciones capacitadoras

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

## II. Preguntas Operativas — Reglas de Negocio

### 5. Roles y permisos

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

### 6. Proceso de baja de servidores

El sistema permite dos formas de baja:
1. **Baja directa por admin:** El administrador desactiva al servidor desde la gestión
2. **Solicitud de baja por usuario:** El servidor solicita su propia baja con motivo, y el admin aprueba

- **Cuando un servidor fallece, ¿quién y cómo registra la baja?** ¿El admin directamente, o se requiere un documento soporte?
- **¿Se necesitan motivos predefinidos para la baja?** Ejemplo: renuncia, jubilación, fallecimiento, cambio de adscripción, término de contrato. ¿O se deja como texto libre?
- **¿Los datos de un servidor dado de baja se conservan indefinidamente o hay una política de retención/eliminación?**

### 7. Proceso de capacitación

- **¿Cómo se valida que un servidor completó un curso?** ¿El admin marca como completado manualmente, o se requiere evidencia (constancia, calificación)?
- **¿Hay un tiempo máximo para completar un curso una vez aprobada la solicitud?**
- **¿Un servidor puede solicitar el mismo curso más de una vez?** (ejemplo: si fue rechazado, ¿puede volver a solicitarlo?)
- **¿Hay un máximo de cursos simultáneos que un servidor puede tener aprobados?**

---

*Documento para reunión de trabajo. Las respuestas permitirán alimentar el sistema y definir reglas operativas.*
