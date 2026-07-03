import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq, and, like, or, sql, desc, inArray } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import type { InsertServidorPublico, InsertAuditoria } from "../drizzle/schema";
import { dbCircuitBreaker } from "./middleware/circuitBreaker";

let db: ReturnType<typeof drizzle> | null = null;
let pool: mysql.Pool | null = null;

export async function getDb() {
  if (!db) {
    pool = mysql.createPool({
      uri: process.env.DATABASE_URL!,
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 100,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      connectTimeout: 10000,
    });
    db = drizzle(pool, { schema, mode: "default" });
  }
  return db;
}

export async function safeQuery<T>(fn: () => Promise<T>): Promise<T> {
  return dbCircuitBreaker.execute(fn);
}

export async function getUserByEmail(email: string) {
  const d = await getDb();
  const [user] = await d
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email));
  return user ?? null;
}

export async function getUserByCurp(curp: string) {
  const d = await getDb();
  const [user] = await d
    .select()
    .from(schema.users)
    .where(eq(schema.users.curp, curp));
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

  // No seleccionar passwordHash aquí — el listado se manda al frontend en cada
  // carga de página y quedaría expuesto en el Network tab.
  const items = await d
    .select({
      id: schema.users.id,
      nombre: schema.users.nombre,
      curp: schema.users.curp,
      email: schema.users.email,
      role: schema.users.role,
      isActive: schema.users.isActive,
      createdAt: schema.users.createdAt,
      updatedAt: schema.users.updatedAt,
    })
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
  await d.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id));

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    const activar = !user.isActive;

    await tx
      .update(schema.users)
      .set({ isActive: activar, updatedAt: new Date() })
      .where(eq(schema.users.id, id));

    if (!activar) {
      await tx.update(schema.servidoresPublicos)
        .set({ estatus: "inactivo" })
        .where(eq(schema.servidoresPublicos.userId, id));
    }

    if (activar) {
      const [srvExistente] = await tx.select({ id: schema.servidoresPublicos.id })
        .from(schema.servidoresPublicos)
        .where(eq(schema.servidoresPublicos.userId, id));

      if (!srvExistente) {
        await tx.insert(schema.servidoresPublicos).values({
          userId: id,
          nombreCompleto: user.nombre,
          rfc: `UREG${String(id).padStart(9, "0")}`,
          curp: `UREG${String(id).padStart(14, "0")}`,
          cargo: "Por definir",
          dependencia: "Por definir",
          nivel: "federal",
          grupoFuncion: "ADMO",
          fechaIngreso: new Date(),
          datosContacto: user.email,
          estatus: "activo",
          creadoPor: id,
          actualizadoPor: id,
        });
      } else {
        await tx.update(schema.servidoresPublicos)
          .set({ estatus: "activo" })
          .where(eq(schema.servidoresPublicos.id, srvExistente.id));
      }
    }
  });
}

export async function servidorIdDeUsuario(userId: number): Promise<number | null> {
  const d = await getDb();
  const [srv] = await d.select({ id: schema.servidoresPublicos.id })
    .from(schema.servidoresPublicos)
    .where(eq(schema.servidoresPublicos.userId, userId));
  return srv?.id ?? null;
}

export async function resetearPasswordUsuario(id: number, passwordHash: string) {
  const d = await getDb();
  await d.update(schema.users)
    .set({ passwordHash })
    .where(eq(schema.users.id, id));
}

// Elimina el usuario y todo lo que depende exclusivamente de él (perfil, solicitudes).
// El servidor público asociado no se borra — se desvincula y marca inactivo.
export async function eliminarUsuarioCompleto(id: number) {
  const d = await getDb();
  await d.transaction(async (tx) => {
    await tx.update(schema.servidoresPublicos)
      .set({ estatus: "inactivo", userId: null })
      .where(eq(schema.servidoresPublicos.userId, id));
    await tx.delete(schema.perfilesServidor).where(eq(schema.perfilesServidor.userId, id));
    await tx.delete(schema.solicitudesCurso).where(eq(schema.solicitudesCurso.userId, id));
    await tx.delete(schema.users).where(eq(schema.users.id, id));
  });
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
  await d.transaction(async (tx) => {
    const [srv] = await tx.select({ userId: schema.servidoresPublicos.userId }).from(schema.servidoresPublicos).where(eq(schema.servidoresPublicos.id, id));
    await tx.delete(schema.servidoresPublicos).where(eq(schema.servidoresPublicos.id, id));
    if (srv?.userId) {
      await tx.update(schema.users).set({ isActive: false }).where(eq(schema.users.id, srv.userId));
    }
  });
}

export async function eliminarServidoresBulk(ids: number[]) {
  const d = await getDb();
  await d.delete(schema.servidoresPublicos).where(inArray(schema.servidoresPublicos.id, ids));
}

export async function listarTodosIdsServidores(search?: string) {
  const d = await getDb();
  const where = search
    ? or(
        like(schema.servidoresPublicos.nombreCompleto, `%${search}%`),
        like(schema.servidoresPublicos.rfc, `%${search}%`),
        like(schema.servidoresPublicos.curp, `%${search}%`),
      )
    : undefined;
  const rows = await d.select({ id: schema.servidoresPublicos.id }).from(schema.servidoresPublicos).where(where);
  return rows.map((r) => r.id);
}

export async function obtenerServidorPorUserId(userId: number) {
  const d = await getDb();
  const [srv] = await d.select().from(schema.servidoresPublicos)
    .where(eq(schema.servidoresPublicos.userId, userId));
  return srv ?? null;
}

export async function listarUpasDistintas() {
  const d = await getDb();
  const rows = await d.selectDistinct({ upa: schema.servidoresPublicos.upa }).from(schema.servidoresPublicos);
  const upas = rows.map((r) => r.upa).filter(Boolean) as string[];
  if (!upas.includes("CULTURA")) upas.push("CULTURA");
  if (!upas.includes("RE")) upas.push("RE");
  if (!upas.includes("INDAUTOR")) upas.push("INDAUTOR");
  return [...new Set(upas)].sort();
}

export async function listarUasDistintas() {
  const d = await getDb();
  const rows = await d.selectDistinct({ ua: schema.servidoresPublicos.ua }).from(schema.servidoresPublicos);
  return (rows.map((r) => r.ua).filter(Boolean) as string[]).sort();
}

export async function getServidoresStats() {
  const d = await getDb();
  const [byEstatus, byNivel, byGrupo, totalResult, byDependencia, byMes, solicitudesPendientesResult] = await Promise.all([
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
    d
      .select({ count: sql<number>`count(*)` })
      .from(schema.solicitudesCurso)
      .where(eq(schema.solicitudesCurso.estado, "pendiente")),
  ]);

  return {
    total: totalResult[0]?.count ?? 0,
    byEstatus,
    byNivel,
    byGrupo,
    byDependencia,
    byMes,
    solicitudesPendientes: solicitudesPendientesResult[0]?.count ?? 0,
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
  if (!perfil || perfil.nivelProgresion >= 5) return;
  await d
    .update(schema.perfilesServidor)
    .set({ nivelProgresion: perfil.nivelProgresion + 1 })
    .where(eq(schema.perfilesServidor.userId, userId));
}

export async function listarSolicitudesBaja() {
  const d = await getDb();
  // No usar select() plano aquí — el join trae users.passwordHash al JSON enviado al navegador.
  return d
    .select({
      perfiles_servidor: schema.perfilesServidor,
      users: {
        id: schema.users.id,
        nombre: schema.users.nombre,
        curp: schema.users.curp,
        email: schema.users.email,
        role: schema.users.role,
        isActive: schema.users.isActive,
      },
    })
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
  return d.select().from(schema.cursos).where(where).orderBy(desc(schema.cursos.createdAt)).limit(500);
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

export async function eliminarCurso(id: number) {
  const d = await getDb();
  await d.transaction(async (tx) => {
    await tx.delete(schema.cursosInstituciones).where(eq(schema.cursosInstituciones.cursoId, id));
    await tx.delete(schema.cursos).where(eq(schema.cursos.id, id));
  });
}

// Catálogo de finalidades ya usadas, para evitar nombres distintos para lo mismo
export async function listarFinalidadesCursos() {
  const d = await getDb();
  const rows = await d.selectDistinct({ finalidad: schema.cursos.finalidad }).from(schema.cursos);
  return (rows.map((r) => r.finalidad).filter(Boolean) as string[]).sort();
}

export async function buscarCursoPorNombre(nombre: string) {
  const d = await getDb();
  const [curso] = await d.select({ id: schema.cursos.id }).from(schema.cursos)
    .where(eq(schema.cursos.nombre, nombre));
  return curso ?? null;
}

// Busca institución por nombre (case/espacio-insensible); si no existe, la crea.
export async function buscarOCrearInstitucionPorNombre(nombre: string) {
  const d = await getDb();
  const nombreNormalizado = nombre.trim().toLowerCase();
  const [existente] = await d.select({ id: schema.instituciones.id })
    .from(schema.instituciones)
    .where(sql`LOWER(TRIM(${schema.instituciones.nombre})) = ${nombreNormalizado}`);

  if (existente) return existente.id;

  const [resultado] = await d.insert(schema.instituciones).values({
    nombre: nombre.trim(),
    activo: true,
  });
  return (resultado as any).insertId as number;
}

// ─── Instituciones ───────────────────────────────────────────────────

export async function listarInstituciones(soloActivas = true) {
  const d = await getDb();
  const where = soloActivas ? eq(schema.instituciones.activo, true) : undefined;
  return d.select().from(schema.instituciones).where(where).orderBy(desc(schema.instituciones.createdAt)).limit(500);
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

export async function eliminarInstitucion(id: number) {
  const d = await getDb();
  await d.transaction(async (tx) => {
    await tx.delete(schema.cursosInstituciones).where(eq(schema.cursosInstituciones.institucionId, id));
    await tx.delete(schema.instituciones).where(eq(schema.instituciones.id, id));
  });
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
  // No usar select() plano aquí — el join trae users.passwordHash al JSON enviado al navegador.
  return d
    .select({
      solicitudes_curso: schema.solicitudesCurso,
      cursos: schema.cursos,
      users: {
        id: schema.users.id,
        nombre: schema.users.nombre,
        curp: schema.users.curp,
        email: schema.users.email,
        role: schema.users.role,
        isActive: schema.users.isActive,
      },
    })
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
