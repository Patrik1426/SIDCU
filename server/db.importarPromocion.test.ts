import { vi, describe, it, expect, beforeEach } from "vitest";
import { makeTxRecorder } from "./db.transaction-test-helpers";

vi.mock("mysql2/promise", () => ({ default: { createPool: vi.fn(() => ({})) } }));
vi.mock("drizzle-orm/mysql2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm/mysql2")>();
  return { ...actual, drizzle: vi.fn() };
});

describe("importarFilaJefe", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("rechaza si el CURP del trabajador no tiene cuenta activa", async () => {
    const { tx } = makeTxRecorder([[]], []); // primer select (trabajador): vacio
    const fakeDb = { select: tx.select, insert: tx.insert };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { importarFilaJefe } = await import("./db");
    const resultado = await importarFilaJefe("CURPTRABAJADOR01", "CURPJEFE00000001", 1);
    expect(resultado.ok).toBe(false);
  });

  it("rechaza si trabajador y jefe son la misma persona", async () => {
    const { tx } = makeTxRecorder([[{ userId: 5 }], [{ userId: 5 }]], []);
    const fakeDb = { select: tx.select, insert: tx.insert };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { importarFilaJefe } = await import("./db");
    const resultado = await importarFilaJefe("CURPX", "CURPX", 1);
    expect(resultado).toEqual({ ok: false, error: "El trabajador no puede ser su propio jefe" });
  });

  it("importa correctamente cuando ambos CURPs son validos", async () => {
    const { tx, calls } = makeTxRecorder([[{ userId: 5 }], [{ userId: 9 }]], []);
    const fakeDb = { select: tx.select, insert: tx.insert };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { importarFilaJefe } = await import("./db");
    const resultado = await importarFilaJefe("CURPTRABAJADOR01", "CURPJEFE00000001", 1);
    expect(resultado).toEqual({ ok: true });
    expect(calls).toContain("insert");
  });
});

describe("importarFilaCompanero", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("rechaza CURP sin cuenta activa", async () => {
    const { tx } = makeTxRecorder([[]], []);
    const fakeDb = { select: tx.select, insert: tx.insert };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { importarFilaCompanero } = await import("./db");
    const resultado = await importarFilaCompanero("CURPINVALIDA0001");
    expect(resultado.ok).toBe(false);
  });

  it("importa correctamente un CURP valido", async () => {
    const { tx } = makeTxRecorder([[{ userId: 5 }]], []);
    const fakeDb = { select: tx.select, insert: tx.insert };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { importarFilaCompanero } = await import("./db");
    const resultado = await importarFilaCompanero("CURPVALIDA000001");
    expect(resultado).toEqual({ ok: true });
  });
});
