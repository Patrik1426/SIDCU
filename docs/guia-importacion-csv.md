# Guía de Importación CSV — Secretaría de Cultura

**Sistema:** SIGECAP — Sistema de Gestión y Capacitación de Servidores Públicos  
**Dirigido a:** Capturistas y Administradores  
**Última actualización:** Junio 2026

---

## Índice

1. [Requisitos generales](#1-requisitos-generales)
2. [Importar Servidores Públicos](#2-importar-servidores-públicos)
3. [Importar Cursos](#3-importar-cursos)
4. [Importar Instituciones](#4-importar-instituciones)
5. [Errores comunes y soluciones](#5-errores-comunes-y-soluciones)
6. [Preguntas frecuentes](#6-preguntas-frecuentes)

---

## 1. Requisitos generales

### Formato del archivo
- El archivo debe ser **CSV** (valores separados por comas)
- Codificación: **UTF-8** (para que los acentos y la ñ se muestren correctamente)
- La **primera fila** debe contener los nombres de las columnas exactamente como se indican en esta guía
- No dejar filas vacías entre los datos
- Si un valor contiene comas, encerrarlo entre comillas dobles (ej: `"COMPUTO CON WORD, EXCEL, POWERPOINT"`)
- Excel y Google Sheets hacen esto automáticamente al exportar

### Cómo guardar como CSV desde Excel
1. Abrir el archivo en Excel
2. Ir a **Archivo → Guardar como**
3. En "Tipo", seleccionar **CSV UTF-8 (delimitado por comas)**
4. Guardar

### Cómo guardar como CSV desde Google Sheets
1. Ir a **Archivo → Descargar → Valores separados por comas (.csv)**

### Plantilla descargable
Cada sección de importación en el sistema tiene un botón **"Descargar plantilla CSV"** que genera un archivo con las columnas correctas y un ejemplo. **Se recomienda siempre usar la plantilla como base.**

### Detección automática de encoding
El sistema detecta automáticamente si el archivo está en UTF-8 o Latin-1 y corrige caracteres especiales. Si aun así los acentos salen mal, guarde el archivo como UTF-8.

---

## 2. Importar Servidores Públicos

**Ubicación en el sistema:** Menú lateral → Importación

### Columnas

| Columna | Obligatoria | Descripción | Default si vacío | Ejemplo |
|---------|:-----------:|-------------|-----------------|---------|
| `nombreCompleto` | ✅ | Nombre completo del servidor | "Por definir" | Juan Pérez López |
| `rfc` | ❌ | Registro Federal de Contribuyentes | Genera temporal único (PEND...) | PELJ850101AB3 |
| `curp` | ✅ | Clave Única de Registro de Población | — | PELJ850101HCHRZN09 |
| `cargo` | ❌ | Puesto o cargo que desempeña | "Por definir" | Jefe de Departamento |
| `dependencia` | ❌ | Dependencia donde labora | "Por definir" | Secretaría de Educación |
| `nivel` | ❌ | Nivel de gobierno | "federal" | federal |
| `grupoFuncion` | ❌ | Grupo de función | "ADMO" | ADMO |
| `upa` | ❌ | UPA (Sector) | "SIN ASIGNAR" | CULTURA |
| `cmao` | ❌ | CMAO | "SIN ASIGNAR" | CMAO1 |
| `ua` | ❌ | UA (Dirección de adscripción) | "Sin asignar" | Dirección de Vinculación |
| `nivelProgresion` | ❌ | Nivel de progresión (0, N1-N5) | 0 (Nuevo ingreso) | N2 |
| `fechaIngreso` | ❌ | Fecha de ingreso al servicio | Fecha de hoy | 2020-03-15 |
| `datosContacto` | ❌ | Teléfono, email u otros datos | "Sin datos" | 614-123-4567 |
| `estatus` | ❌ | Estado del servidor | "activo" | activo |
| `observaciones` | ❌ | Notas adicionales | "Sin observaciones" | Transferido de Hacienda |

### Ejemplo de archivo (datos mínimos)

```csv
nombreCompleto,curp,upa,ua
Juan Pérez López,PELJ850101HCHRZN09,CULTURA,Dirección de Vinculación
María García Ruiz,GARM900215MCHRZR01,RE,Centro Cultural Helénico
```

### Ejemplo de archivo (datos completos)

```csv
nombreCompleto,rfc,curp,cargo,dependencia,nivel,grupoFuncion,upa,cmao,ua,nivelProgresion,fechaIngreso,datosContacto,estatus,observaciones
Juan Pérez López,PELJ850101AB3,PELJ850101HCHRZN09,Director,Secretaría de Cultura,federal,ADMO,CULTURA,CMAO1,Dirección de Vinculación,N2,2020-03-15,614-123-4567,activo,
María García Ruiz,GARM900215CD5,GARM900215MCHRZR01,Analista,Dirección de Finanzas,federal,TECN,RE,CMAO3,Centro Cultural Helénico,0,2019-06-01,maria@correo.com,activo,Personal de confianza
```

### Campos con catálogo automático

Los siguientes campos construyen su catálogo desde los registros existentes. Si escribes un valor nuevo, queda disponible para futuros registros:

- **UPA (Sector):** Valores iniciales: CULTURA, RE, INDAUTOR
- **UA (Dirección):** Se alimenta de los registros existentes

### Valores válidos para campos de catálogo

**grupoFuncion:**
| Valor | Significado |
|-------|-------------|
| `ADMO` | Administrativo |
| `TECN` | Técnico |
| `SERV` | Servicio |
| `COMUN` | Comunicación |
| `PROFE` | Profesional |
| `EDU` | Educación |

**cmao:** CMAO1 a CMAO18

**nivelProgresion:**
| Valor | Significado |
|-------|-------------|
| `0` | Nuevo ingreso |
| `N1` o `1` | Nivel 1 |
| `N2` o `2` | Nivel 2 |
| `N3` o `3` | Nivel 3 |
| `N4` o `4` | Nivel 4 |
| `N5` o `5` | Nivel 5 |

### Validaciones del CURP
- Exactamente 18 caracteres
- Primeros 4: letras mayúsculas
- Siguientes 6: números (fecha de nacimiento AAMMDD)
- Siguiente 1: `H` (hombre) o `M` (mujer)
- Siguientes 5: letras mayúsculas (entidad y consonantes)
- Siguiente 1: letra mayúscula o número
- Último 1: número

### Nota sobre RFC
Si no se proporciona RFC, el sistema genera uno temporal único (PEND...) que debe ser corregido manualmente después desde la interfaz de edición.

---

## 3. Importar Cursos

**Ubicación en el sistema:** Menú lateral → Cursos → botón "Importar CSV"

### Columnas

| Columna | Obligatoria | Descripción | Default si vacío | Ejemplo |
|---------|:-----------:|-------------|-----------------|---------|
| `nombre` | ✅ | Nombre del curso | — | Ética en el servicio público |
| `descripcion` | ❌ | Descripción del curso | "Por definir" | Formación en valores |
| `categoria` | ❌ | Tipo de curso | "obligatorio" | obligatorio |
| `modalidad` | ❌ | Forma de impartición | "presencial" | presencial |
| `duracionHoras` | ❌ | Duración en horas | 1 | 20 |
| `nivelRequerido` | ❌ | Nivel mínimo para acceder | 0 | 0 |

### Ejemplo de archivo (solo nombres)

```csv
nombre
Ética en el servicio público
Transparencia y acceso a la información
Liderazgo y gestión pública
```

### Valores válidos

**categoria:** `obligatorio`, `optativo`, `especializado`

**modalidad:** `presencial`, `virtual`, `mixto`

**nivelRequerido:** `0` (Nuevo ingreso), `1`-`5` (N1-N5)

### Nota sobre nombres en mayúsculas
Si los nombres vienen en MAYÚSCULAS, el sistema los convierte automáticamente a formato título (primera letra mayúscula, resto minúscula).

---

## 4. Importar Instituciones

**Ubicación en el sistema:** Menú lateral → Instituciones → botón "Importar CSV"

### Columnas

| Columna | Obligatoria | Descripción | Default si vacío | Ejemplo |
|---------|:-----------:|-------------|-----------------|---------|
| `nombre` | ✅ | Nombre de la institución | — | Universidad Autónoma de Chihuahua |
| `direccion` | ❌ | Dirección física | vacío | Av. Universidad #1, Col. Centro |
| `contacto` | ❌ | Nombre de persona de contacto | vacío | Lic. Ana Martínez |
| `telefono` | ❌ | Teléfono de contacto | vacío | 614-555-1234 |
| `email` | ❌ | Correo electrónico | vacío | capacitacion@uach.mx |

---

## 5. Errores comunes y soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| "CURP inválido" | CURP en minúsculas o formato incorrecto | Verificar MAYÚSCULAS, 18 caracteres exactos |
| "CURP duplicado en el mismo archivo" | Dos filas tienen el mismo CURP | Eliminar la fila duplicada del CSV |
| "CURP ya existe en el sistema" | El CURP ya está registrado en la BD | Verificar si ya fue registrado |
| "RFC ya existe en el sistema" | El RFC ya está registrado en la BD | Verificar si ya fue registrado |
| "Curso ya existe en el sistema" | El nombre del curso ya existe | No se crean cursos duplicados |
| Los acentos se ven mal | Codificación incorrecta | Guardar como **CSV UTF-8** |
| El archivo no se reconoce | Formato incorrecto | Guardar como CSV, no como .xlsx |
| Nombres en MAYÚSCULAS | CSV original sin formato | El sistema convierte automáticamente a título |

---

## 6. Preguntas frecuentes

**¿Puedo importar con solo algunos campos?**
Sí. Solo el nombre y CURP son necesarios para servidores. Para cursos, solo el nombre. Todo lo demás toma valores por defecto.

**¿Qué pasa si no tengo el RFC?**
El sistema genera uno temporal único. El capturista debe corregirlo después desde la interfaz de edición.

**¿Las columnas deben ir en orden específico?**
No, mientras los nombres de las columnas coincidan con los indicados en esta guía.

**¿Puedo usar nombres de columna en español?**
El sistema acepta variantes: `nombreCompleto`, `nombre_completo`, `nombre`. Para UPA/CMAO/UA acepta mayúsculas y minúsculas.

**¿Cuántos registros puedo importar a la vez?**
No hay límite fijo, pero se recomienda no superar 500 registros por archivo.

**¿Quién puede importar datos?**
- **Servidores:** Roles admin y capturista
- **Cursos e Instituciones:** Solo rol admin
