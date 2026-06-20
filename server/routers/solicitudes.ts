import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  crearSolicitud,
  listarSolicitudesUsuario,
  listarTodasSolicitudes,
  obtenerSolicitud,
  actualizarSolicitud,
  tieneSolicitudActiva,
  decrementarCupo,
  incrementarNivelProgresion,
} from "../db";

export const solicitudesRouter = router({
  crear: protectedProcedure
    .input(z.object({ cursoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "user") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo usuarios pueden solicitar cursos" });
      }
      const activa = await tieneSolicitudActiva(ctx.user.id, input.cursoId);
      if (activa) {
        throw new TRPCError({ code: "CONFLICT", message: "Ya tienes una solicitud activa para este curso" });
      }
      const id = await crearSolicitud({
        userId: ctx.user.id,
        cursoId: input.cursoId,
        estado: "pendiente",
      });
      return { success: true, id };
    }),

  misSolicitudes: protectedProcedure.query(async ({ ctx }) => {
    return listarSolicitudesUsuario(ctx.user.id);
  }),

  listar: adminProcedure
    .input(z.object({ estado: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return listarTodasSolicitudes({ estado: input?.estado });
    }),

  aprobar: adminProcedure
    .input(z.object({
      id: z.number(),
      cursoInstitucionId: z.number(),
      notasAdmin: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const sol = await obtenerSolicitud(input.id);
      if (!sol) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitud no encontrada" });
      if (sol.estado !== "pendiente") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Solicitud no está pendiente" });
      }
      await actualizarSolicitud(input.id, {
        estado: "aprobada",
        cursoInstitucionId: input.cursoInstitucionId,
        notasAdmin: input.notasAdmin ?? null,
      });
      await decrementarCupo(input.cursoInstitucionId);
      return { success: true };
    }),

  rechazar: adminProcedure
    .input(z.object({
      id: z.number(),
      notasAdmin: z.string().min(1, "Motivo de rechazo requerido"),
    }))
    .mutation(async ({ input }) => {
      const sol = await obtenerSolicitud(input.id);
      if (!sol) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitud no encontrada" });
      await actualizarSolicitud(input.id, {
        estado: "rechazada",
        notasAdmin: input.notasAdmin,
      });
      return { success: true };
    }),

  completar: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const sol = await obtenerSolicitud(input.id);
      if (!sol) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitud no encontrada" });
      if (sol.estado !== "aprobada") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Solicitud no está aprobada" });
      }
      await actualizarSolicitud(input.id, { estado: "completada" });
      await incrementarNivelProgresion(sol.userId);
      return { success: true };
    }),
});
