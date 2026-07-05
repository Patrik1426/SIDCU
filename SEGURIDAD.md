# Seguridad — SIGECAP

Documento vivo. Qué medidas de seguridad existen, por qué se decidieron así, y qué falta configurar (en código y fuera de código). Se actualiza conforme se agrega o cambia algo — no es un log histórico, es el estado actual.

---

## 1. Autenticación

- **Password hashing:** `bcrypt` nativo (bindings C++), factor de costo 12, corriendo en un pool de worker threads (`piscina`) para no bloquear el hilo principal bajo ráfagas de login. Ver `server/auth.ts`, `server/workers/bcrypt-worker.mjs`.
- **Sesión:** JWT en cookie `httpOnly` + `sameSite: lax` + `secure` (activo solo cuando `NODE_ENV=production`). No hay tokens en localStorage/sessionStorage — inmune a robo por XSS de JS en el cliente. Ver `server/routers.ts` (login).
- **Recuperación de contraseña:** el flujo por correo (`/recuperar-contrasena`) está **oculto** del login — no hay remitente de correo configurado para enviar el token. La ruta y el componente siguen ahí, listos para reactivar. Mientras tanto, un admin reasigna contraseñas manualmente desde **Usuarios** (`ResetPasswordModal`, funciona hoy).

## 2. Rate limiting (fuerza bruta / abuso)

Dos capas en `server/middleware/rateLimiter.ts`, montadas en `/api/trpc/auth.login` y `/api/trpc/auth.register`:

- **Capa 1 — `authLimiter` (la que importa de verdad):** key = CURP normalizado (extraído del body de la llamada tRPC, incluso batched con superjson vía `extraerCurp()`). 8 intentos/15min, `skipSuccessfulRequests: true` (solo cuentan los fallos). Ataca el problema real: fuerza bruta contra **una cuenta**, sin importar desde qué red (oficina compartiendo NAT, datos móviles con CGNAT, wifi de casa — la key nunca depende de la IP).
- **Capa 2 — `authIpBackstopLimiter`:** key = IP (con `ipKeyGenerator` de `express-rate-limit` v8, normaliza IPv6). Techo alto (150/15min) — solo un respaldo contra enumeración masiva de CURPs válidos desde una sola máquina, no contra tráfico normal.
- **`generalLimiter`:** 500 req/15min por IP en todo `/api/trpc` (protección genérica contra abuso de volumen, no específica de auth).
- **`importLimiter`:** 5 req/5min, para los endpoints de importación CSV masiva.

Decisiones descartadas y por qué:
- **Lockout permanente de cuenta:** no. Sin 2FA ni recuperación por email funcional, sería un vector de DoS — cualquiera tumba la cuenta de otro fallando su CURP a propósito. Por eso el límite es por ventana de tiempo (15min), no bloqueo indefinido.
- **Quitar el límite por IP por completo:** no. Sin ese respaldo, un dispositivo comprometido podría enumerar CURPs válidos en volumen sin ningún freno.

Requiere `app.set("trust proxy", 1)` (ver sección 4) para que `req.ip` refleje la IP real del cliente y no la del proxy de Railway — sin esto, la capa 2 colapsaría a todos los usuarios en un solo bucket.

Tests: `server/rateLimiter.test.ts` (7 casos para `extraerCurp`).

## 3. CAPTCHA en registro (Cloudflare Turnstile)

`auth.register` exige un `turnstileToken` válido, verificado server-side contra la API de Cloudflare (`server/turnstile.ts`, `verificarTurnstile()`). Sin `TURNSTILE_SECRET_KEY` configurada, la verificación se **omite con un warning** — no rompe desarrollo local, pero producción **debe** traer la llave puesta (ver `ACCIONES_PRODUCCION.md` #2).

Widget: `client/src/components/TurnstileWidget.tsx`, carga el script oficial de Cloudflare (`challenges.cloudflare.com/turnstile/v0/api.js`) sin dependencia npm nueva. Necesita `VITE_TURNSTILE_SITE_KEY` (pública, se incrusta en el build del cliente — debe estar puesta en Railway **antes** de correr `pnpm build`).

Tests: `server/turnstile.test.ts` (5 casos: sin secret, token vacío, success, fail, error de red).

## 4. Headers HTTP y CSP (helmet)

`server/index.ts` monta `helmet()` con Content-Security-Policy explícito:

- `scriptSrc`/`connectSrc`/`frameSrc` permiten `challenges.cloudflare.com` (necesario para que cargue el widget de Turnstile — script + iframe).
- `frameSrc` restringido solo a ese dominio (nada más puede embeberse en un iframe dentro de la app).
- `objectSrc: 'none'` (bloquea `<object>`/`<embed>`, vector clásico de XSS legacy).
- HSTS activo por default de `helmet` (no se sobreescribió esa opción).

`app.set("trust proxy", 1)` — activo solo en producción (`NODE_ENV=production`). Necesario porque Railway pone la app detrás de un proxy reverso; sin esto, `req.ip` ve la IP del proxy para todos los requests, no la del cliente real, y el rate-limiting por IP queda inútil.

## 5. HTTPS / SSL / proxy — qué hacer al desplegar

- **Certificado:** Railway lo genera automático (Let's Encrypt) al agregar el dominio custom en su dashboard — no requiere configuración manual, solo apuntar el DNS (CNAME) como Railway indique.
- **Si el dominio pasa por Cloudflare como proxy (nube naranja) antes de llegar a Railway:** en Cloudflare → SSL/TLS, modo debe ser **"Full (strict)"**. Nunca "Flexible" — causa loops de redirect porque Railway ya sirve HTTPS en el origen. Activar también "Always Use HTTPS".
- No se requiere nada más de configuración manual — HSTS, cookies seguras y CSP ya viven en el código (secciones 1 y 4).

## 6. Deuda de seguridad pendiente

Ver `DEUDA_TECNICA.md` para el detalle completo. Relevante a seguridad específicamente:

- **`exportarTodos` trunca en 10,000 filas sin avisar** — no es una falla de seguridad, pero es un bug de corrección/UX documentado ahí (🔴 alta prioridad, bajo impacto a la escala actual).
- Nada más pendiente de seguridad al momento de este documento — el rate-limiter (antes 🔴 alta prioridad en `DEUDA_TECNICA.md`) ya se resolvió.

---

## Convención de este documento

Cada entrada nueva debe responder: qué protege, cómo está implementado (archivo/función), qué se descartó y por qué, y qué falta configurar fuera de código (si aplica). Actualizar esta sección cada vez que se toque autenticación, rate limiting, headers HTTP, o cualquier control de acceso.
