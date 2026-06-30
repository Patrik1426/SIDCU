import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { hashPassword } from "../auth";
import {
  listarUsuarios,
  cambiarRolUsuario,
  toggleActivoUsuario,
  getUserByEmail,
  createUser,
  crearServidor,
  crearAuditoria,
  getDb,
} from "../db";
import { eq } from "drizzle-orm";
import * as schema from "../../drizzle/schema";

async function servidorIdDeUsuario(userId: number): Promise<number | null> {
  const d = await getDb();
  const [srv] = await d.select({ id: schema.servidoresPublicos.id })
    .from(schema.servidoresPublicos)
    .where(eq(schema.servidoresPublicos.userId, userId));
  return srv?.id ?? null;
}

export const usuariosRouter = router({
  crear: adminProcedure
    .input(
      z.object({
        nombre: z.string().min(2, "Nombre requerido"),
        email: z.string().email("Email inválido"),
        password: z.string().min(8, "Mínimo 8 caracteres"),
        role: z.enum(["admin", "capturista", "consultor", "user"]),
      }),
    )
    .mutation(async ({ input }) => {
      const existing = await getUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email ya registrado",
        });
      }
      const hash = await hashPassword(input.password);
      const id = await createUser({
        nombre: input.nombre,
        email: input.email,
        passwordHash: hash,
        role: input.role,
      });
      await crearServidor({
        userId: id,
        nombreCompleto: input.nombre,
        rfc: `UREG${String(id).padStart(9, "0")}`,
        curp: `UREG${String(id).padStart(14, "0")}`,
        cargo: "Por definir",
        dependencia: "Por definir",
        nivel: "federal",
        grupoFuncion: "ADMO",
        fechaIngreso: new Date(),
        datosContacto: input.email,
        upa: null,
        cmao: null,
        ua: null,
        nivelProgresion: 0,
        estatus: "activo",
        creadoPor: id,
        actualizadoPor: id,
      });
      return { success: true, id };
    }),

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

  // No existe endpoint para "ver" la contraseña anterior — nunca se almacena en texto
  // plano. Si la olvidaron, el admin asigna una nueva con este endpoint.
  resetearPassword: adminProcedure
    .input(z.object({ id: z.number(), password: z.string().min(8, "Mínimo 8 caracteres") }))
    .mutation(async ({ input, ctx }) => {
      const d = await getDb();

      const hash = await hashPassword(input.password);
      await d.update(schema.users)
        .set({ passwordHash: hash })
        .where(eq(schema.users.id, input.id));

      await crearAuditoria({
        servidorId: await servidorIdDeUsuario(input.id),
        usuarioId: ctx.user.id,
        accion: "actualizar",
        cambiosAnteriores: null,
        cambiosPosterior: null,
        descripcion: `${ctx.user.nombre} restableció la contraseña del usuario #${input.id}`,
      } as any);

      return { success: true };
    }),

  eliminar: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (input.id === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No puedes eliminar tu propia cuenta" });
      }
      const { getDb } = await import("../db");
      const schema = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const d = await getDb();

      await d.update(schema.servidoresPublicos)
        .set({ estatus: "inactivo", userId: null })
        .where(eq(schema.servidoresPublicos.userId, input.id));

      await d.delete(schema.perfilesServidor).where(eq(schema.perfilesServidor.userId, input.id));
      await d.delete(schema.solicitudesCurso).where(eq(schema.solicitudesCurso.userId, input.id));
      await d.delete(schema.users).where(eq(schema.users.id, input.id));
      return { success: true };
    }),
});
