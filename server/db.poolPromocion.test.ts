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

describe("listarPoolPromocion", () => {
  it("regresa items y metadatos de paginación con el shape correcto", async () => {
    const fila = { servidorId: 5, nombreCompleto: "Ana Lopez", curp: "AAAA000101HDFXXX01" };
    const { tx } = makeTxRecorder([[fila], [{ count: 1 }]], []);
    const fakeDb = { select: tx.select };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { listarPoolPromocion } = await import("./db");
    const resultado = await listarPoolPromocion("jefe", { page: 1, limit: 20 });
    expect(resultado.items).toEqual([fila]);
    expect(resultado.total).toBe(1);
    expect(resultado.totalPages).toBe(1);
  });

  it("filtra por búsqueda escapando comodines LIKE", async () => {
    const { tx, calls } = makeTxRecorder([[], [{ count: 0 }]], []);
    const fakeDb = { select: tx.select };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { listarPoolPromocion } = await import("./db");
    const resultado = await listarPoolPromocion("companero", { search: "50% off_" });
    expect(resultado.items).toEqual([]);
    expect(calls.filter((c) => c === "select")).toHaveLength(2);
  });
});

describe("moverRolPoolPromocion", () => {
  it("regresa NO_ENCONTRADO si el servidor no está en el rol actual", async () => {
    const { tx } = makeTxRecorder([[]], []);
    const fakeDb = { transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { moverRolPoolPromocion } = await import("./db");
    const resultado = await moverRolPoolPromocion(5, "jefe", "companero", 1);
    expect(resultado).toEqual({ ok: false, error: "NO_ENCONTRADO" });
  });

  it("regresa YA_EN_ROL_DESTINO si ya está en el rol destino", async () => {
    const filaActual = { servidorId: 5, rol: "jefe", activo: true, correoSugerido: null };
    const filaDestino = { servidorId: 5, rol: "companero", activo: true, correoSugerido: null };
    const { tx } = makeTxRecorder([[filaActual], [filaDestino]], []);
    const fakeDb = { transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { moverRolPoolPromocion } = await import("./db");
    const resultado = await moverRolPoolPromocion(5, "jefe", "companero", 1);
    expect(resultado).toEqual({ ok: false, error: "YA_EN_ROL_DESTINO" });
  });

  it("mueve de rol: borra la fila vieja e inserta la nueva, preservando correoSugerido", async () => {
    const filaActual = { servidorId: 5, rol: "jefe", activo: true, correoSugerido: "ana@example.com" };
    const { tx, calls } = makeTxRecorder([[filaActual], []], []);
    const fakeDb = { transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { moverRolPoolPromocion } = await import("./db");
    const resultado = await moverRolPoolPromocion(5, "jefe", "companero", 1);
    expect(resultado).toEqual({ ok: true });
    expect(calls).toContain("delete");
    expect(calls).toContain("insert");
  });
});

describe("quitarDelPoolPromocion", () => {
  it("regresa NO_ENCONTRADO si la fila no existe", async () => {
    const { tx } = makeTxRecorder([[]], []);
    const fakeDb = { select: tx.select, delete: tx.delete };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { quitarDelPoolPromocion } = await import("./db");
    const resultado = await quitarDelPoolPromocion(5, "jefe");
    expect(resultado).toEqual({ ok: false, error: "NO_ENCONTRADO" });
  });

  it("quita la fila del pool", async () => {
    const fila = { servidorId: 5, rol: "jefe", activo: true, correoSugerido: null };
    const { tx, calls } = makeTxRecorder([[fila]], []);
    const fakeDb = { select: tx.select, delete: tx.delete };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { quitarDelPoolPromocion } = await import("./db");
    const resultado = await quitarDelPoolPromocion(5, "jefe");
    expect(resultado).toEqual({ ok: true });
    expect(calls).toContain("delete");
  });
});
