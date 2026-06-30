import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { User } from "../drizzle/schema";

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET no está configurado — obligatorio en producción.");
}
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-prod";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(
  user: Pick<User, "id" | "role" | "nombre"> & { email?: string | null },
): string {
  return jwt.sign(
    { id: user.id, email: user.email ?? null, role: user.role, nombre: user.nombre },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}

export function verifyToken(
  token: string,
): { id: number; email: string | null; role: string; nombre: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string | null;
      role: string;
      nombre: string;
    };
  } catch {
    return null;
  }
}
