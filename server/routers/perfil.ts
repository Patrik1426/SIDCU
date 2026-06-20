import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { obtenerPerfil, crearPerfil, actualizarPerfil, crearServidor } from "../db";

const perfilInput = z.object({
  rfc: z.string().regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/, "RFC inválido"),
  curp: z.string().regex(/^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/, "CURP inválido"),
  cargo: z.string().min(2, "Cargo requerido"),
  dependencia: z.string().min(2, "Dependencia requerida"),
  nivelGobierno: z.enum(["federal", "estatal", "municipal", "otro"]),
  grupoFuncion: z.enum(["ADMO", "TECN", "SERV", "COMUN", "PROFE", "EDU"]),
  fechaIngreso: z.coerce.date(),
  datosContacto: z.string().nullable().optional(),
});

export const perfilRouter = router({
  obtener: protectedProcedure.query(async ({ ctx }) => {
    return obtenerPerfil(ctx.user.id);
  }),

  crear: protectedProcedure
    .input(perfilInput)
    .mutation(async ({ ctx, input }) => {
      const existing = await obtenerPerfil(ctx.user.id);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Perfil ya existe" });
      }
      const id = await crearPerfil({
        userId: ctx.user.id,
        ...input,
        datosContacto: input.datosContacto ?? null,
        completado: true,
      });

      await crearServidor({
        userId: ctx.user.id,
        nombreCompleto: ctx.user.nombre,
        rfc: input.rfc,
        curp: input.curp,
        cargo: input.cargo,
        dependencia: input.dependencia,
        nivel: input.nivelGobierno,
        grupoFuncion: input.grupoFuncion,
        fechaIngreso: input.fechaIngreso,
        datosContacto: input.datosContacto ?? null,
        estatus: "activo",
        creadoPor: ctx.user.id,
        actualizadoPor: ctx.user.id,
      });

      return { success: true, id };
    }),

  actualizar: protectedProcedure
    .input(perfilInput.partial())
    .mutation(async ({ ctx, input }) => {
      await actualizarPerfil(ctx.user.id, {
        ...input,
        datosContacto: input.datosContacto ?? undefined,
      });
      return { success: true };
    }),
});
