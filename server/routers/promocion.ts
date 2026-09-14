import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import {
  elegibilidadPromocion,
  yaInscritoPromocion,
  inscribirmePromocion,
  importarFilaJefe,
  importarFilaCompanero,
} from "../db";

type ErrorCodigoPromocion = "NO_ELEGIBLE" | "SIN_JEFE_ASIGNADO" | "POOL_INSUFICIENTE" | "YA_INSCRITO";

function traducirError(error: ErrorCodigoPromocion): TRPCError {
  switch (error) {
    case "NO_ELEGIBLE":
      return new TRPCError({ code: "FORBIDDEN", message: "No cumples el requisito de calificación para inscribirte." });
    case "SIN_JEFE_ASIGNADO":
      return new TRPCError({ code: "BAD_REQUEST", message: "Tu jefe inmediato no está asignado en el sistema. Contacta al administrador." });
    case "POOL_INSUFICIENTE":
      return new TRPCError({ code: "BAD_REQUEST", message: "No hay suficientes compañeros disponibles para asignar. Contacta al administrador." });
    case "YA_INSCRITO":
      return new TRPCError({ code: "CONFLICT", message: "Ya estás inscrito a Promoción." });
    default: {
      // Exhaustividad en compile-time, mismo patron que inconformidad.ts.
      const _exhaustivo: never = error;
      return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error inesperado." });
    }
  }
}

const filaImportSchema = z.object({ registros: z.array(z.record(z.string(), z.any())) });

export const promocionRouter = router({
  miElegibilidad: protectedProcedure.query(async ({ ctx }) => {
    const [elegibilidad, yaInscrito] = await Promise.all([
      elegibilidadPromocion(ctx.user.id),
      yaInscritoPromocion(ctx.user.id),
    ]);
    return { ...elegibilidad, yaInscrito };
  }),

  inscribirme: protectedProcedure.mutation(async ({ ctx }) => {
    const resultado = await inscribirmePromocion(ctx.user.id);
    if (!resultado.ok) throw traducirError(resultado.error);
    return { success: true };
  }),

  importarJefes: adminProcedure
    .input(filaImportSchema)
    .mutation(async ({ ctx, input }) => {
      let creados = 0;
      const errores: { fila: number; error: string }[] = [];
      for (let i = 0; i < input.registros.length; i++) {
        const row = input.registros[i];
        const curpTrabajador = (row["curp_trabajador"] ?? "").toString().trim();
        const curpJefe = (row["curp_jefe"] ?? "").toString().trim();
        if (!curpTrabajador || !curpJefe) {
          errores.push({ fila: i + 1, error: "Faltan columnas curp_trabajador/curp_jefe" });
          continue;
        }
        const resultado = await importarFilaJefe(curpTrabajador, curpJefe, ctx.user.id);
        if (resultado.ok) creados++;
        else errores.push({ fila: i + 1, error: resultado.error });
      }
      return { totalProcesados: input.registros.length, creados, errores };
    }),

  importarCompaneros: adminProcedure
    .input(filaImportSchema)
    .mutation(async ({ input }) => {
      let creados = 0;
      const errores: { fila: number; error: string }[] = [];
      for (let i = 0; i < input.registros.length; i++) {
        const row = input.registros[i];
        const curp = (row["curp"] ?? "").toString().trim();
        if (!curp) {
          errores.push({ fila: i + 1, error: "Falta columna curp" });
          continue;
        }
        const resultado = await importarFilaCompanero(curp);
        if (resultado.ok) creados++;
        else errores.push({ fila: i + 1, error: resultado.error });
      }
      return { totalProcesados: input.registros.length, creados, errores };
    }),
});
