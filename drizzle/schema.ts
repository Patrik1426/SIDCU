import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, bigint, index } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "capturista", "consultor", "user"]).default("user").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("last_signed_in"),
});

export const servidoresPublicos = mysqlTable("servidores_publicos", {
  id: int("id").autoincrement().primaryKey(),
  nombreCompleto: varchar("nombre_completo", { length: 255 }).notNull(),
  rfc: varchar("rfc", { length: 13 }).notNull().unique(),
  curp: varchar("curp", { length: 18 }).notNull().unique(),
  cargo: varchar("cargo", { length: 255 }).notNull(),
  dependencia: varchar("dependencia", { length: 255 }).notNull(),
  nivel: mysqlEnum("nivel", ["federal", "estatal", "municipal", "otro"]).notNull(),
  fechaIngreso: timestamp("fecha_ingreso").notNull(),
  datosContacto: varchar("datos_contacto", { length: 255 }),
  grupoFuncion: mysqlEnum("grupo_funcion", ["ADMO", "TECN", "SERV", "COMUN", "PROFE", "EDU"]).notNull(),
  estatus: mysqlEnum("estatus", ["activo", "inactivo"]).default("activo").notNull(),
  observaciones: text("observaciones"),
  creadoPor: int("creado_por").notNull(),
  actualizadoPor: int("actualizado_por").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  rfcIdx: index("rfc_idx").on(table.rfc),
  curpIdx: index("curp_idx").on(table.curp),
  dependenciaIdx: index("dependencia_idx").on(table.dependencia),
  nivelIdx: index("nivel_idx").on(table.nivel),
  grupoFuncionIdx: index("grupo_funcion_idx").on(table.grupoFuncion),
  estatusIdx: index("estatus_idx").on(table.estatus),
}));

export const auditoria = mysqlTable("auditoria", {
  id: int("id").autoincrement().primaryKey(),
  servidorId: int("servidor_id").notNull(),
  usuarioId: int("usuario_id").notNull(),
  accion: mysqlEnum("accion", ["crear", "actualizar", "eliminar"]).notNull(),
  cambiosAnteriores: text("cambios_anteriores"),
  cambiosPosterior: text("cambios_posterior"),
  descripcion: text("descripcion"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  servidorIdIdx: index("servidor_id_idx").on(table.servidorId),
  usuarioIdIdx: index("usuario_id_idx").on(table.usuarioId),
  fechaIdx: index("fecha_idx").on(table.createdAt),
}));

export const archivosCargados = mysqlTable("archivos_cargados", {
  id: int("id").autoincrement().primaryKey(),
  nombreOriginal: varchar("nombre_original", { length: 255 }).notNull(),
  tipoArchivo: varchar("tipo_archivo", { length: 50 }).notNull(),
  tamanoBytes: bigint("tamano_bytes", { mode: "number" }).notNull(),
  s3Key: varchar("s3_key", { length: 500 }).notNull(),
  s3Url: text("s3_url").notNull(),
  cargadoPor: int("cargado_por").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const perfilesServidor = mysqlTable("perfiles_servidor", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  rfc: varchar("rfc", { length: 13 }).notNull(),
  curp: varchar("curp", { length: 18 }).notNull(),
  cargo: varchar("cargo", { length: 255 }).notNull(),
  dependencia: varchar("dependencia", { length: 255 }).notNull(),
  nivelGobierno: mysqlEnum("nivel_gobierno", ["federal", "estatal", "municipal", "otro"]).notNull(),
  grupoFuncion: mysqlEnum("grupo_funcion", ["ADMO", "TECN", "SERV", "COMUN", "PROFE", "EDU"]).notNull(),
  nivelProgresion: int("nivel_progresion").default(1).notNull(),
  fechaIngreso: timestamp("fecha_ingreso").notNull(),
  datosContacto: varchar("datos_contacto", { length: 255 }),
  completado: boolean("completado").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("perfil_user_id_idx").on(table.userId),
  nivelGobiernoIdx: index("perfil_nivel_gobierno_idx").on(table.nivelGobierno),
  nivelProgresionIdx: index("perfil_nivel_progresion_idx").on(table.nivelProgresion),
}));

export const cursos = mysqlTable("cursos", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  descripcion: text("descripcion"),
  nivelRequerido: int("nivel_requerido").default(1).notNull(),
  nivelGobierno: mysqlEnum("nivel_gobierno", ["federal", "estatal", "municipal", "otro"]),
  categoria: varchar("categoria", { length: 100 }).notNull(),
  duracionHoras: int("duracion_horas").notNull(),
  modalidad: mysqlEnum("modalidad", ["presencial", "virtual", "mixto"]).notNull(),
  activo: boolean("activo").default(true).notNull(),
  creadoPor: int("creado_por").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  nivelRequeridoIdx: index("curso_nivel_requerido_idx").on(table.nivelRequerido),
  nivelGobiernoIdx: index("curso_nivel_gobierno_idx").on(table.nivelGobierno),
  categoriaIdx: index("curso_categoria_idx").on(table.categoria),
  activoIdx: index("curso_activo_idx").on(table.activo),
}));

export const instituciones = mysqlTable("instituciones", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  direccion: text("direccion"),
  contacto: varchar("contacto", { length: 255 }),
  telefono: varchar("telefono", { length: 20 }),
  email: varchar("email", { length: 320 }),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cursosInstituciones = mysqlTable("cursos_instituciones", {
  id: int("id").autoincrement().primaryKey(),
  cursoId: int("curso_id").notNull(),
  institucionId: int("institucion_id").notNull(),
  cupoMaximo: int("cupo_maximo").notNull(),
  cupoDisponible: int("cupo_disponible").notNull(),
  horario: varchar("horario", { length: 255 }),
  fechaInicio: timestamp("fecha_inicio"),
  fechaFin: timestamp("fecha_fin"),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  cursoIdIdx: index("ci_curso_id_idx").on(table.cursoId),
  institucionIdIdx: index("ci_institucion_id_idx").on(table.institucionId),
  activoIdx: index("ci_activo_idx").on(table.activo),
}));

export const solicitudesCurso = mysqlTable("solicitudes_curso", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  cursoId: int("curso_id").notNull(),
  cursoInstitucionId: int("curso_institucion_id"),
  estado: mysqlEnum("estado", ["pendiente", "aprobada", "rechazada", "completada"]).default("pendiente").notNull(),
  notasAdmin: text("notas_admin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("sol_user_id_idx").on(table.userId),
  cursoIdIdx: index("sol_curso_id_idx").on(table.cursoId),
  estadoIdx: index("sol_estado_idx").on(table.estado),
  createdAtIdx: index("sol_created_at_idx").on(table.createdAt),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ServidorPublico = typeof servidoresPublicos.$inferSelect;
export type InsertServidorPublico = typeof servidoresPublicos.$inferInsert;
export type Auditoria = typeof auditoria.$inferSelect;
export type InsertAuditoria = typeof auditoria.$inferInsert;
export type ArchivoCargado = typeof archivosCargados.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type PerfilServidor = typeof perfilesServidor.$inferSelect;
export type InsertPerfilServidor = typeof perfilesServidor.$inferInsert;
export type Curso = typeof cursos.$inferSelect;
export type InsertCurso = typeof cursos.$inferInsert;
export type Institucion = typeof instituciones.$inferSelect;
export type InsertInstitucion = typeof instituciones.$inferInsert;
export type CursoInstitucion = typeof cursosInstituciones.$inferSelect;
export type InsertCursoInstitucion = typeof cursosInstituciones.$inferInsert;
export type SolicitudCurso = typeof solicitudesCurso.$inferSelect;
export type InsertSolicitudCurso = typeof solicitudesCurso.$inferInsert;
