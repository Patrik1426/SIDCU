import { z } from "zod";
import { eq } from "drizzle-orm";
import * as schema from "../../drizzle/schema";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  listarCursos,
  obtenerCursoPorId,
  crearCurso,
  actualizarCurso,
  toggleActivoCurso,
  eliminarCurso,
  listarCursosInstituciones,
  asignarCursoInstitucion,
  eliminarCursoInstitucion,
  obtenerPerfil,
} from "../db";

const cursoInput = z.object({
  nombre: z.string().min(2, "Nombre requerido"),
  descripcion: z.string().nullable().optional(),
  nivelRequerido: z.number().int().min(0).max(5).default(0),
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

  eliminar: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await eliminarCurso(input.id);
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

  desasignarInstitucion: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await eliminarCursoInstitucion(input.id);
      return { success: true };
    }),

  importar: adminProcedure
    .input(z.object({ registros: z.array(z.record(z.string(), z.any())) }))
    .mutation(async ({ ctx, input }) => {
      const creados: number[] = [];
      const errores: { fila: number; error: string }[] = [];
      const nombresVistos = new Set<string>();

      for (let i = 0; i < input.registros.length; i++) {
        const row = input.registros[i];
        const nombre = (row.nombre ?? "").trim();
        const nombreFormateado = nombre.length > 0 && nombre === nombre.toUpperCase()
          ? nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase()
          : nombre;
        const parsed = cursoInput.safeParse({
          nombre: nombreFormateado,
          descripcion: row.descripcion || "Por definir",
          nivelRequerido: Number(row.nivelRequerido || row.nivel_requerido || 1),
          nivelGobierno: row.nivelGobierno || row.nivel_gobierno || "federal",
          categoria: row.categoria || "obligatorio",
          duracionHoras: Number(row.duracionHoras || row.duracion_horas || row.duracion || 1),
          modalidad: row.modalidad || "presencial",
        });

        if (!parsed.success) {
          errores.push({
            fila: i + 1,
            error: parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
          });
          continue;
        }

        const nombreKey = parsed.data.nombre.toLowerCase();
        if (nombresVistos.has(nombreKey)) {
          errores.push({ fila: i + 1, error: `Curso "${parsed.data.nombre}" duplicado en el mismo archivo` });
          continue;
        }
        nombresVistos.add(nombreKey);

        const existente = await (await import("../db")).getDb().then(d =>
          d.select({ id: schema.cursos.id }).from(schema.cursos)
            .where(eq(schema.cursos.nombre, parsed.data.nombre))
            .then(r => r[0])
        );
        if (existente) {
          errores.push({ fila: i + 1, error: `Curso "${parsed.data.nombre}" ya existe en el sistema` });
          continue;
        }

        try {
          const id = await crearCurso({
            ...parsed.data,
            descripcion: parsed.data.descripcion ?? null,
            nivelGobierno: parsed.data.nivelGobierno ?? null,
            creadoPor: ctx.user.id,
          });
          creados.push(id);
        } catch (err: any) {
          errores.push({
            fila: i + 1,
            error: err.message?.includes("Duplicate") ? "Curso duplicado" : err.message ?? "Error desconocido",
          });
        }
      }

      return { totalProcesados: input.registros.length, creados: creados.length, errores };
    }),
});
