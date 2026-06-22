# Guía de Importación CSV — Casa de la Cultura

**Sistema:** Portal de Registro y Capacitación de Servidores Públicos  
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
- No usar comas dentro de los valores (si es necesario, encerrar el valor entre comillas dobles)

### Cómo guardar como CSV desde Excel
1. Abrir el archivo en Excel
2. Ir a **Archivo → Guardar como**
3. En "Tipo", seleccionar **CSV UTF-8 (delimitado por comas)**
4. Guardar

### Cómo guardar como CSV desde Google Sheets
1. Ir a **Archivo → Descargar → Valores separados por comas (.csv)**

### Plantilla descargable
Cada sección de importación en el sistema tiene un botón **"Descargar plantilla CSV"** que genera un archivo con las columnas correctas y un ejemplo. **Se recomienda siempre usar la plantilla como base.**

---

## 2. Importar Servidores Públicos

**Ubicación en el sistema:** Menú lateral → Importación

### Columnas

| Columna | Obligatoria | Descripción | Formato / Valores válidos | Ejemplo |
|---------|:-----------:|-------------|--------------------------|---------|
| `nombreCompleto` | ✅ | Nombre completo del servidor | Mínimo 2 caracteres | Juan Pérez López |
| `rfc` | ✅ | Registro Federal de Contribuyentes | 12-13 caracteres, letras mayúsculas y números. Formato: `XXXX000000XXX` | PELJ850101AB3 |
| `curp` | ✅ | Clave Única de Registro de Población | 18 caracteres exactos. Formato: `XXXX000000HXXXXX0X` | PELJ850101HCHRZN09 |
| `cargo` | ✅ | Puesto o cargo que desempeña | Mínimo 2 caracteres | Jefe de Departamento |
| `dependencia` | ✅ | Dependencia o institución donde labora | Mínimo 2 caracteres | Secretaría de Educación |
| `nivel` | ✅ | Nivel de gobierno | `federal`, `estatal`, `municipal`, `otro` | municipal |
| `grupoFuncion` | ✅ | Grupo de función | `ADMO`, `TECN`, `SERV`, `COMUN`, `PROFE`, `EDU` | ADMO |
| `fechaIngreso` | ✅ | Fecha de ingreso al servicio | Formato: `AAAA-MM-DD` | 2020-03-15 |
| `estatus` | ❌ | Estado del servidor | `activo`, `inactivo` (default: `activo`) | activo |
| `datosContacto` | ❌ | Teléfono, email u otros datos | Texto libre | 614-123-4567 |
| `observaciones` | ❌ | Notas adicionales | Texto libre | Transferido de Hacienda |

### Ejemplo de archivo

```csv
nombreCompleto,rfc,curp,cargo,dependencia,nivel,grupoFuncion,fechaIngreso,estatus,datosContacto,observaciones
Juan Pérez López,PELJ850101AB3,PELJ850101HCHRZN09,Jefe de Departamento,Secretaría de Educación,municipal,ADMO,2020-03-15,activo,614-123-4567,
María García Ruiz,GARM900215CD5,GARM900215MCHRZR01,Analista,Dirección de Finanzas,estatal,TECN,2019-06-01,activo,maria@correo.com,Personal de confianza
```

### Valores válidos para columnas de catálogo

**nivel:**
| Valor | Significado |
|-------|-------------|
| `federal` | Gobierno Federal |
| `estatal` | Gobierno Estatal |
| `municipal` | Gobierno Municipal |
| `otro` | Otro nivel |

**grupoFuncion:**
| Valor | Significado |
|-------|-------------|
| `ADMO` | Administrativo |
| `TECN` | Técnico |
| `SERV` | Servicio |
| `COMUN` | Comunicación |
| `PROFE` | Profesional |
| `EDU` | Educación |

### Validaciones del RFC
- Entre 12 y 13 caracteres
- Primeros 3-4 caracteres: letras mayúsculas (incluye Ñ y &)
- Siguientes 6: números (fecha de nacimiento AAMMDD)
- Últimos 3: letras mayúsculas o números (homoclave)
- Ejemplo válido: `PELJ850101AB3`
- Ejemplo inválido: `pelj850101ab3` (minúsculas no son válidas)

### Validaciones del CURP
- Exactamente 18 caracteres
- Primeros 4: letras mayúsculas
- Siguientes 6: números (fecha de nacimiento AAMMDD)
- Siguiente 1: `H` (hombre) o `M` (mujer)
- Siguientes 5: letras mayúsculas (entidad y consonantes)
- Siguiente 1: letra mayúscula o número
- Último 1: número
- Ejemplo válido: `PELJ850101HCHRZN09`

---

## 3. Importar Cursos

**Ubicación en el sistema:** Menú lateral → Cursos → botón "Importar CSV"

### Columnas

| Columna | Obligatoria | Descripción | Formato / Valores válidos | Ejemplo |
|---------|:-----------:|-------------|--------------------------|---------|
| `nombre` | ✅ | Nombre del curso | Mínimo 2 caracteres | Ética en el servicio público |
| `descripcion` | ❌ | Descripción del curso | Texto libre | Formación en valores y conducta ética |
| `categoria` | ✅ | Tipo de curso | `obligatorio`, `optativo`, `especializado` | obligatorio |
| `modalidad` | ✅ | Forma de impartición | `presencial`, `virtual`, `mixto` | presencial |
| `duracionHoras` | ✅ | Duración en horas | Número entero mayor a 0 | 20 |
| `nivelRequerido` | ❌ | Nivel mínimo del servidor para acceder | `1`, `2`, `3`, `4` (default: `1`) | 1 |
| `nivelGobierno` | ❌ | Dirigido a servidores de este nivel | `federal`, `estatal`, `municipal`, `otro` | municipal |

### Ejemplo de archivo

```csv
nombre,descripcion,categoria,modalidad,duracionHoras,nivelRequerido,nivelGobierno
Ética en el servicio público,Formación en valores y conducta ética para servidores públicos,obligatorio,presencial,20,1,municipal
Transparencia y acceso a la información,Marco legal de transparencia gubernamental,obligatorio,virtual,15,1,
Liderazgo y gestión pública,Habilidades directivas para mandos medios,optativo,mixto,30,2,estatal
Presupuesto basado en resultados,Metodología PbR para planeación,especializado,presencial,40,3,federal
Protección de datos personales,Ley General de Protección de Datos,obligatorio,virtual,10,1,
```

### Valores válidos

**categoria:**
| Valor | Significado |
|-------|-------------|
| `obligatorio` | Curso obligatorio para todos los servidores |
| `optativo` | Curso opcional, el servidor elige |
| `especializado` | Curso especializado para áreas específicas |

**modalidad:**
| Valor | Significado |
|-------|-------------|
| `presencial` | Se imparte en persona |
| `virtual` | Se imparte en línea |
| `mixto` | Combinación presencial y virtual |

**nivelRequerido:**
| Valor | Significado |
|-------|-------------|
| `1` | Nivel básico (todos los servidores) |
| `2` | Nivel intermedio (requiere cursos previos) |
| `3` | Nivel avanzado |
| `4` | Nivel experto |

---

## 4. Importar Instituciones

**Ubicación en el sistema:** Menú lateral → Instituciones → botón "Importar CSV"

### Columnas

| Columna | Obligatoria | Descripción | Formato / Valores válidos | Ejemplo |
|---------|:-----------:|-------------|--------------------------|---------|
| `nombre` | ✅ | Nombre de la institución | Mínimo 2 caracteres | Universidad Autónoma de Chihuahua |
| `direccion` | ❌ | Dirección física | Texto libre | Av. Universidad #1, Col. Centro |
| `contacto` | ❌ | Nombre de la persona de contacto | Texto libre | Lic. Ana Martínez |
| `telefono` | ❌ | Teléfono de contacto | Texto libre | 614-555-1234 |
| `email` | ❌ | Correo electrónico | Formato de email válido | capacitacion@uach.mx |

### Ejemplo de archivo

```csv
nombre,direccion,contacto,telefono,email
Universidad Autónoma de Chihuahua,Av. Universidad #1 Col. Centro,Lic. Ana Martínez,614-555-1234,capacitacion@uach.mx
Instituto Tecnológico de Chihuahua,Av. Tecnológico #2909,Ing. Roberto Sánchez,614-555-5678,vinculacion@itchi.edu.mx
Centro de Capacitación Municipal,Calle Aldama #500 Col. Centro,María López,614-555-9012,centro.cap@municipio.gob.mx
INAP - Instituto Nacional de Administración Pública,,Dr. Carlos Ruiz,55-5081-2600,contacto@inap.org.mx
Plataforma México X (en línea),,,, contacto@mexicox.gob.mx
```

---

## 5. Errores comunes y soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| "RFC inválido" | RFC en minúsculas o formato incorrecto | Verificar que esté en MAYÚSCULAS y tenga 12-13 caracteres |
| "CURP inválido" | CURP en minúsculas, longitud incorrecta o letra de sexo faltante | Verificar MAYÚSCULAS, 18 caracteres exactos, H o M en posición 11 |
| "RFC o CURP duplicado" | Ya existe un servidor con ese RFC o CURP en el sistema | Verificar si el servidor ya fue registrado antes |
| "Nombre requerido" | Columna `nombre` o `nombreCompleto` vacía | Llenar el campo obligatorio |
| "Invalid option" en modalidad | Valor incorrecto (ej: "en línea" en vez de "virtual") | Usar exactamente: `presencial`, `virtual` o `mixto` |
| "Invalid option" en nivel | Valor incorrecto (ej: "Federal" con mayúscula) | Usar exactamente en minúsculas: `federal`, `estatal`, `municipal`, `otro` |
| "Invalid option" en grupoFuncion | Valor incorrecto | Usar exactamente en mayúsculas: `ADMO`, `TECN`, `SERV`, `COMUN`, `PROFE`, `EDU` |
| El archivo no se reconoce | Archivo guardado en formato incorrecto | Guardar como CSV UTF-8, no como .xlsx o .xls |
| Los acentos se ven mal | Codificación incorrecta | Guardar como **CSV UTF-8** (no ANSI ni Latin-1) |
| "Fila X: error" | Error en una fila específica | Los registros válidos sí se importan. Corregir las filas con error y reimportar solo esas |

---

## 6. Preguntas frecuentes

**¿Puedo importar desde Excel directamente?**  
No. El sistema acepta únicamente archivos CSV. Desde Excel, usar "Guardar como → CSV UTF-8".

**¿Qué pasa si una fila tiene error?**  
Las filas válidas se importan correctamente. Las filas con error se reportan con el número de fila y la descripción del error. Puedes corregirlas y reimportar solo las que fallaron.

**¿Puedo importar el mismo archivo dos veces?**  
Para servidores: si el RFC o CURP ya existen, esas filas marcarán error "duplicado" y no se crearán de nuevo. Para cursos e instituciones: se crearán registros nuevos (pueden quedar duplicados si el nombre es igual).

**¿Cuántos registros puedo importar a la vez?**  
No hay límite fijo, pero se recomienda no superar 500 registros por archivo para evitar tiempos de espera largos.

**¿Dónde descargo la plantilla?**  
En cada sección de importación hay un botón "Descargar plantilla CSV" que genera un archivo con las columnas correctas y un ejemplo de llenado.

**¿El orden de las columnas importa?**  
No, mientras los nombres de las columnas en la primera fila coincidan exactamente con los indicados en esta guía.

**¿Puedo dejar columnas opcionales vacías?**  
Sí. Las columnas marcadas como "❌ No obligatoria" pueden quedar vacías.

**¿Quién puede importar datos?**  
- **Servidores:** Roles admin y capturista
- **Cursos e Instituciones:** Solo rol admin
