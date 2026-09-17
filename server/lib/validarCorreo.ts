import { resolveMx } from "dns/promises";

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 2 capas, sin restringir a una lista fija de proveedores (Gmail/Outlook/etc)
// -- eso rechazaria correos institucionales legitimos que no esten en esa
// lista. Ver spec, seccion 3.
export async function validarCorreoEvaluador(correo: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!FORMATO_CORREO.test(correo)) {
    return { ok: false, error: "formato de correo inválido" };
  }
  const dominio = correo.split("@")[1];
  try {
    const registros = await resolveMx(dominio);
    if (!registros || registros.length === 0) {
      return { ok: false, error: "el dominio del correo no existe" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "el dominio del correo no existe" };
  }
}
