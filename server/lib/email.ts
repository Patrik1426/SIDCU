import { Resend } from "resend";

const PLANTILLAS: Record<"evaluador_nueva_cuenta" | "evaluador_cuenta_existente", (datos: Record<string, string>) => { subject: string; html: string }> = {
  evaluador_nueva_cuenta: (datos) => ({
    subject: "Fuiste seleccionado como evaluador en SIDCU",
    html: `<p>Hola ${datos.nombre},</p><p>Fuiste seleccionado como evaluador de ${datos.trabajador} en el proceso de Promoción.</p><p>Tu usuario es tu CURP (<strong>${datos.curp}</strong>) y tu contraseña temporal es <strong>${datos.passwordTemporal}</strong>. Debes cambiarla al entrar por primera vez.</p>`,
  }),
  evaluador_cuenta_existente: (datos) => ({
    subject: "Fuiste seleccionado como evaluador en SIDCU",
    html: `<p>Hola ${datos.nombre},</p><p>Fuiste seleccionado como evaluador de ${datos.trabajador} en el proceso de Promoción. Entra a tu portal de SIDCU con tu cuenta habitual para más detalles.</p>`,
  }),
};

// Wrapper delgado sobre el SDK -- sin logica de negocio aqui, igual que
// server/lib/s3.ts. RESEND_API_KEY debe estar en .env/Railway (ver
// CLAUDE.md, Variables de Entorno).
export async function enviarCorreoEvaluador(
  destinatario: string,
  plantilla: "evaluador_nueva_cuenta" | "evaluador_cuenta_existente",
  datos: Record<string, string>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY no configurada" };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { subject, html } = PLANTILLAS[plantilla](datos);
  const { error } = await resend.emails.send({
    from: "SIDCU <notificaciones@resend.dev>",
    to: [destinatario],
    subject,
    html,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
