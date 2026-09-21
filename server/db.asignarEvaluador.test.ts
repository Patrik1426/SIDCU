import { vi, describe, it, expect, beforeEach } from "vitest";
import { makeTxRecorder } from "./db.transaction-test-helpers";

vi.mock("mysql2/promise", () => ({ default: { createPool: vi.fn(() => ({})) } }));
vi.mock("drizzle-orm/mysql2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm/mysql2")>();
  return { ...actual, drizzle: vi.fn() };
});
vi.mock("./auth", () => ({
  generarPasswordTemporal: vi.fn(() => "PASSTEMP12AB"),
  hashPassword: vi.fn(async () => "hash-simulado"),
}));

beforeEach(() => {
  vi.resetModules();
});

describe("asignarEvaluador", () => {
  it("si ya tiene cuenta: solo actualiza el correo, no genera password", async () => {
    const { tx, calls } = makeTxRecorder([[{ userId: 12 }]], [{ insertId: 0 }]);
    const fakeDb = {};
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { asignarEvaluador } = await import("./db");
    const resultado = await asignarEvaluador(tx, 5, "persona@example.com");
    expect(resultado).toEqual({ userId: 12, passwordTemporalEnClaro: null });
    expect(calls).toContain("update");
    expect(calls).not.toContain("insert");
  });

  it("si NO tiene cuenta: crea usuario con password temporal (única, no forzada a cambiar)", async () => {
    const { tx, calls } = makeTxRecorder([[{ userId: null, curp: "AAAA000101HDFXXX01", nombreCompleto: "Ana Lopez" }]], [{ insertId: 77 }]);
    const fakeDb = {};
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { asignarEvaluador } = await import("./db");
    const resultado = await asignarEvaluador(tx, 6, "ana@example.com");
    expect(resultado).toEqual({ userId: 77, passwordTemporalEnClaro: "PASSTEMP12AB" });
    expect(calls).toContain("insert"); // users
    expect(calls).toContain("update"); // servidoresPublicos.userId
  });
});
