import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import {
  obtenerFactoresConfig,
  obtenerInconformidad,
  guardarFactorInconformidad,
  quitarFactorInconformidad,
  crearArchivoPendiente,
  borrarArchivoPendiente,
  confirmarSubidaInconformidad,
  obtenerArchivoParaDescarga,
  enviarInconformidad,
  listarInconformidadesAdmin,
  actualizarConfigFactorInconformidad,
  crearAuditoria,
} from "../db";
import { urlSubida, urlDescarga, verificarArchivo, borrarArchivoSeguro } from "../lib/s3";
import { FACTORES_INCONFORMIDAD } from "../../drizzle/schema";
import { MAX_PDF_BYTES, TIPO_PDF } from "../../shared/const";

function traducirError(error: string): TRPCError {
  switch (error) {
    case "YA_ENVIADA":
      return new TRPCError({ code: "CONFLICT", message: "Tu inconformidad ya fue enviada (quizás desde otra pestaña). Actualizando tu pantalla..." });
    case "FACTOR_DESHABILITADO":
      return new TRPCError({ code: "FORBIDDEN", message: "Este factor no está disponible actualmente." });
    case "NO_ENCONTRADO":
    case "FACTOR_NO_ENCONTRADO":
      return new TRPCError({ code: "NOT_FOUND", message: "Factor no encontrado." });
    case "ARCHIVO_NO_ES_TUYO":
      return new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso sobre ese archivo." });
    case "SIN_FACTORES":
      return new TRPCError({ code: "BAD_REQUEST", message: "Selecciona al menos un factor antes de enviar." });
    case "NO_INICIADA":
      return new TRPCError({ code: "BAD_REQUEST", message: "No has empezado tu inconformidad." });
    default:
      return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error inesperado." });
  }
}

export const inconformidadRouter = router({
  factoresDisponibles: protectedProcedure.query(async () => {
    return obtenerFactoresConfig();
  }),

  miInconformidad: protectedProcedure.query(async ({ ctx }) => {
    return obtenerInconformidad(ctx.user.id);
  }),

  guardarFactor: protectedProcedure
    .input(z.object({
      factor: z.enum(FACTORES_INCONFORMIDAD),
      mensaje: z.string().min(10, "Escribe al menos 10 caracteres").max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      const resultado = await guardarFactorInconformidad(ctx.user.id, input.factor, input.mensaje);
      if (!resultado.ok) throw traducirError(resultado.error);
      return { success: true, id: resultado.id };
    }),

  quitarFactor: protectedProcedure
    .input(z.object({ factorId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const resultado = await quitarFactorInconformidad(ctx.user.id, input.factorId);
      if (!resultado.ok) throw traducirError(resultado.error);
      if (resultado.s3KeyBorrado) await borrarArchivoSeguro(resultado.s3KeyBorrado);
      return { success: true };
    }),

  presignarSubida: protectedProcedure
    .input(z.object({
      factorId: z.number(),
      nombreOriginal: z.string().min(1).max(255),
      tipoArchivo: z.literal(TIPO_PDF),
      tamanoBytes: z.number().positive().max(MAX_PDF_BYTES, "El archivo excede el límite de 10MB"),
    }))
    .mutation(async ({ ctx, input }) => {
      const inconformidad = await obtenerInconformidad(ctx.user.id);
      const factor = inconformidad?.factores.find((f) => f.id === input.factorId);
      if (!inconformidad || !factor) throw new TRPCError({ code: "NOT_FOUND", message: "Factor no encontrado." });
      if (inconformidad.estado !== "borrador") throw traducirError("YA_ENVIADA");

      const s3Key = `inconformidad/${ctx.user.id}/${input.factorId}/${nanoid()}.pdf`;
      const { id: archivoId } = await crearArchivoPendiente(ctx.user.id, input.nombreOriginal, input.tipoArchivo, input.tamanoBytes, s3Key);
      const url = await urlSubida(s3Key, input.tipoArchivo);
      return { archivoId, url, s3Key };
    }),

  confirmarSubida: protectedProcedure
    .input(z.object({ factorId: z.number(), archivoId: z.number(), s3Key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const verificacion = await verificarArchivo(input.s3Key);
      if (!verificacion.existe) {
        await borrarArchivoPendiente(input.archivoId);
        throw new TRPCError({ code: "BAD_REQUEST", message: "No se pudo confirmar la subida, intenta de nuevo." });
      }
      if ((verificacion.tamanoBytes ?? 0) > MAX_PDF_BYTES) {
        await borrarArchivoSeguro(input.s3Key);
        await borrarArchivoPendiente(input.archivoId);
        throw new TRPCError({ code: "BAD_REQUEST", message: "El archivo excede el límite de 10MB." });
      }

      const resultado = await confirmarSubidaInconformidad(ctx.user.id, input.factorId, input.archivoId);
      if (!resultado.ok) throw traducirError(resultado.error);
      if (resultado.s3KeyViejo) await borrarArchivoSeguro(resultado.s3KeyViejo);
      return { success: true };
    }),

  presignarDescarga: protectedProcedure
    .input(z.object({ archivoId: z.number() }))
    .query(async ({ ctx, input }) => {
      const archivo = await obtenerArchivoParaDescarga(input.archivoId);
      if (!archivo) throw new TRPCError({ code: "NOT_FOUND", message: "Archivo no encontrado." });

      const esDueno = archivo.cargadoPor === ctx.user.id;
      const esAdmin = ctx.user.role === "admin";
      if (!esDueno && !esAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso sobre ese archivo." });

      if (esAdmin && archivo.userIdDueno !== null && archivo.userIdDueno !== ctx.user.id) {
        await crearAuditoria({
          servidorId: archivo.servidorIdDueno,
          usuarioId: ctx.user.id,
          accion: "ver",
          descripcion: `${ctx.user.nombre ?? ctx.user.id} descargó el PDF "${archivo.nombreOriginal}" de una inconformidad`,
        });
      }

      const url = await urlDescarga(archivo.s3Key, archivo.nombreOriginal);
      return { url };
    }),

  enviar: protectedProcedure.mutation(async ({ ctx }) => {
    const resultado = await enviarInconformidad(ctx.user.id);
    if (!resultado.ok) throw traducirError(resultado.error);
    return { success: true };
  }),

  listarAdmin: adminProcedure
    .input(z.object({ factor: z.enum(FACTORES_INCONFORMIDAD).optional() }).optional())
    .query(async ({ input }) => {
      return listarInconformidadesAdmin(input?.factor);
    }),

  actualizarConfigFactor: adminProcedure
    .input(z.object({ factor: z.enum(FACTORES_INCONFORMIDAD), habilitado: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await actualizarConfigFactorInconformidad(input.factor, input.habilitado, ctx.user.id);
      return { success: true };
    }),
});
