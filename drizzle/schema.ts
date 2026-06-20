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

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ServidorPublico = typeof servidoresPublicos.$inferSelect;
export type InsertServidorPublico = typeof servidoresPublicos.$inferInsert;
export type Auditoria = typeof auditoria.$inferSelect;
export type InsertAuditoria = typeof auditoria.$inferInsert;
export type ArchivoCargado = typeof archivosCargados.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
