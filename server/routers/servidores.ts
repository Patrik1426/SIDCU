import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import {
  crearServidor,
  listarServidores,
  obtenerServidorPorId,
  actualizarServidor,
  eliminarServidor,
  getServidoresStats,
  crearAuditoria,
  listarAuditoria,
} from "../db";

// ─── Middleware helpers ──────────────────────────────────────────────

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

// ─── Zod schemas ─────────────────────────────────────────────────────

const servidorInput = z.object({
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
  fechaIngreso: z.coerce.date(),
  datosContacto: z.string().nullable().optional(),
  grupoFuncion: z.enum(["ADMO", "TECN", "SERV", "COMUN", "PROFE", "EDU"]),
  estatus: z.enum(["activo", "inactivo"]).default("activo"),
  observaciones: z.string().nullable().optional(),
});

const filtrosInput = z.object({
  search: z.string().optional(),
  dependencia: z.string().optional(),
  nivel: z.string().optional(),
  estatus: z.string().optional(),
  grupoFuncion: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// ─── Router ──────────────────────────────────────────────────────────

export const servidoresRouter = router({
  crear: requireRole("admin", "capturista")
    .input(servidorInput)
    .mutation(async ({ ctx, input }) => {
      const id = await crearServidor({
        ...input,
        datosContacto: input.datosContacto ?? null,
        observaciones: input.observaciones ?? null,
        creadoPor: ctx.user.id,
        actualizadoPor: ctx.user.id,
      });

      await crearAuditoria({
        servidorId: id,
        usuarioId: ctx.user.id,
        accion: "crear",
        cambiosAnteriores: null,
        cambiosPosterior: JSON.stringify(input),
        descripcion: `Servidor público "${input.nombreCompleto}" creado por ${ctx.user.email}`,
      });

      return { success: true, id };
    }),

  listar: requireRole("admin", "capturista", "consultor")
    .input(filtrosInput)
    .query(async ({ input }) => {
      return listarServidores(input);
    }),

  obtener: requireRole("admin", "capturista", "consultor")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const servidor = await obtenerServidorPorId(input.id);
      if (!servidor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Servidor público no encontrado",
        });
      }
      return servidor;
    }),

  actualizar: requireRole("admin")
    .input(z.object({ id: z.number() }).merge(servidorInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const anterior = await obtenerServidorPorId(id);
      if (!anterior) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Servidor público no encontrado",
        });
      }

      await actualizarServidor(id, {
        ...data,
        actualizadoPor: ctx.user.id,
      });

      await crearAuditoria({
        servidorId: id,
        usuarioId: ctx.user.id,
        accion: "actualizar",
        cambiosAnteriores: JSON.stringify(anterior),
        cambiosPosterior: JSON.stringify(data),
        descripcion: `Servidor público "${anterior.nombreCompleto}" actualizado por ${ctx.user.email}`,
      });

      return { success: true };
    }),

  eliminar: requireRole("admin")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const anterior = await obtenerServidorPorId(input.id);
      if (!anterior) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Servidor público no encontrado",
        });
      }

      await eliminarServidor(input.id);

      await crearAuditoria({
        servidorId: input.id,
        usuarioId: ctx.user.id,
        accion: "eliminar",
        cambiosAnteriores: JSON.stringify(anterior),
        cambiosPosterior: null,
        descripcion: `Servidor público "${anterior.nombreCompleto}" eliminado por ${ctx.user.email}`,
      });

      return { success: true };
    }),

  estadisticas: requireRole("admin", "capturista", "consultor").query(async () => {
    return getServidoresStats();
  }),

  actividadReciente: requireRole("admin", "capturista", "consultor").query(async () => {
    return listarAuditoria({ limit: 10 });
  }),

  auditoria: requireRole("admin")
    .input(
      z.object({
        servidorId: z.number().optional(),
        usuarioId: z.number().optional(),
        accion: z.string().optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      return listarAuditoria(input);
    }),
});
