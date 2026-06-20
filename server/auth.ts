import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { User } from "../drizzle/schema";

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
  user: Pick<User, "id" | "email" | "role">,
): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}

export function verifyToken(
  token: string,
): { id: number; email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      role: string;
    };
  } catch {
    return null;
  }
}
