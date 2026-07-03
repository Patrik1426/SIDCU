import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  crearSolicitud,
  listarSolicitudesUsuario,
  listarTodasSolicitudes,
  listarCursosInstituciones,
  obtenerSolicitud,
  actualizarSolicitud,
  tieneSolicitudActiva,
  decrementarCupo,
  incrementarNivelProgresion,
  getUserByCurp,
  getDb,
} from "../db";
import { eq, and, or } from "drizzle-orm";
import * as schema from "../../drizzle/schema";
import { CALIFICACION_APROBATORIA, CURSOS_REQUERIDOS_ACREDITACION } from "../../shared/const";

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

      const d = await getDb();

      const [cursoNuevo] = await d.select({ bloque: schema.cursos.bloque })
        .from(schema.cursos)
        .where(eq(schema.cursos.id, input.cursoId));

      // Máximo 1 curso activo (pendiente o aprobada) por bloque — cada bloque maneja sus propias fechas,
      // así que un curso por bloque evita empalmes sin necesidad de comparar fechas entre instituciones.
      const activosMismoBloque = await d.select({ id: schema.solicitudesCurso.id })
        .from(schema.solicitudesCurso)
        .innerJoin(schema.cursos, eq(schema.solicitudesCurso.cursoId, schema.cursos.id))
        .where(and(
          eq(schema.solicitudesCurso.userId, ctx.user.id),
          or(
            eq(schema.solicitudesCurso.estado, "pendiente"),
            eq(schema.solicitudesCurso.estado, "aprobada")
          ),
          cursoNuevo?.bloque != null
            ? eq(schema.cursos.bloque, cursoNuevo.bloque)
            : eq(schema.cursos.id, input.cursoId), // sin bloque asignado: no se puede comparar, no bloquea
        ));

      if (cursoNuevo?.bloque != null && activosMismoBloque.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Ya tienes un curso activo en el Bloque ${cursoNuevo.bloque}. Solo puedes tener un curso activo por bloque.`,
        });
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

  // Aprueba todas las solicitudes pendientes de golpe — para cada una elige
  // automaticamente la primera institucion asignada al curso con cupo disponible.
  aprobarTodas: adminProcedure.mutation(async () => {
    const pendientes = await listarTodasSolicitudes({ estado: "pendiente" });
    const aprobadas: number[] = [];
    const errores: { id: number; error: string }[] = [];

    for (const item of pendientes) {
      const sol = item.solicitudes_curso;
      const instituciones = await listarCursosInstituciones(sol.cursoId);
      const disponible = instituciones.find(
        (row: any) => (row.cursos_instituciones ?? row).cupoDisponible > 0,
      );

      if (!disponible) {
        errores.push({ id: sol.id, error: `Sin cupo disponible para "${item.cursos.nombre}"` });
        continue;
      }

      const ci = (disponible as any).cursos_instituciones ?? disponible;
      await actualizarSolicitud(sol.id, { estado: "aprobada", cursoInstitucionId: ci.id });
      await decrementarCupo(ci.id);
      aprobadas.push(sol.id);
    }

    return { aprobadas: aprobadas.length, errores };
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
    .input(z.object({ id: z.number(), calificacion: z.number().min(0).max(100) }))
    .mutation(async ({ input }) => {
      const sol = await obtenerSolicitud(input.id);
      if (!sol) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitud no encontrada" });
      if (sol.estado !== "aprobada") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Solicitud no está aprobada" });
      }
      await actualizarSolicitud(input.id, { estado: "completada", calificacion: input.calificacion });
      if (input.calificacion >= CALIFICACION_APROBATORIA) {
        await incrementarNivelProgresion(sol.userId);
      }
      return { success: true, aprobado: input.calificacion >= CALIFICACION_APROBATORIA };
    }),

  // Carga masiva de calificaciones — un solo CSV con curp + nombre del curso + calificación,
  // cubre todos los bloques/cursos a la vez (no requiere preseleccionar un curso).
  importarCalificaciones: adminProcedure
    .input(z.object({
      registros: z.array(z.record(z.string(), z.any())),
    }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      const actualizados: number[] = [];
      const errores: { fila: number; error: string }[] = [];

      for (let i = 0; i < input.registros.length; i++) {
        const row = input.registros[i];
        const curp = (row.curp ?? "").toString().trim().toUpperCase();
        const cursoNombre = (row.curso ?? "").toString().trim();
        const calificacion = Number(row.calificacion);

        if (!curp) {
          errores.push({ fila: i + 1, error: "CURP requerida" });
          continue;
        }
        if (!cursoNombre) {
          errores.push({ fila: i + 1, error: "Nombre de curso requerido" });
          continue;
        }
        if (!Number.isFinite(calificacion) || calificacion < 0 || calificacion > 100) {
          errores.push({ fila: i + 1, error: "Calificación inválida (0-100)" });
          continue;
        }

        try {
          const { sql } = await import("drizzle-orm");
          const user = await getUserByCurp(curp);
          if (!user) {
            errores.push({ fila: i + 1, error: `CURP "${curp}" no encontrada` });
            continue;
          }

          const [curso] = await d.select({ id: schema.cursos.id }).from(schema.cursos)
            .where(sql`LOWER(TRIM(${schema.cursos.nombre})) = ${cursoNombre.toLowerCase()}`);
          if (!curso) {
            errores.push({ fila: i + 1, error: `Curso "${cursoNombre}" no encontrado` });
            continue;
          }

          const [sol] = await d.select().from(schema.solicitudesCurso)
            .where(and(
              eq(schema.solicitudesCurso.userId, user.id),
              eq(schema.solicitudesCurso.cursoId, curso.id),
              eq(schema.solicitudesCurso.estado, "aprobada"),
            ));
          if (!sol) {
            errores.push({ fila: i + 1, error: `CURP "${curp}" no tiene solicitud aprobada para "${cursoNombre}"` });
            continue;
          }

          await actualizarSolicitud(sol.id, { estado: "completada", calificacion });
          if (calificacion >= CALIFICACION_APROBATORIA) {
            await incrementarNivelProgresion(user.id);
          }
          actualizados.push(sol.id);
        } catch (err: any) {
          errores.push({ fila: i + 1, error: err.message ?? "Error desconocido" });
        }
      }

      return { totalProcesados: input.registros.length, creados: actualizados.length, errores };
    }),

  // Progreso de acreditación del usuario: cuántos cursos completó y cuántos aprobó
  progresoAcreditacion: protectedProcedure.query(async ({ ctx }) => {
    const d = await getDb();
    const completadas = await d.select({
      calificacion: schema.solicitudesCurso.calificacion,
    }).from(schema.solicitudesCurso)
      .where(and(
        eq(schema.solicitudesCurso.userId, ctx.user.id),
        eq(schema.solicitudesCurso.estado, "completada"),
      ));

    const aprobados = completadas.filter((c) => (c.calificacion ?? 0) >= CALIFICACION_APROBATORIA).length;

    return {
      completados: completadas.length,
      aprobados,
      requeridos: CURSOS_REQUERIDOS_ACREDITACION,
      acreditado: aprobados >= CURSOS_REQUERIDOS_ACREDITACION,
    };
  }),
});
