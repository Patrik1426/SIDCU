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
  it("si ya tiene cuenta REAL (evaluadorCuentaExpiraEn null): solo actualiza el correo, nunca toca expiracion/isActive", async () => {
    const { tx, calls, setCalls } = makeTxRecorder([[{ userId: 12, evaluadorCuentaExpiraEn: null }]], [{ insertId: 0 }]);
    const fakeDb = {};
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { asignarEvaluador } = await import("./db");
    const resultado = await asignarEvaluador(tx, 5, "persona@example.com");
    expect(resultado).toEqual({ userId: 12, passwordTemporalEnClaro: null });
    expect(calls).toContain("update");
    expect(calls).not.toContain("insert");
    // Aserción estricta: el payload del update debe ser EXACTAMENTE
    // {email}, sin evaluadorCuentaExpiraEn ni isActive -- una cuenta real
    // jamas debe adquirir esta columna.
    expect(setCalls[0]).toEqual({ email: "persona@example.com" });
  });

  it("si ya tiene cuenta ON-THE-FLY (evaluadorCuentaExpiraEn no null, ej. ya vencida): refresca expiracion 3 dias habiles y reactiva, en el mismo update", async () => {
    const expiroHaceRato = new Date("2020-01-01T00:00:00.000Z");
    const { tx, calls, setCalls } = makeTxRecorder([[{ userId: 12, evaluadorCuentaExpiraEn: expiroHaceRato }]], [{ insertId: 0 }]);
    const fakeDb = {};
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { asignarEvaluador } = await import("./db");
    const antes = Date.now();
    const resultado = await asignarEvaluador(tx, 5, "persona@example.com");
    expect(resultado).toEqual({ userId: 12, passwordTemporalEnClaro: null });
    expect(calls).toContain("update");
    expect(calls).not.toContain("insert");
    expect(setCalls[0].email).toBe("persona@example.com");
    expect(setCalls[0].isActive).toBe(true);
    expect(setCalls[0].evaluadorCuentaExpiraEn).toBeInstanceOf(Date);
    // La nueva expiracion es una ventana fresca desde ahora, no la vieja
    // fecha ya vencida de 2020.
    expect(setCalls[0].evaluadorCuentaExpiraEn.getTime()).toBeGreaterThan(antes);
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

  it("si crea cuenta nueva, no truena y regresa userId + password -- la expiracion real se verifica contra MySQL real en el Task 10", async () => {
    const servidor = { userId: null, curp: "TEST900101HDFRRR01", nombreCompleto: "Prueba Uno" };
    const { tx, calls } = makeTxRecorder([[servidor]], [{ insertId: 55 }]);
    const fakeDb = { select: tx.select, insert: tx.insert, update: tx.update };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { asignarEvaluador } = await import("./db");
    const resultado = await asignarEvaluador(tx as any, 10, "nuevo@ejemplo.com");

    expect(resultado.userId).toBe(55);
    expect(resultado.passwordTemporalEnClaro).not.toBeNull();
    expect(calls).toEqual(["select", "insert", "update"]);
  });
});
