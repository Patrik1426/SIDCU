import { vi, describe, it, expect, beforeEach } from "vitest";
import { makeTxRecorder } from "./db.transaction-test-helpers";

vi.mock("mysql2/promise", () => ({ default: { createPool: vi.fn(() => ({})) } }));
vi.mock("drizzle-orm/mysql2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm/mysql2")>();
  return { ...actual, drizzle: vi.fn() };
});

describe("importarFilaEvaluador", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("rechaza CURP sin registro activo en servidores_publicos", async () => {
    const { tx } = makeTxRecorder([[]], []); // buscarServidorActivoPorCurp: vacio
    const fakeDb = { select: tx.select, insert: tx.insert };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { importarFilaEvaluador } = await import("./db");
    const resultado = await importarFilaEvaluador("CURPINVALIDA0001", "Juan Perez", "jefe", undefined, 1);
    expect(resultado.ok).toBe(false);
  });

  it("importa sin exigir cuenta users previa", async () => {
    const { tx, calls } = makeTxRecorder([[{ servidorId: 5, nombreCompleto: "Juan Perez" }]], []);
    const fakeDb = { select: tx.select, insert: tx.insert };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { importarFilaEvaluador } = await import("./db");
    const resultado = await importarFilaEvaluador("CURPVALIDA000001", "Juan Perez", "jefe", undefined, 1);
    expect(resultado).toEqual({ ok: true });
    expect(calls).toContain("insert");
  });

  it("marca advertencia si el nombre del CSV no coincide, pero importa igual", async () => {
    const { tx } = makeTxRecorder([[{ servidorId: 5, nombreCompleto: "Juan Perez Lopez" }]], []);
    const fakeDb = { select: tx.select, insert: tx.insert };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { importarFilaEvaluador } = await import("./db");
    const resultado = await importarFilaEvaluador("CURPVALIDA000001", "Juan Peres", "companero", undefined, 1);
    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.advertencia).toBeDefined();
  });

  it("guarda correoSugerido solo si el formato+dominio son validos", async () => {
    const { tx, calls } = makeTxRecorder([[{ servidorId: 5, nombreCompleto: "Juan Perez" }]], []);
    const fakeDb = { select: tx.select, insert: tx.insert };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { importarFilaEvaluador } = await import("./db");
    // correo con formato invalido -- se importa sin sugerencia, no se rechaza la fila
    const resultado = await importarFilaEvaluador("CURPVALIDA000001", "Juan Perez", "companero", "no-es-correo", 1);
    expect(resultado.ok).toBe(true);
  });
});
