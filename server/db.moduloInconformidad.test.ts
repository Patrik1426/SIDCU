import { vi, describe, it, expect, beforeEach } from "vitest";
import { makeTxRecorder } from "./db.transaction-test-helpers";

vi.mock("mysql2/promise", () => ({ default: { createPool: vi.fn(() => ({})) } }));
vi.mock("drizzle-orm/mysql2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm/mysql2")>();
  return { ...actual, drizzle: vi.fn() };
});

// El constructor Date(y, m, d, ...) SIEMPRE usa la timezone local del
// proceso que corre el test -- igual que moduloEstaHabilitadoAhora lee la
// fecha con getFullYear/getMonth/getDate (locales). Usar strings "...Z"
// (UTC) aqui seria el mismo bug de fecha-un-dia-adelantada que ya tuvo este
// repo (ver exportar.ts) si el runner corre en una timezone distinta a UTC.
describe("moduloEstaHabilitadoAhora (funcion pura, sin DB)", () => {
  it("sin ventana programada, manda el flag manual (true)", async () => {
    const { moduloEstaHabilitadoAhora } = await import("./db");
    const config = { habilitado: true, fechaDesde: null, fechaHasta: null } as any;
    expect(moduloEstaHabilitadoAhora(config, new Date(2026, 5, 15, 10, 0, 0))).toBe(true);
  });

  it("sin ventana programada, manda el flag manual (false)", async () => {
    const { moduloEstaHabilitadoAhora } = await import("./db");
    const config = { habilitado: false, fechaDesde: null, fechaHasta: null } as any;
    expect(moduloEstaHabilitadoAhora(config, new Date(2026, 5, 15, 10, 0, 0))).toBe(false);
  });

  it("con ventana y hoy dentro del rango, esta habilitado sin importar el flag manual", async () => {
    const { moduloEstaHabilitadoAhora } = await import("./db");
    const config = { habilitado: false, fechaDesde: "2026-06-01", fechaHasta: "2026-06-30" } as any;
    expect(moduloEstaHabilitadoAhora(config, new Date(2026, 5, 15, 10, 0, 0))).toBe(true);
  });

  it("con ventana y hoy fuera del rango (antes), esta deshabilitado aunque el flag manual sea true", async () => {
    const { moduloEstaHabilitadoAhora } = await import("./db");
    const config = { habilitado: true, fechaDesde: "2026-06-01", fechaHasta: "2026-06-30" } as any;
    expect(moduloEstaHabilitadoAhora(config, new Date(2026, 4, 31, 10, 0, 0))).toBe(false);
  });

  it("con ventana y hoy fuera del rango (despues), esta deshabilitado", async () => {
    const { moduloEstaHabilitadoAhora } = await import("./db");
    const config = { habilitado: true, fechaDesde: "2026-06-01", fechaHasta: "2026-06-30" } as any;
    expect(moduloEstaHabilitadoAhora(config, new Date(2026, 6, 1, 10, 0, 0))).toBe(false);
  });

  it("los limites del rango (primer y ultimo dia) cuentan como dentro", async () => {
    const { moduloEstaHabilitadoAhora } = await import("./db");
    const config = { habilitado: false, fechaDesde: "2026-06-01", fechaHasta: "2026-06-30" } as any;
    expect(moduloEstaHabilitadoAhora(config, new Date(2026, 5, 1, 0, 0, 1))).toBe(true);
    expect(moduloEstaHabilitadoAhora(config, new Date(2026, 5, 30, 23, 59, 0))).toBe(true);
  });
});

describe("obtenerConfigModuloInconformidad", () => {
  beforeEach(() => vi.resetModules());

  it("regresa la fila si existe", async () => {
    const row = { id: 1, habilitado: true, fechaDesde: null, fechaHasta: null, actualizadoPor: 1, actualizadoPorNombre: "Admin Prueba", updatedAt: new Date() };
    const { tx } = makeTxRecorder([[row]], []);
    const fakeDb = { select: tx.select };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { obtenerConfigModuloInconformidad } = await import("./db");
    const resultado = await obtenerConfigModuloInconformidad();
    expect(resultado).toEqual(row);
  });

  it("si falta la fila (seed no corrido), se defiende devolviendo habilitado:true en vez de romper el modulo", async () => {
    const { tx } = makeTxRecorder([[]], []);
    const fakeDb = { select: tx.select };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { obtenerConfigModuloInconformidad } = await import("./db");
    const resultado = await obtenerConfigModuloInconformidad();
    expect(resultado.habilitado).toBe(true);
    expect(resultado.fechaDesde).toBeNull();
  });
});

describe("actualizarModuloInconformidadManual", () => {
  beforeEach(() => vi.resetModules());

  it("actualiza habilitado, limpia la ventana programada, y audita -- todo en una transaccion", async () => {
    const { tx, calls } = makeTxRecorder([], []);
    const fakeDb = { transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { actualizarModuloInconformidadManual } = await import("./db");
    await actualizarModuloInconformidadManual(false, 1);

    expect(fakeDb.transaction).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(["update", "insert"]);
  });
});

describe("programarVentanaModuloInconformidad", () => {
  beforeEach(() => vi.resetModules());

  it("guarda fechaDesde/fechaHasta y audita en una transaccion", async () => {
    const { tx, calls } = makeTxRecorder([], []);
    const fakeDb = { transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { programarVentanaModuloInconformidad } = await import("./db");
    await programarVentanaModuloInconformidad("2026-06-01", "2026-06-30", 1);

    expect(fakeDb.transaction).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(["update", "insert"]);
  });
});
