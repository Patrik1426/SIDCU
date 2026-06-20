import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import {
  listarUsuarios,
  cambiarRolUsuario,
  toggleActivoUsuario,
} from "../db";

export const usuariosRouter = router({
  listar: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const usuarios = await listarUsuarios(input.search);
      return usuarios;
    }),

  cambiarRol: adminProcedure
    .input(
      z.object({
        id: z.number(),
        role: z.enum(["admin", "capturista", "consultor", "user"]),
      }),
    )
    .mutation(async ({ input }) => {
      await cambiarRolUsuario(input.id, input.role);
      return { success: true };
    }),

  toggleActivo: adminProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      await toggleActivoUsuario(input.id);
      return { success: true };
    }),
});
