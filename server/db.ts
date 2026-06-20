import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq, and, like, or, sql, desc } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import type { InsertServidorPublico, InsertAuditoria } from "../drizzle/schema";

let db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!db) {
    const connection = await mysql.createConnection(process.env.DATABASE_URL!);
    db = drizzle(connection, { schema, mode: "default" });
  }
  return db;
}

export async function getUserByEmail(email: string) {
  const d = await getDb();
  const [user] = await d
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email));
  return user ?? null;
}

export async function getUserById(id: number) {
  const d = await getDb();
  const [user] = await d
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id));
  return user ?? null;
}

export async function createUser(data: schema.InsertUser) {
  const d = await getDb();
  const [result] = await d.insert(schema.users).values(data);
  return result.insertId;
}

export async function actualizarPasswordUsuario(
  userId: number,
  passwordHash: string,
) {
  const d = await getDb();
  await d
    .update(schema.users)
    .set({ passwordHash })
    .where(eq(schema.users.id, userId));
}

export async function crearTokenRestablecimiento(
  userId: number,
  token: string,
  expiresAt: Date,
) {
  const d = await getDb();
  await d
    .insert(schema.passwordResetTokens)
    .values({ userId, token, expiresAt });
}

export async function obtenerTokenRestablecimiento(token: string) {
  const d = await getDb();
  const [record] = await d
    .select()
    .from(schema.passwordResetTokens)
    .where(eq(schema.passwordResetTokens.token, token));
  return record ?? null;
}

export async function marcarTokenComoUsado(id: number) {
  const d = await getDb();
  await d
    .update(schema.passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(schema.passwordResetTokens.id, id));
}

// ─── Usuarios (Admin) ────────────────────────────────────────────────

export async function listarUsuarios(search?: string) {
  const d = await getDb();
  const conditions = [];

  if (search) {
    const term = `%${search}%`;
    conditions.push(
      or(
        like(schema.users.nombre, term),
        like(schema.users.email, term),
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await d
    .select()
    .from(schema.users)
    .where(where)
    .orderBy(desc(schema.users.createdAt));

  return items;
}

export async function cambiarRolUsuario(id: number, role: string) {
  const d = await getDb();
  await d
    .update(schema.users)
    .set({ role: role as any, updatedAt: new Date() })
    .where(eq(schema.users.id, id));
}

export async function toggleActivoUsuario(id: number) {
  const d = await getDb();
  const [user] = await d
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id));

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  await d
    .update(schema.users)
    .set({ isActive: !user.isActive, updatedAt: new Date() })
    .where(eq(schema.users.id, id));
}

// ─── Servidores Públicos ─────────────────────────────────────────────

export async function crearServidor(data: InsertServidorPublico) {
  const d = await getDb();
  const [result] = await d.insert(schema.servidoresPublicos).values(data);
  return result.insertId;
}

export async function listarServidores(filtros?: {
  search?: string;
  dependencia?: string;
  nivel?: string;
  estatus?: string;
  grupoFuncion?: string;
  page?: number;
  limit?: number;
}) {
  const d = await getDb();
  const conditions = [];

  if (filtros?.search) {
    const term = `%${filtros.search}%`;
    conditions.push(
      or(
        like(schema.servidoresPublicos.nombreCompleto, term),
        like(schema.servidoresPublicos.rfc, term),
        like(schema.servidoresPublicos.curp, term),
        like(schema.servidoresPublicos.cargo, term),
      ),
    );
  }
  if (filtros?.dependencia) {
    conditions.push(eq(schema.servidoresPublicos.dependencia, filtros.dependencia));
  }
  if (filtros?.nivel) {
    conditions.push(eq(schema.servidoresPublicos.nivel, filtros.nivel as any));
  }
  if (filtros?.estatus) {
    conditions.push(eq(schema.servidoresPublicos.estatus, filtros.estatus as any));
  }
  if (filtros?.grupoFuncion) {
    conditions.push(eq(schema.servidoresPublicos.grupoFuncion, filtros.grupoFuncion as any));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = filtros?.limit ?? 20;
  const page = filtros?.page ?? 1;
  const offset = (page - 1) * limit;

  const [items, countResult] = await Promise.all([
    d
      .select()
      .from(schema.servidoresPublicos)
      .where(where)
      .orderBy(desc(schema.servidoresPublicos.createdAt))
      .limit(limit)
      .offset(offset),
    d
      .select({ count: sql<number>`count(*)` })
      .from(schema.servidoresPublicos)
      .where(where),
  ]);

  return {
    items,
    total: countResult[0]?.count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((countResult[0]?.count ?? 0) / limit),
  };
}

export async function obtenerServidorPorId(id: number) {
  const d = await getDb();
  const [servidor] = await d
    .select()
    .from(schema.servidoresPublicos)
    .where(eq(schema.servidoresPublicos.id, id));
  return servidor ?? null;
}

export async function actualizarServidor(
  id: number,
  data: Partial<InsertServidorPublico>,
) {
  const d = await getDb();
  await d
    .update(schema.servidoresPublicos)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.servidoresPublicos.id, id));
}

export async function eliminarServidor(id: number) {
  const d = await getDb();
  await d
    .delete(schema.servidoresPublicos)
    .where(eq(schema.servidoresPublicos.id, id));
}

export async function getServidoresStats() {
  const d = await getDb();
  const [byEstatus, byNivel, byGrupo, totalResult] = await Promise.all([
    d
      .select({
        estatus: schema.servidoresPublicos.estatus,
        count: sql<number>`count(*)`,
      })
      .from(schema.servidoresPublicos)
      .groupBy(schema.servidoresPublicos.estatus),
    d
      .select({
        nivel: schema.servidoresPublicos.nivel,
        count: sql<number>`count(*)`,
      })
      .from(schema.servidoresPublicos)
      .groupBy(schema.servidoresPublicos.nivel),
    d
      .select({
        grupoFuncion: schema.servidoresPublicos.grupoFuncion,
        count: sql<number>`count(*)`,
      })
      .from(schema.servidoresPublicos)
      .groupBy(schema.servidoresPublicos.grupoFuncion),
    d
      .select({ count: sql<number>`count(*)` })
      .from(schema.servidoresPublicos),
  ]);

  return {
    total: totalResult[0]?.count ?? 0,
    byEstatus,
    byNivel,
    byGrupo,
  };
}

// ─── Auditoría ───────────────────────────────────────────────────────

export async function crearAuditoria(data: InsertAuditoria) {
  const d = await getDb();
  await d.insert(schema.auditoria).values(data);
}

export async function listarAuditoria(filtros?: {
  servidorId?: number;
  usuarioId?: number;
  accion?: string;
  page?: number;
  limit?: number;
}) {
  const d = await getDb();
  const conditions = [];

  if (filtros?.servidorId) {
    conditions.push(eq(schema.auditoria.servidorId, filtros.servidorId));
  }
  if (filtros?.usuarioId) {
    conditions.push(eq(schema.auditoria.usuarioId, filtros.usuarioId));
  }
  if (filtros?.accion) {
    conditions.push(eq(schema.auditoria.accion, filtros.accion as any));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = filtros?.limit ?? 20;
  const page = filtros?.page ?? 1;
  const offset = (page - 1) * limit;

  const [items, countResult] = await Promise.all([
    d
      .select()
      .from(schema.auditoria)
      .where(where)
      .orderBy(desc(schema.auditoria.createdAt))
      .limit(limit)
      .offset(offset),
    d
      .select({ count: sql<number>`count(*)` })
      .from(schema.auditoria)
      .where(where),
  ]);

  return {
    items,
    total: countResult[0]?.count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((countResult[0]?.count ?? 0) / limit),
  };
}
