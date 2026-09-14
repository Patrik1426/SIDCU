import { vi, describe, it, expect } from "vitest";
import { makeTxRecorder } from "./db.transaction-test-helpers";

vi.mock("mysql2/promise", () => ({ default: { createPool: vi.fn(() => ({})) } }));
vi.mock("drizzle-orm/mysql2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm/mysql2")>();
  return { ...actual, drizzle: vi.fn() };
});

describe("inscribirmePromocion", () => {
  it("no elegible: menos de 2 cursos aprobados con >=70", async () => {
    vi.resetModules();
    const { tx } = makeTxRecorder([[{ calificacion: 60 }, { calificacion: 85 }]], []);
    const fakeDb = { transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { inscribirmePromocion } = await import("./db");
    const resultado = await inscribirmePromocion(1);
    expect(resultado).toEqual({ ok: false, error: "NO_ELEGIBLE" });
  });

  it("sin jefe asignado en el catalogo", async () => {
    vi.resetModules();
    const { tx } = makeTxRecorder([
      [{ calificacion: 75 }, { calificacion: 90 }], // cursos completados
      [], // promocionJefes: vacio
    ], []);
    const fakeDb = { transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { inscribirmePromocion } = await import("./db");
    const resultado = await inscribirmePromocion(1);
    expect(resultado).toEqual({ ok: false, error: "SIN_JEFE_ASIGNADO" });
  });

  it("pool insuficiente: menos de 2 companeros disponibles", async () => {
    vi.resetModules();
    const { tx } = makeTxRecorder([
      [{ calificacion: 75 }, { calificacion: 90 }],
      [{ jefeUserId: 99 }],
      [{ userId: 5 }], // pool: solo 1 disponible
    ], []);
    const fakeDb = { transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { inscribirmePromocion } = await import("./db");
    const resultado = await inscribirmePromocion(1);
    expect(resultado).toEqual({ ok: false, error: "POOL_INSUFICIENTE" });
  });

  it("inscribe: crea promocion + auditoria en la misma transaccion", async () => {
    vi.resetModules();
    const { tx, calls } = makeTxRecorder([
      [{ calificacion: 75 }, { calificacion: 90 }],
      [{ jefeUserId: 99 }],
      [{ userId: 5 }, { userId: 6 }, { userId: 7 }],
      [{ id: 42 }], // servidoresPublicos (para servidorId de auditoria)
    ], []);
    const fakeDb = { transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { inscribirmePromocion } = await import("./db");
    const resultado = await inscribirmePromocion(1);
    expect(resultado).toEqual({ ok: true });
    expect(fakeDb.transaction).toHaveBeenCalledTimes(1);
    expect(calls.filter((c) => c === "insert")).toHaveLength(2); // promociones + auditoria
  });

  it("doble inscripcion: ER_DUP_ENTRY se traduce a YA_INSCRITO", async () => {
    vi.resetModules();
    const { tx } = makeTxRecorder([
      [{ calificacion: 75 }, { calificacion: 90 }],
      [{ jefeUserId: 99 }],
      [{ userId: 5 }, { userId: 6 }],
    ], []);
    // Forzar que el insert de promociones truene con ER_DUP_ENTRY.
    const fakeDb = {
      transaction: vi.fn(async () => {
        const err: any = new Error("Duplicate entry");
        err.cause = { code: "ER_DUP_ENTRY" };
        throw err;
      }),
    };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { inscribirmePromocion } = await import("./db");
    const resultado = await inscribirmePromocion(1);
    expect(resultado).toEqual({ ok: false, error: "YA_INSCRITO" });
  });
});
