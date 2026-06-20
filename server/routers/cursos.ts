import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  listarCursos,
  obtenerCursoPorId,
  crearCurso,
  actualizarCurso,
  toggleActivoCurso,
  listarCursosInstituciones,
  asignarCursoInstitucion,
  obtenerPerfil,
} from "../db";

const cursoInput = z.object({
  nombre: z.string().min(2, "Nombre requerido"),
  descripcion: z.string().nullable().optional(),
  nivelRequerido: z.number().int().min(1).max(4).default(1),
  nivelGobierno: z.enum(["federal", "estatal", "municipal", "otro"]).nullable().optional(),
  categoria: z.string().min(1, "Categoría requerida"),
  duracionHoras: z.number().int().positive(),
  modalidad: z.enum(["presencial", "virtual", "mixto"]),
});

export const cursosRouter = router({
  listar: protectedProcedure
    .input(z.object({
      categoria: z.string().optional(),
      modalidad: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.user.role === "user") {
        const perfil = await obtenerPerfil(ctx.user.id);
        if (!perfil?.completado) return [];
        return listarCursos({
          nivelMax: perfil.nivelProgresion,
          nivelGobierno: perfil.nivelGobierno,
          categoria: input?.categoria,
          modalidad: input?.modalidad,
          soloActivos: true,
        });
      }
      return listarCursos({
        categoria: input?.categoria,
        modalidad: input?.modalidad,
        soloActivos: false,
      });
    }),

  obtener: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const curso = await obtenerCursoPorId(input.id);
      if (!curso) throw new TRPCError({ code: "NOT_FOUND", message: "Curso no encontrado" });
      const instituciones = await listarCursosInstituciones(input.id);
      return { ...curso, instituciones };
    }),

  crear: adminProcedure
    .input(cursoInput)
    .mutation(async ({ ctx, input }) => {
      const id = await crearCurso({
        ...input,
        descripcion: input.descripcion ?? null,
        nivelGobierno: input.nivelGobierno ?? null,
        creadoPor: ctx.user.id,
      });
      return { success: true, id };
    }),

  actualizar: adminProcedure
    .input(z.object({ id: z.number() }).merge(cursoInput.partial()))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await actualizarCurso(id, data);
      return { success: true };
    }),

  toggleActivo: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await toggleActivoCurso(input.id);
      return { success: true };
    }),

  asignarInstitucion: adminProcedure
    .input(z.object({
      cursoId: z.number(),
      institucionId: z.number(),
      cupoMaximo: z.number().int().positive(),
      horario: z.string().optional(),
      fechaInicio: z.coerce.date().optional(),
      fechaFin: z.coerce.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await asignarCursoInstitucion({
        cursoId: input.cursoId,
        institucionId: input.institucionId,
        cupoMaximo: input.cupoMaximo,
        cupoDisponible: input.cupoMaximo,
        horario: input.horario ?? null,
        fechaInicio: input.fechaInicio ?? null,
        fechaFin: input.fechaFin ?? null,
      });
      return { success: true, id };
    }),
});
