import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import {
  listarInstituciones,
  crearInstitucion,
  actualizarInstitucion,
  toggleActivoInstitucion,
} from "../db";

export const institucionesRouter = router({
  listar: adminProcedure
    .input(z.object({ soloActivas: z.boolean().default(true) }).optional())
    .query(async ({ input }) => {
      return listarInstituciones(input?.soloActivas ?? true);
    }),

  crear: adminProcedure
    .input(z.object({
      nombre: z.string().min(2),
      direccion: z.string().optional(),
      contacto: z.string().optional(),
      telefono: z.string().optional(),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await crearInstitucion({
        nombre: input.nombre,
        direccion: input.direccion ?? null,
        contacto: input.contacto ?? null,
        telefono: input.telefono ?? null,
        email: input.email ?? null,
      });
      return { success: true, id };
    }),

  actualizar: adminProcedure
    .input(z.object({
      id: z.number(),
      nombre: z.string().min(2).optional(),
      direccion: z.string().optional(),
      contacto: z.string().optional(),
      telefono: z.string().optional(),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await actualizarInstitucion(id, data);
      return { success: true };
    }),

  toggleActivo: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await toggleActivoInstitucion(input.id);
      return { success: true };
    }),
});
