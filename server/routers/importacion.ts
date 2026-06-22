import { z } from "zod";
import { router } from "../trpc";
import { protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { crearServidor, crearAuditoria } from "../db";

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
    .input(z.object({ registros: z.array(registroSchema) }))
    .mutation(async ({ ctx, input }) => {
      const creados: number[] = [];
      const errores: { fila: number; error: string }[] = [];

      for (let i = 0; i < input.registros.length; i++) {
        const reg = input.registros[i];
        try {
          const id = await crearServidor({
            ...reg,
            fechaIngreso: new Date(reg.fechaIngreso),
            datosContacto: reg.datosContacto ?? null,
            observaciones: reg.observaciones ?? null,
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
          errores.push({
            fila: i + 1,
            error: err.message?.includes("Duplicate")
              ? "RFC o CURP duplicado"
              : err.message ?? "Error desconocido",
          });
        }
      }

      return {
        totalProcesados: input.registros.length,
        creados: creados.length,
        errores,
      };
    }),
});
