import { z } from "zod";
import { router } from "../trpc";
import { protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { crearServidor, crearAuditoria, getDb } from "../db";
import { eq, or } from "drizzle-orm";
import * as schema from "../../drizzle/schema";

function requireRole(...roles: string[]) {
  return protectedProcedure.use(({ ctx, next }) => {
    if (!roles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "No tienes permisos para esta acción",
      });
    }
    return next({ ctx });
  });
}

const registroSchema = z.object({
  nombreCompleto: z.string().min(2, "Nombre requerido"),
  rfc: z
    .string()
    .regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/, "RFC inválido"),
  curp: z
    .string()
    .regex(/^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/, "CURP inválido"),
  cargo: z.string().min(2, "Cargo requerido"),
  dependencia: z.string().min(2, "Dependencia requerida"),
  nivel: z.enum(["federal", "estatal", "municipal", "otro"]),
  fechaIngreso: z.string().min(1, "Fecha requerida"),
  datosContacto: z.string().nullable().optional(),
  grupoFuncion: z.enum(["ADMO", "TECN", "SERV", "COMUN", "PROFE", "EDU"]),
  estatus: z.enum(["activo", "inactivo"]).default("activo"),
  observaciones: z.string().nullable().optional(),
});

const registroImportSchema = z.object({
  nombreCompleto: z.string(),
  rfc: z.string(),
  curp: z.string(),
  cargo: z.string(),
  dependencia: z.string(),
  nivel: z.string(),
  fechaIngreso: z.string(),
  datosContacto: z.string().nullable().optional(),
  grupoFuncion: z.string(),
  estatus: z.string(),
  observaciones: z.string().nullable().optional(),
});

export const importacionRouter = router({
  validar: requireRole("admin", "capturista")
    .input(z.object({ registros: z.array(z.record(z.string(), z.any())) }))
    .mutation(({ input }) => {
      const resultados = input.registros.map((row, index) => {
        const parsed = registroSchema.safeParse(row);
        if (parsed.success) {
          return { fila: index + 1, valido: true as const, data: parsed.data, errores: [] };
        }
        return {
          fila: index + 1,
          valido: false as const,
          data: row,
          errores: parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`),
        };
      });

      return {
        total: resultados.length,
        validos: resultados.filter((r) => r.valido).length,
        invalidos: resultados.filter((r) => !r.valido).length,
        resultados,
      };
    }),

  importar: requireRole("admin", "capturista")
    .input(z.object({ registros: z.array(z.record(z.string(), z.any())) }))
    .mutation(async ({ ctx, input }) => {
      const creados: number[] = [];
      const errores: { fila: number; error: string }[] = [];
      const curpsVistos = new Set<string>();
      const rfcsVistos = new Set<string>();

      for (let i = 0; i < input.registros.length; i++) {
        const row = input.registros[i];
        const nivelProgRaw = (row.nivelProgresion || row.nivel_progresion || row.nivelP || "0").toString().trim();
        const nivelProgresion = nivelProgRaw.toUpperCase().startsWith("N") ? Number(nivelProgRaw.slice(1)) : Number(nivelProgRaw) || 0;

        const upa = (row.upa || row.UPA || "").toString().toUpperCase().trim() || "SIN ASIGNAR";
        const cmao = (row.cmao || row.CMAO || "").toString().toUpperCase().trim() || "SIN ASIGNAR";
        const ua = (row.ua || row.UA || "").toString().trim() || "Sin asignar";

        const reg = registroImportSchema.safeParse({
          nombreCompleto: row.nombreCompleto || row.nombre_completo || row.nombre || "Por definir",
          rfc: row.rfc || row.RFC || `PEND${String(i + 1).padStart(9, "0")}`,
          curp: row.curp || row.CURP || `PEND${String(i + 1).padStart(14, "0")}`,
          cargo: row.cargo || "Por definir",
          dependencia: row.dependencia || "Por definir",
          nivel: row.nivel || "federal",
          fechaIngreso: row.fechaIngreso || row.fecha_ingreso || new Date().toISOString().split("T")[0],
          grupoFuncion: row.grupoFuncion || row.grupo_funcion || "ADMO",
          datosContacto: row.datosContacto || row.datos_contacto || "Sin datos",
          estatus: row.estatus || "activo",
          observaciones: row.observaciones || "Sin observaciones",
        });

        if (!reg.success) {
          errores.push({
            fila: i + 1,
            error: reg.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
          });
          continue;
        }

        const curp = reg.data.curp.toUpperCase();
        const rfc = reg.data.rfc.toUpperCase();

        if (curpsVistos.has(curp) && !curp.startsWith("PEND")) {
          errores.push({ fila: i + 1, error: `CURP "${curp}" duplicado en el mismo archivo (fila anterior)` });
          continue;
        }
        if (rfcsVistos.has(rfc) && !rfc.startsWith("PEND")) {
          errores.push({ fila: i + 1, error: `RFC "${rfc}" duplicado en el mismo archivo (fila anterior)` });
          continue;
        }
        curpsVistos.add(curp);
        rfcsVistos.add(rfc);

        const d = await getDb();
        const [existente] = await d.select({ id: schema.servidoresPublicos.id, estatus: schema.servidoresPublicos.estatus, curp: schema.servidoresPublicos.curp })
          .from(schema.servidoresPublicos)
          .where(
            or(
              eq(schema.servidoresPublicos.curp, curp),
              ...(!rfc.startsWith("PEND") ? [eq(schema.servidoresPublicos.rfc, rfc)] : [])
            )
          );
        if (existente) {
          if (existente.estatus === "inactivo") {
            errores.push({ fila: i + 1, error: `CURP "${curp}" pertenece a un servidor dado de baja — no se puede reimportar` });
            continue;
          }
          errores.push({ fila: i + 1, error: `Servidor con CURP "${curp}" ya registrado — se omitió` });
          continue;
        }

        try {
          const id = await crearServidor({
            ...reg.data,
            fechaIngreso: new Date(reg.data.fechaIngreso),
            datosContacto: reg.data.datosContacto ?? null,
            observaciones: reg.data.observaciones ?? null,
            upa,
            cmao,
            ua,
            nivelProgresion,
            creadoPor: ctx.user.id,
            actualizadoPor: ctx.user.id,
          });

          await crearAuditoria({
            servidorId: id,
            usuarioId: ctx.user.id,
            accion: "crear",
            cambiosAnteriores: null,
            cambiosPosterior: JSON.stringify(reg),
            descripcion: `Servidor "${reg.nombreCompleto}" importado via CSV por ${ctx.user.email}`,
          });

          creados.push(id);
        } catch (err: any) {
          const msg = err.message ?? "Error desconocido";
          let error = msg;
          if (msg.includes("Duplicate")) {
            if (msg.includes("rfc")) error = `RFC "${reg.data.rfc}" ya existe en el sistema`;
            else if (msg.includes("curp")) error = `CURP "${reg.data.curp}" ya existe en el sistema`;
            else error = "Registro duplicado (RFC o CURP ya existe)";
          }
          errores.push({ fila: i + 1, error });
        }
      }

      return {
        totalProcesados: input.registros.length,
        creados: creados.length,
        errores,
      };
    }),
});
