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

  it("importa sin exigir que el CURP ya exista en servidores_publicos (rediseño 2026-09-26)", async () => {
    const { tx, calls } = makeTxRecorder([], []);
    const fakeDb = { insert: tx.insert };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { importarFilaEvaluador } = await import("./db");
    const resultado = await importarFilaEvaluador("CURPVALIDA000001", "Juan Perez", "jefe", undefined, 1);
    expect(resultado).toEqual({ ok: true });
    expect(calls).toContain("insert");
  });

  it("rechaza fila sin CURP o sin nombre, sin llegar a insertar", async () => {
    const { tx, calls } = makeTxRecorder([], []);
    const fakeDb = { insert: tx.insert };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { importarFilaEvaluador } = await import("./db");
    const resultado = await importarFilaEvaluador("", "Juan Perez", "jefe", undefined, 1);
    expect(resultado.ok).toBe(false);
    expect(calls).not.toContain("insert");
  });

  it("guarda correoSugerido solo si el formato+dominio son validos, sin rechazar la fila si no lo son", async () => {
    const { tx } = makeTxRecorder([], []);
    const fakeDb = { insert: tx.insert };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { importarFilaEvaluador } = await import("./db");
    const resultado = await importarFilaEvaluador("CURPVALIDA000001", "Juan Perez", "companero", "no-es-correo", 1);
    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.advertencia).toBeDefined();
  });

  it("acepta rfc opcional sin romper el import", async () => {
    const { tx, calls } = makeTxRecorder([], []);
    const fakeDb = { insert: tx.insert };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { importarFilaEvaluador } = await import("./db");
    const resultado = await importarFilaEvaluador("CURPVALIDA000001", "Juan Perez", "jefe", undefined, 1, "RFCVALIDO01A");
    expect(resultado).toEqual({ ok: true });
    expect(calls).toContain("insert");
  });
});
