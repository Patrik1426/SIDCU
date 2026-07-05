# Deuda Técnica — SIGECAP

Documento vivo. Cada entrada: qué es, por qué importa, cómo se detectó, cómo se soluciona. Se actualiza conforme se detecta o se resuelve deuda — no es un log histórico, es el estado actual.

---

## 🔴 Alta prioridad

### 1. `exportarTodos` trunca silenciosamente a 10,000 filas

**Qué es:** `server/routers/servidores.ts` → `exportarTodos` llama `listarServidores({ ...input, page: 1, limit: 10000 })`. Es un límite fijo, no hay aviso al usuario si se excede.

**Por qué importa:** El día que haya más de 10,000 servidores públicos registrados, el Excel/PDF exportado se corta sin ningún mensaje de error — parece que el reporte está completo cuando no lo está. A la escala actual (~100-999 usuarios) no se dispara, pero es una bomba de tiempo silenciosa.

**Cómo se detectó:** Auditoría de queries sin límite durante el plan de "login/lectura bajo carga" (2026-07-03) — se decidió explícitamente dejarlo fuera de ese plan por no ser el mismo tipo de problema (no es un cuello de botella de carga, es un bug de corrección/UX).

**Cómo se resuelve:** Opción simple: detectar si `datos.length === 10000` y mostrar advertencia en el frontend ("puede haber más registros, exporta filtrando"). Opción completa: paginar la exportación o subir el límite con un `COUNT(*)` previo que avise si excede.

**Estado:** Sin resolver. Bajo impacto actual, prioridad baja hasta acercarse al volumen.

---

## 🟡 Media prioridad

### 2. `db.ts` concentra queries de 6 dominios distintos (764+ líneas)

**Qué es:** `server/db.ts` es un archivo único con funciones de acceso a datos para usuarios, servidores públicos, auditoría, cursos, instituciones y solicitudes — todos mezclados.

**Por qué importa:** Sigue siendo manejable hoy, pero cada dominio nuevo (portal de capacitación agregó ~24 funciones de golpe) lo hace crecer sin límite natural. Eventualmente dificulta encontrar/modificar queries con confianza.

**Cómo se detectó:** Revisión de arquitectura pedida por el usuario 2026-07-03 ("revisemos que la logica del negocio no se encuentre en la base de datos").

**Cómo se resuelve:** Cuando cruce ~1200-1500 líneas, dividir por dominio siguiendo el mismo patrón que ya usa `server/routers/` (`db/servidores.ts`, `db/cursos.ts`, etc., reexportados desde `db/index.ts`).

**Estado:** Sin resolver, sin urgencia. No repetir el error de "arreglarlo ahora sin necesidad real" — esperar la señal real (tamaño de archivo, no fecha).

---

### 3. Choque de tipos `Pool` en `server/db.ts` (1 error de `tsc`)

**Qué es:** `let db: ReturnType<typeof drizzle> | null` (sin generic) no coincide con el tipo real que devuelve `drizzle(pool, { schema, mode: "default" })` — TS reporta `Type 'Pool' is missing the following properties from type 'Pool': promise, [Symbol.dispose]`, es decir dos declaraciones de tipo `Pool` distintas (probablemente dos copias de `mysql2`/`@types` en el árbol de `pnpm`).

**Por qué importa:** Solo afecta a `pnpm check` (chequeo manual de tipos) — no bloquea `pnpm build` (usa `vite build`, no corre `tsc` estricto) ni el runtime. Bajo impacto real hoy.

**Por qué no se corrigió ya:** Se intentó tipar `db` explícitamente como `MySql2Database<typeof schema>` para resolverlo — funcionó para ese error puntual, pero disparó **29 errores nuevos** `TS2742` en los routers de tRPC (`declaration: true` en `tsconfig.json` hace que el tipo del contexto deje de poder "nombrarse" de forma portable). Revertido: cambiar el tipo de `db` tiene efectos en cascada sobre el `AppRouter` compartido con el cliente, no es un fix aislado.

**Cómo se resuelve:** Requiere dedupe de la dependencia `mysql2` (o sus `@types`) en `pnpm-lock.yaml` (`pnpm dedupe` o revisar por qué hay dos resoluciones), no un cambio de código en `db.ts`.

**Estado:** Sin resolver. Bajo impacto, requiere tocar dependencias — no se hizo a ciegas.

---

## 🟢 Resuelto (referencia histórica — no requiere acción)

### ✅ Bugs de integridad transaccional (2026-07-03)

5 funciones en `server/db.ts` (`eliminarUsuarioCompleto`, `toggleActivoUsuario`, `eliminarServidor`, `eliminarCurso`, `eliminarInstitucion`) ejecutaban múltiples escrituras SQL sin `db.transaction()` — riesgo de estado parcial/huérfano si una escritura fallaba a medio camino. Corregido, con tests que mockean el cliente Drizzle para probar que todo el conjunto de escrituras vive dentro de una sola transacción. Ver `docs/superpowers/plans/2026-07-03-integridad-transacciones.md`.

### ✅ Lógica de cupo con race condition (TOCTOU) en aprobación de solicitudes (2026-07-03)

`aprobar`/`aprobarTodas` leían `cupoDisponible` y lo decrementaban en pasos separados — dos aprobaciones concurrentes podían asignar el mismo último cupo. **Resuelto eliminando la causa, no parcheándola**: los cursos son 100% virtuales, no existe límite real de cupo, así que se quitó el chequeo del flujo de aprobación por completo.

### ✅ Cuello de botella de CPU en login — bcrypt en el hilo principal (2026-07-03)

`bcryptjs` (JS puro, sin bindings nativos) a factor de costo 12, corriendo en el hilo principal de un proceso Node de un solo hilo — serializaba comparaciones de password bajo un burst de logins. Corregido: `bcrypt` nativo + pool `piscina` de worker threads, mismo proceso (sin `cluster`, sin romper el estado en memoria del rate-limiter/circuit-breaker). p95 medido: 397ms bajo la carga real que sí pasó el rate-limiter de aquel momento (20/15min por IP — ver rediseño del rate-limiter más abajo en 🟢 Resuelto; la medición completa a 300-500 usuarios con el rate-limiter ya corregido sigue pendiente de repetirse). Ver `docs/superpowers/plans/2026-07-03-login-scale-readiness.md`.

### ✅ Queries sin límite en `listarCursos`/`listarInstituciones` (2026-07-03)

Sin `LIMIT` — a la escala actual no causaba problema observable, pero se agregó `.limit(500)` como defensa antes de que se convirtiera en uno.

### ✅ `piscina` mal clasificado como devDependency (2026-07-03)

Se usa en el path de producción (`server/auth.ts`), estaba en `devDependencies`. Con `pnpm install --prod` o bundling del servidor, el login hubiera fallado en boot. Detectado en review final de rama, corregido de inmediato.

### ✅ `getDb()` sin narrowing — 82 de 84 errores de `tsc` (2026-07-04)

Causa raíz de la inmensa mayoría de los `TS18047 'd' is possibly null'` repartidos por todo `server/db.ts`: `getDb()` retornaba la variable module-level `db` (`let`) sin aserción. TS no puede probar que sigue no-null después del `await` previo (no narrowea variables mutables de scope externo a través de un `await`, por si otra llamada concurrente la reasignara). El invariante real es que en ese punto siempre está asignada. Fix: `return db!;` en la única fuente (`getDb()`), en vez de parchear cada uno de los ~80 call-sites. `tsc` bajó de 84 a 1 (el error restante, distinto, está documentado arriba en 🟡 #4).

### ✅ Health-check `/api/health` siempre reportaba "disconnected" (2026-07-04)

`server/index.ts` pasaba una `Promise` sin resolver a `d.execute()` (`d.execute(import("drizzle-orm").then(m => m.sql\`SELECT 1\`))`), en vez de resolver `sql` primero y ejecutar el query ya construido. El `SELECT 1` nunca corría de verdad — el endpoint caía siempre al `catch` y reportaba la DB como desconectada sin importar su estado real. Encontrado de rebote al perseguir el error de `tsc` que señalaba el bug de tipos (`Promise<SQL<unknown>>` no es `string | SQLWrapper`). Corregido resolviendo `sql` antes de construir el query.

### ✅ Rate-limiter de login/registro rediseñado: por CURP, no por IP (2026-07-04)

`authLimiter` estaba keyed por IP (default de `express-rate-limit`) — cualquier oficina compartiendo NAT topaba el límite (20/15min) entre todos sus empleados, sin importar que fueran cuentas distintas con credenciales válidas. Rediseño de dos capas:

- **Capa 1 (`authLimiter`):** key = CURP normalizado (extraído del body de la llamada tRPC, incluso batched con superjson — `extraerCurp()` en `server/middleware/rateLimiter.ts`), 8 intentos/15min, `skipSuccessfulRequests: true` (solo cuentan los fallos, un login exitoso no gasta el margen de nadie). Ataca el problema real: fuerza bruta contra UNA cuenta, sin importar la IP de origen.
- **Capa 2 (`authIpBackstopLimiter`):** key = IP (con `ipKeyGenerator` de `express-rate-limit` v8 para normalizar IPv6), techo alto (150/15min) — respaldo contra enumeración de CURPs válidos en volumen desde una sola máquina, no contra tráfico normal de oficina.

Se descartó lockout permanente de cuenta (sin 2FA ni recuperación por email funcional, sería un vector de DoS: cualquiera tumba la cuenta de otro fallando su CURP a propósito) y descartar el límite por IP por completo (un dispositivo comprometido dentro de la oficina podría entonces hacer fuerza bruta sin ningún freno). Tests: `server/rateLimiter.test.ts` (7 tests, cubre `extraerCurp` con body directo, batched, sin body, sin curp reconocible, normalización).

---

## Convención de este documento

- 🔴 Alta: afecta correctitud o puede tumbar el sistema/bloquear usuarios reales.
- 🟡 Media: no urgente, pero crece con el tiempo si se ignora indefinidamente.
- 🟢 Resuelto: se deja como referencia — explica el "por qué" de decisiones ya tomadas, útil para no re-litigar lo mismo después.

Cada entrada nueva debe responder: qué es, por qué importa (impacto real, no hipotético), cómo se detectó (evidencia, no intuición), y cómo se resuelve (opciones concretas, no "hay que verlo").
