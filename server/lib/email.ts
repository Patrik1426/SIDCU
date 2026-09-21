import { Resend } from "resend";

const ENTIDADES_HTML: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

// `datos.nombre`/`datos.trabajador` vienen de texto libre que un trabajador
// controla 100% desde su propio registro publico (authRouter.register solo
// exige min(2) caracteres, sin restriccion de contenido) -- sin escapar,
// un nombre malicioso se inyecta crudo en el HTML del correo que Resend
// manda a evaluadores reales (terceros), abriendo phishing sobre un canal
// transaccional confiable (hallazgo de auditoria de seguridad 2026-09-21).
function escapeHtml(valor: string | undefined): string {
  return (valor ?? "").replace(/[&<>"']/g, (c) => ENTIDADES_HTML[c]);
}

const PLANTILLAS: Record<"evaluador_nueva_cuenta" | "evaluador_cuenta_existente", (datos: Record<string, string>) => { subject: string; html: string }> = {
  evaluador_nueva_cuenta: (datos) => ({
    subject: "Fuiste seleccionado como evaluador en SIDCU",
    html: `<p>Hola ${escapeHtml(datos.nombre)},</p><p>Fuiste seleccionado como evaluador de ${escapeHtml(datos.trabajador)} en el proceso de Promoción.</p><p>Tu usuario es tu CURP (<strong>${escapeHtml(datos.curp)}</strong>) y tu contraseña es <strong>${escapeHtml(datos.passwordTemporal)}</strong>. Consérvala, es la que debes usar para entrar.</p>`,
  }),
  evaluador_cuenta_existente: (datos) => ({
    subject: "Fuiste seleccionado como evaluador en SIDCU",
    html: `<p>Hola ${escapeHtml(datos.nombre)},</p><p>Fuiste seleccionado como evaluador de ${escapeHtml(datos.trabajador)} en el proceso de Promoción. Entra a tu portal de SIDCU con tu cuenta habitual para más detalles.</p>`,
  }),
};

// Wrapper delgado sobre el SDK -- sin logica de negocio aqui, igual que
// server/lib/s3.ts. RESEND_API_KEY y RESEND_FROM_EMAIL deben estar en
// .env/Railway (ver CLAUDE.md, Variables de Entorno).
//
// C2 (revision final de rama): el remitente estaba hardcodeado a
// "notificaciones@resend.dev" -- esa direccion es el dominio SANDBOX de
// Resend, que solo entrega a la cuenta de prueba del propio owner de la
// API key, nunca a destinatarios reales. Ahora se lee de
// RESEND_FROM_EMAIL, sin fallback a ninguna direccion (real ni de
// sandbox) -- si falta, se trata igual que RESEND_API_KEY faltante: un
// error de CONFIGURACION, no de envio (ver `configuracionFaltante` abajo
// y procesarLotePendientesCorreo en server/db.ts, hallazgo I6).
export async function enviarCorreoEvaluador(
  destinatario: string,
  plantilla: "evaluador_nueva_cuenta" | "evaluador_cuenta_existente",
  datos: Record<string, string>,
): Promise<{ ok: true } | { ok: false; error: string; configuracionFaltante?: true }> {
  const remitente = process.env.RESEND_FROM_EMAIL;
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY no configurada", configuracionFaltante: true };
  }
  if (!remitente) {
    return { ok: false, error: "RESEND_FROM_EMAIL no configurada", configuracionFaltante: true };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { subject, html } = PLANTILLAS[plantilla](datos);
  const { error } = await resend.emails.send({
    from: remitente,
    to: [destinatario],
    subject,
    html,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
