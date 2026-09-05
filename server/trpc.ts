import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./middleware/auth";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter(opts) {
    const { shape, error } = opts;
    // Nunca mandar al cliente el stack trace -- revela rutas reales del
    // servidor (ej. "D:\...\server\routers\x.ts:33"), sea cual sea el error.
    const data = { ...shape.data } as typeof shape.data & { stack?: unknown };
    delete data.stack;

    // `error.cause` SOLO viene seteado cuando trpc envolvio un throw crudo
    // que nadie controlo (ver getTRPCErrorFromUnknown en @trpc/server) --
    // ahi el mensaje puede traer texto de SQL, nombres de tabla/columna,
    // variables internas (hallazgo real: guardarFactorInconformidad
    // agotando sus 3 reintentos re-lanzaba el error crudo de MySQL). Todo
    // `new TRPCError({ code, message })` que lanzamos a propósito en este
    // repo nunca pasa `cause` (verificado por grep) -- ese mensaje ya fue
    // pensado para el usuario y se deja pasar tal cual.
    if (error.cause) {
      console.error("Error interno no controlado en tRPC:", error.cause);
      return { ...shape, message: "Ocurrió un error inesperado. Intenta de nuevo más tarde.", data };
    }
    return { ...shape, data };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "No autenticado" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "No autenticado" });
  }
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No tienes permisos para esta acción",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
