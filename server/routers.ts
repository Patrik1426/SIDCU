import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { hashPassword, verifyPassword, generateToken } from "./auth";
import {
  getUserByEmail,
  createUser,
  crearTokenRestablecimiento,
  obtenerTokenRestablecimiento,
  actualizarPasswordUsuario,
  marcarTokenComoUsado,
} from "./db";
import { COOKIE_NAME } from "../shared/const";
import { router, publicProcedure, protectedProcedure } from "./trpc";
import { servidoresRouter } from "./routers/servidores";
import { usuariosRouter } from "./routers/usuarios";

export { router, publicProcedure };

const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        nombre: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(8),
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
        role: "user",
      });
      return { success: true, id };
    }),

  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await getUserByEmail(input.email);
      if (
        !user ||
        !(await verifyPassword(input.password, user.passwordHash))
      ) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Credenciales invalidas",
        });
      }
      const token = generateToken(user);
      ctx.res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      return {
        success: true,
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          role: user.role,
        },
      };
    }),

  me: publicProcedure.query(({ ctx }) => ctx.user ?? null),

  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME);
    return { success: true };
  }),

  solicitarRestablecimiento: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const user = await getUserByEmail(input.email);
      if (!user) return { success: true }; // don't reveal if user exists
      const token = randomBytes(32).toString("hex");
      await crearTokenRestablecimiento(
        user.id,
        token,
        new Date(Date.now() + 24 * 60 * 60 * 1000),
      );
      // TODO: send email with reset link
      return { success: true };
    }),

  restablecerContrasena: publicProcedure
    .input(z.object({ token: z.string(), password: z.string().min(8) }))
    .mutation(async ({ input }) => {
      const record = await obtenerTokenRestablecimiento(input.token);
      if (!record || record.usedAt || new Date() > record.expiresAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Token invalido o expirado",
        });
      }
      const hash = await hashPassword(input.password);
      await actualizarPasswordUsuario(record.userId, hash);
      await marcarTokenComoUsado(record.id);
      return { success: true };
    }),
});

export const appRouter = router({
  auth: authRouter,
  servidores: servidoresRouter,
  usuarios: usuariosRouter,
});

export type AppRouter = typeof appRouter;
