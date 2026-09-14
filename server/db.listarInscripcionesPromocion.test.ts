import { vi, describe, it, expect, beforeEach } from "vitest";
import { makeTxRecorder } from "./db.transaction-test-helpers";

vi.mock("mysql2/promise", () => ({ default: { createPool: vi.fn(() => ({})) } }));
vi.mock("drizzle-orm/mysql2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm/mysql2")>();
  return { ...actual, drizzle: vi.fn() };
});

beforeEach(() => {
  vi.resetModules();
});

describe("listarInscripcionesPromocion", () => {
  it("pagina con LIMIT/OFFSET reales, no carga todo", async () => {
    const filaEjemplo = { id: 1, enviadoAt: new Date(), trabajadorNombre: "Ana", trabajadorCurp: "X", jefeNombre: "Jefe", companero1Nombre: "C1", companero2Nombre: "C2" };
    const { tx } = makeTxRecorder([[filaEjemplo], [{ count: 1 }]], []);
    const fakeDb = { select: tx.select };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { listarInscripcionesPromocion } = await import("./db");
    const resultado = await listarInscripcionesPromocion({ page: 1, limit: 20 });
    expect(resultado.items).toEqual([filaEjemplo]);
    expect(resultado.total).toBe(1);
    expect(resultado.totalPages).toBe(1);
  });
});

describe("reasignarEvaluadorPromocion", () => {
  it("rechaza si el nuevo usuario no tiene cuenta activa", async () => {
    const { tx } = makeTxRecorder([[]], []); // cuenta activa: no encontrada
    const fakeDb = { select: tx.select, transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { reasignarEvaluadorPromocion } = await import("./db");
    const resultado = await reasignarEvaluadorPromocion(1, "companero1", 999, 1);
    expect(resultado).toEqual({ ok: false, error: "USUARIO_INVALIDO" });
  });

  it("rechaza si la promocion no existe", async () => {
    const { tx } = makeTxRecorder([[{ id: 5 }], []], []);
    const fakeDb = { select: tx.select, transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { reasignarEvaluadorPromocion } = await import("./db");
    const resultado = await reasignarEvaluadorPromocion(999, "companero1", 5, 1);
    expect(resultado).toEqual({ ok: false, error: "PROMOCION_NO_ENCONTRADA" });
  });

  it("reasigna y audita en una transaccion", async () => {
    const promoExistente = { id: 1, userId: 1, jefeAsignadoId: 10, companero1Id: 20, companero2Id: 30 };
    const { tx, calls } = makeTxRecorder([[{ id: 5 }], [promoExistente]], []);
    const fakeDb = { select: tx.select, transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { reasignarEvaluadorPromocion } = await import("./db");
    const resultado = await reasignarEvaluadorPromocion(1, "companero1", 5, 1);
    expect(resultado).toEqual({ ok: true });
    expect(calls).toContain("update");
    expect(calls).toContain("insert");
  });
});
