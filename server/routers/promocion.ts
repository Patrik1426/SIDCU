import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import {
  elegibilidadPromocion,
  yaInscritoPromocion,
  confirmarInscripcion,
  buscarEnPoolPromocion,
  importarFilaEvaluador,
  listarInscripcionesPromocion,
  buscarEvaluadorPromocion,
  reasignarEvaluadorPromocion,
} from "../db";

type ErrorCodigoConfirmar = "NO_ELEGIBLE" | "YA_INSCRITO" | "SELECCION_INVALIDA";

function traducirErrorConfirmar(error: ErrorCodigoConfirmar): TRPCError {
  switch (error) {
    case "NO_ELEGIBLE":
      return new TRPCError({ code: "FORBIDDEN", message: "No cumples el requisito de calificación para inscribirte." });
    case "SELECCION_INVALIDA":
      return new TRPCError({ code: "BAD_REQUEST", message: "Alguno de los evaluadores elegidos no es válido. Vuelve a elegir." });
    case "YA_INSCRITO":
      return new TRPCError({ code: "CONFLICT", message: "Ya estás inscrito a Promoción." });
    default: {
      const _exhaustivo: never = error;
      return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error inesperado." });
    }
  }
}

const evaluadorSeleccionSchema = z.object({
  servidorId: z.number().int().positive(),
  correo: z.string().email(),
});

const filaImportSchema = z.object({ registros: z.array(z.record(z.string(), z.any())) });

export const promocionRouter = router({
  miElegibilidad: protectedProcedure.query(async ({ ctx }) => {
    const [elegibilidad, yaInscrito] = await Promise.all([
      elegibilidadPromocion(ctx.user.id),
      yaInscritoPromocion(ctx.user.id),
    ]);
    return { ...elegibilidad, yaInscrito };
  }),

  buscarEnPool: protectedProcedure
    .input(z.object({ q: z.string().min(2), rol: z.enum(["jefe", "companero"]) }))
    .query(async ({ ctx, input }) => buscarEnPoolPromocion(input.q, input.rol, ctx.user.id)),

  confirmarInscripcion: protectedProcedure
    .input(z.object({
      jefe: evaluadorSeleccionSchema,
      companero1: evaluadorSeleccionSchema,
      companero2: evaluadorSeleccionSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const resultado = await confirmarInscripcion(ctx.user.id, input);
      if (!resultado.ok) throw traducirErrorConfirmar(resultado.error);
      return { success: true };
    }),

  importarEvaluadores: adminProcedure
    .input(z.object({ rol: z.enum(["jefe", "companero"]), ...filaImportSchema.shape }))
    .mutation(async ({ ctx, input }) => {
      let creados = 0;
      const errores: { fila: number; error: string }[] = [];
      const advertencias: { fila: number; advertencia: string }[] = [];
      for (let i = 0; i < input.registros.length; i++) {
        const row = input.registros[i];
        const curp = (row["curp"] ?? "").toString().trim();
        const nombre = (row["nombre"] ?? "").toString().trim();
        const correo = (row["correo"] ?? "").toString().trim() || undefined;
        if (!curp || !nombre) {
          errores.push({ fila: i + 1, error: "Faltan columnas curp/nombre" });
          continue;
        }
        const resultado = await importarFilaEvaluador(curp, nombre, input.rol, correo, ctx.user.id);
        if (resultado.ok) {
          creados++;
          if (resultado.advertencia) advertencias.push({ fila: i + 1, advertencia: resultado.advertencia });
        } else {
          errores.push({ fila: i + 1, error: resultado.error });
        }
      }
      return { totalProcesados: input.registros.length, creados, errores, advertencias };
    }),

  listarInscripciones: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().max(100).default(20),
    }))
    .query(async ({ input }) => listarInscripcionesPromocion(input)),

  buscarEvaluador: adminProcedure
    .input(z.object({ q: z.string().min(2) }))
    .query(async ({ input }) => buscarEvaluadorPromocion(input.q)),

  reasignarEvaluador: adminProcedure
    .input(z.object({
      promocionId: z.number(),
      rol: z.enum(["jefe", "companero1", "companero2"]),
      nuevoServidorId: z.number(),
      correo: z.string().email(),
    }))
    .mutation(async ({ ctx, input }) => {
      const resultado = await reasignarEvaluadorPromocion(input.promocionId, input.rol, input.nuevoServidorId, input.correo, ctx.user.id);
      if (!resultado.ok) {
        throw new TRPCError({
          code: resultado.error === "SELECCION_INVALIDA" ? "BAD_REQUEST" : "NOT_FOUND",
          message: resultado.error === "SELECCION_INVALIDA" ? "Ese servidor no es válido para este puesto (no está en el pool del rol, o ya ocupa otro lugar en esta inscripción)." : "Inscripción no encontrada.",
        });
      }
      return { success: true };
    }),
});
