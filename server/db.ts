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
  const [byEstatus, byNivel, byGrupo, totalResult, byDependencia, byMes] = await Promise.all([
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
    d
      .select({
        dependencia: schema.servidoresPublicos.dependencia,
        count: sql<number>`count(*)`,
      })
      .from(schema.servidoresPublicos)
      .groupBy(schema.servidoresPublicos.dependencia)
      .orderBy(sql`count(*) DESC`)
      .limit(10),
    d
      .select({
        mes: sql<string>`DATE_FORMAT(created_at, '%Y-%m')`,
        count: sql<number>`count(*)`,
      })
      .from(schema.servidoresPublicos)
      .groupBy(sql`DATE_FORMAT(created_at, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(created_at, '%Y-%m') ASC`)
      .limit(12),
  ]);

  return {
    total: totalResult[0]?.count ?? 0,
    byEstatus,
    byNivel,
    byGrupo,
    byDependencia,
    byMes,
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

// ─── Perfiles Servidor ───────────────────────────────────────────────

export async function obtenerPerfil(userId: number) {
  const d = await getDb();
  const [perfil] = await d
    .select()
    .from(schema.perfilesServidor)
    .where(eq(schema.perfilesServidor.userId, userId));
  return perfil ?? null;
}

export async function crearPerfil(data: schema.InsertPerfilServidor) {
  const d = await getDb();
  const [result] = await d.insert(schema.perfilesServidor).values(data);
  return result.insertId;
}

export async function actualizarPerfil(userId: number, data: Partial<schema.InsertPerfilServidor>) {
  const d = await getDb();
  await d
    .update(schema.perfilesServidor)
    .set(data)
    .where(eq(schema.perfilesServidor.userId, userId));
}

export async function incrementarNivelProgresion(userId: number) {
  const d = await getDb();
  const perfil = await obtenerPerfil(userId);
  if (!perfil || perfil.nivelProgresion >= 4) return;
  await d
    .update(schema.perfilesServidor)
    .set({ nivelProgresion: perfil.nivelProgresion + 1 })
    .where(eq(schema.perfilesServidor.userId, userId));
}

export async function listarSolicitudesBaja() {
  const d = await getDb();
  return d
    .select()
    .from(schema.perfilesServidor)
    .innerJoin(schema.users, eq(schema.perfilesServidor.userId, schema.users.id))
    .where(eq(schema.perfilesServidor.solicitudBaja, true))
    .orderBy(desc(schema.perfilesServidor.fechaSolicitudBaja));
}

// ─── Cursos ──────────────────────────────────────────────────────────

export async function listarCursos(filtros?: {
  nivelMax?: number;
  nivelGobierno?: string | null;
  categoria?: string;
  modalidad?: string;
  soloActivos?: boolean;
}) {
  const d = await getDb();
  const conditions = [];

  if (filtros?.soloActivos !== false) {
    conditions.push(eq(schema.cursos.activo, true));
  }
  if (filtros?.nivelMax) {
    conditions.push(sql`${schema.cursos.nivelRequerido} <= ${filtros.nivelMax}`);
  }
  if (filtros?.nivelGobierno) {
    conditions.push(
      or(
        eq(schema.cursos.nivelGobierno, filtros.nivelGobierno as any),
        sql`${schema.cursos.nivelGobierno} IS NULL`,
      )!,
    );
  }
  if (filtros?.categoria) {
    conditions.push(eq(schema.cursos.categoria, filtros.categoria));
  }
  if (filtros?.modalidad) {
    conditions.push(eq(schema.cursos.modalidad, filtros.modalidad as any));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return d.select().from(schema.cursos).where(where).orderBy(desc(schema.cursos.createdAt));
}

export async function obtenerCursoPorId(id: number) {
  const d = await getDb();
  const [curso] = await d.select().from(schema.cursos).where(eq(schema.cursos.id, id));
  return curso ?? null;
}

export async function crearCurso(data: schema.InsertCurso) {
  const d = await getDb();
  const [result] = await d.insert(schema.cursos).values(data);
  return result.insertId;
}

export async function actualizarCurso(id: number, data: Partial<schema.InsertCurso>) {
  const d = await getDb();
  await d.update(schema.cursos).set(data).where(eq(schema.cursos.id, id));
}

export async function toggleActivoCurso(id: number) {
  const d = await getDb();
  const [curso] = await d.select().from(schema.cursos).where(eq(schema.cursos.id, id));
  if (!curso) return;
  await d.update(schema.cursos).set({ activo: !curso.activo }).where(eq(schema.cursos.id, id));
}

// ─── Instituciones ───────────────────────────────────────────────────

export async function listarInstituciones(soloActivas = true) {
  const d = await getDb();
  const where = soloActivas ? eq(schema.instituciones.activo, true) : undefined;
  return d.select().from(schema.instituciones).where(where).orderBy(desc(schema.instituciones.createdAt));
}

export async function crearInstitucion(data: schema.InsertInstitucion) {
  const d = await getDb();
  const [result] = await d.insert(schema.instituciones).values(data);
  return result.insertId;
}

export async function actualizarInstitucion(id: number, data: Partial<schema.InsertInstitucion>) {
  const d = await getDb();
  await d.update(schema.instituciones).set(data).where(eq(schema.instituciones.id, id));
}

export async function toggleActivoInstitucion(id: number) {
  const d = await getDb();
  const [inst] = await d.select().from(schema.instituciones).where(eq(schema.instituciones.id, id));
  if (!inst) return;
  await d.update(schema.instituciones).set({ activo: !inst.activo }).where(eq(schema.instituciones.id, id));
}

// ─── Cursos ↔ Instituciones ──────────────────────────────────────────

export async function listarCursosInstituciones(cursoId: number) {
  const d = await getDb();
  return d
    .select()
    .from(schema.cursosInstituciones)
    .innerJoin(schema.instituciones, eq(schema.cursosInstituciones.institucionId, schema.instituciones.id))
    .where(and(eq(schema.cursosInstituciones.cursoId, cursoId), eq(schema.cursosInstituciones.activo, true)));
}

export async function asignarCursoInstitucion(data: schema.InsertCursoInstitucion) {
  const d = await getDb();
  const [result] = await d.insert(schema.cursosInstituciones).values(data);
  return result.insertId;
}

export async function eliminarCursoInstitucion(id: number) {
  const d = await getDb();
  await d.delete(schema.cursosInstituciones).where(eq(schema.cursosInstituciones.id, id));
}

export async function decrementarCupo(cursoInstitucionId: number) {
  const d = await getDb();
  await d.execute(
    sql`UPDATE cursos_instituciones SET cupo_disponible = cupo_disponible - 1 WHERE id = ${cursoInstitucionId} AND cupo_disponible > 0`,
  );
}

// ─── Solicitudes Curso ───────────────────────────────────────────────

export async function crearSolicitud(data: schema.InsertSolicitudCurso) {
  const d = await getDb();
  const [result] = await d.insert(schema.solicitudesCurso).values(data);
  return result.insertId;
}

export async function listarSolicitudesUsuario(userId: number) {
  const d = await getDb();
  return d
    .select()
    .from(schema.solicitudesCurso)
    .innerJoin(schema.cursos, eq(schema.solicitudesCurso.cursoId, schema.cursos.id))
    .leftJoin(schema.cursosInstituciones, eq(schema.solicitudesCurso.cursoInstitucionId, schema.cursosInstituciones.id))
    .leftJoin(schema.instituciones, eq(schema.cursosInstituciones.institucionId, schema.instituciones.id))
    .where(eq(schema.solicitudesCurso.userId, userId))
    .orderBy(desc(schema.solicitudesCurso.createdAt));
}

export async function listarTodasSolicitudes(filtros?: { estado?: string }) {
  const d = await getDb();
  const conditions = [];
  if (filtros?.estado) {
    conditions.push(eq(schema.solicitudesCurso.estado, filtros.estado as any));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return d
    .select()
    .from(schema.solicitudesCurso)
    .innerJoin(schema.cursos, eq(schema.solicitudesCurso.cursoId, schema.cursos.id))
    .innerJoin(schema.users, eq(schema.solicitudesCurso.userId, schema.users.id))
    .where(where)
    .orderBy(desc(schema.solicitudesCurso.createdAt));
}

export async function obtenerSolicitud(id: number) {
  const d = await getDb();
  const [sol] = await d.select().from(schema.solicitudesCurso).where(eq(schema.solicitudesCurso.id, id));
  return sol ?? null;
}

export async function actualizarSolicitud(id: number, data: Partial<schema.InsertSolicitudCurso>) {
  const d = await getDb();
  await d.update(schema.solicitudesCurso).set(data).where(eq(schema.solicitudesCurso.id, id));
}

export async function tieneSolicitudActiva(userId: number, cursoId: number) {
  const d = await getDb();
  const [existing] = await d
    .select({ id: schema.solicitudesCurso.id })
    .from(schema.solicitudesCurso)
    .where(
      and(
        eq(schema.solicitudesCurso.userId, userId),
        eq(schema.solicitudesCurso.cursoId, cursoId),
        or(
          eq(schema.solicitudesCurso.estado, "pendiente"),
          eq(schema.solicitudesCurso.estado, "aprobada"),
        ),
      ),
    );
  return !!existing;
}
