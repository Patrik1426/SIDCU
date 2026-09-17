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
  // El mock de makeTxRecorder regresa arrays pre-encolados sin importar los
  // argumentos reales de .limit()/.offset() -- este test solo prueba el
  // shape del resultado dado un mock, no el LIMIT/OFFSET real. El
  // comportamiento real de paginacion se verifico en vivo contra MySQL real
  // en el Task 9 de este plan (ver progress.md).
  it("regresa items y metadatos de paginación con el shape correcto", async () => {
    const filaEjemplo = { id: 1, enviadoAt: new Date(), trabajadorNombre: "Ana", trabajadorCurp: "X", jefeNombre: "Jefe", companero1Nombre: "C1", companero2Nombre: "C2" };
    const { tx } = makeTxRecorder([[filaEjemplo], [{ count: 1 }], [{ count: 0 }]], []);
    const fakeDb = { select: tx.select };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { listarInscripcionesPromocion } = await import("./db");
    const resultado = await listarInscripcionesPromocion({ page: 1, limit: 20 });
    expect(resultado.items).toEqual([filaEjemplo]);
    expect(resultado.total).toBe(1);
    expect(resultado.totalPages).toBe(1);
    expect(resultado.conReferenciaRota).toBe(0);
  });

  it("cuenta inscripciones con referencia de evaluador rota, sin importar el filtro de busqueda", async () => {
    const { tx } = makeTxRecorder([[], [{ count: 0 }], [{ count: 3 }]], []);
    const fakeDb = { select: tx.select };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { listarInscripcionesPromocion } = await import("./db");
    const resultado = await listarInscripcionesPromocion({ search: "algo que no matchea nada", page: 1, limit: 20 });
    expect(resultado.conReferenciaRota).toBe(3);
  });
});

describe("reasignarEvaluadorPromocion", () => {
  it("rechaza si el nuevo servidor no esta en el pool del rol correcto", async () => {
    const { tx } = makeTxRecorder([[]], []); // servidorEnPool: no encontrado
    const fakeDb = { select: tx.select, transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { reasignarEvaluadorPromocion } = await import("./db");
    const resultado = await reasignarEvaluadorPromocion(1, "companero1", 999, "nuevo@example.com", 1);
    expect(resultado).toEqual({ ok: false, error: "SELECCION_INVALIDA" });
  });

  it("rechaza si la promocion no existe", async () => {
    const { tx } = makeTxRecorder([[{ servidorId: 5 }], []], []);
    const fakeDb = { select: tx.select, transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { reasignarEvaluadorPromocion } = await import("./db");
    const resultado = await reasignarEvaluadorPromocion(999, "companero1", 5, "nuevo@example.com", 1);
    expect(resultado).toEqual({ ok: false, error: "PROMOCION_NO_ENCONTRADA" });
  });

  it("reasigna via asignarEvaluador y audita en una transaccion", async () => {
    const promoExistente = { id: 1, userId: 1, jefeAsignadoId: 10, companero1Id: 20, companero2Id: 30 };
    const { tx, calls } = makeTxRecorder([
      [{ servidorId: 5 }], // servidorEnPool: valido
      [promoExistente],
      [{ userId: 55 }], // chequeo de conflicto pre-asignarEvaluador: ya vinculado, sin conflicto
      [{ userId: 55 }], // asignarEvaluador: select interno, ya tiene cuenta
    ], []);
    const fakeDb = { select: tx.select, transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { reasignarEvaluadorPromocion } = await import("./db");
    const resultado = await reasignarEvaluadorPromocion(1, "companero1", 5, "nuevo@example.com", 1);
    expect(resultado).toEqual({ ok: true });
    expect(calls).toContain("update");
    expect(calls).toContain("insert");
  });

  it("rechaza por conflicto SIN llamar asignarEvaluador si el servidor ya vinculado coincide con otro puesto (no debe tocar users.email)", async () => {
    // Regresion del hallazgo de revision: antes, el chequeo de conflicto corria
    // DESPUES de asignarEvaluador, asi que un UPDATE users.email ya commiteado
    // sobrevivia aunque la reasignacion se rechazara. Ahora el chequeo usa el
    // userId ya vinculado en servidoresPublicos (un simple select) ANTES de
    // tocar asignarEvaluador -- si hay conflicto, no debe haber ningun "update".
    const promoExistente = { id: 1, userId: 1, jefeAsignadoId: 10, companero1Id: 20, companero2Id: 30 };
    const { tx, calls } = makeTxRecorder([
      [{ servidorId: 5 }], // servidorEnPool: valido
      [promoExistente],
      [{ userId: 30 }], // servidoresPublicos.userId ya vinculado: coincide con companero2Id -> conflicto
    ], []);
    const fakeDb = { select: tx.select, transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { reasignarEvaluadorPromocion } = await import("./db");
    const resultado = await reasignarEvaluadorPromocion(1, "companero1", 5, "nuevo@example.com", 1);
    expect(resultado).toEqual({ ok: false, error: "SELECCION_INVALIDA" });
    expect(calls).not.toContain("update");
    expect(calls).not.toContain("insert");
  });
});
