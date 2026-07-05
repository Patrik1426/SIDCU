import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes. Intente de nuevo en unos minutos." },
});

// Extrae el CURP del body de una llamada tRPC a auth.login/auth.register,
// sin importar si el request llega batched (httpBatchLink + superjson
// envuelve el input real en body["0"].json en vez de en el body directo).
export function extraerCurp(req: Request): string | null {
  const body = req.body as any;
  if (!body || typeof body !== "object") return null;
  const candidato = body.curp ?? body["0"]?.json?.curp ?? body.json?.curp;
  return typeof candidato === "string" && candidato.trim() ? candidato.trim().toUpperCase() : null;
}

// Capa 1 (la que de verdad importa): limite por CURP, no por IP. El ataque
// real de fuerza bruta es contra UNA cuenta -- da igual desde que IP salga.
// skipSuccessfulRequests para que un login correcto no consuma el margen de
// nadie (solo cuentan los intentos fallidos).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => extraerCurp(req) ?? ipKeyGenerator(req.ip ?? "unknown"),
  message: { error: "Demasiados intentos de acceso para esta cuenta. Intente de nuevo en 15 minutos." },
});

// Capa 2: respaldo por IP contra abuso de volumen bruto (ej. enumeracion de
// CURPs validos probando muchas cuentas distintas desde una sola maquina).
// Techo alto a proposito -- no debe frenar trafico normal de oficina
// compartiendo NAT, solo volumen fuera de cualquier rango razonable.
export const authIpBackstopLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes desde esta red. Intente de nuevo en 15 minutos." },
});

export const importLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas importaciones. Espere 5 minutos antes de intentar de nuevo." },
});
