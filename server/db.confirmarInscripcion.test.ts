import { vi, describe, it, expect } from "vitest";
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

const seleccionValida = {
  jefe: { servidorId: 10, correo: "jefe@example.com" },
  companero1: { servidorId: 20, correo: "c1@example.com" },
  companero2: { servidorId: 30, correo: "c2@example.com" },
};

describe("confirmarInscripcion", () => {
  it("no elegible: menos de 2 cursos aprobados con >=70", async () => {
    vi.resetModules();
    const { tx } = makeTxRecorder([[{ calificacion: 60 }, { calificacion: 85 }]], []);
    const fakeDb = { transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { confirmarInscripcion } = await import("./db");
    const resultado = await confirmarInscripcion(1, seleccionValida);
    expect(resultado).toEqual({ ok: false, error: "NO_ELEGIBLE" });
  });

  it("seleccion invalida: alguno de los 3 no esta en el pool del rol correcto", async () => {
    vi.resetModules();
    const { tx } = makeTxRecorder([
      [{ calificacion: 75 }, { calificacion: 90 }], // cursos completados
      [], // pool jefe: no encontro al servidorId=10 como jefe activo
    ], []);
    const fakeDb = { transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { confirmarInscripcion } = await import("./db");
    const resultado = await confirmarInscripcion(1, seleccionValida);
    expect(resultado).toEqual({ ok: false, error: "SELECCION_INVALIDA" });
  });

  it("confirma: crea promocion + 3 correos pendientes + auditoria en una transaccion", async () => {
    vi.resetModules();
    const { tx, calls } = makeTxRecorder([
      [{ calificacion: 75 }, { calificacion: 90 }], // cursos
      [{ servidorId: 10 }], // pool jefe valido
      [{ servidorId: 20 }], // pool companero1 valido
      [{ servidorId: 30 }], // pool companero2 valido
      [{ userId: 100 }], // asignarEvaluador jefe: ya tiene cuenta
      [{ userId: 200 }], // asignarEvaluador companero1: ya tiene cuenta
      [{ userId: 300 }], // asignarEvaluador companero2: ya tiene cuenta
      [{ id: 42 }], // servidoresPublicos del trabajador, para auditoria
    ], []);
    const fakeDb = { transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { confirmarInscripcion } = await import("./db");
    const resultado = await confirmarInscripcion(1, seleccionValida);
    expect(resultado).toEqual({ ok: true });
    // insert: promociones + promocionCorreosPendientes (batch de 3 filas en
    // un solo insert) + auditoria = 3 llamadas reales a tx.insert(). El
    // brief original asumia 3 inserts separados (uno por correo) = 5, pero
    // el codigo real hace un solo insert().values([fila1, fila2, fila3]) --
    // una sola query, mismo resultado, menos round-trips. Se ajusta el
    // conteo aqui para reflejar la ejecucion real en vez de forzar al
    // codigo de produccion a partir el insert en 3 solo para inflar el
    // conteo.
    expect(calls.filter((c) => c === "insert")).toHaveLength(3);
  });

  it("doble inscripcion: ER_DUP_ENTRY se traduce a YA_INSCRITO", async () => {
    vi.resetModules();
    const fakeDb = {
      transaction: vi.fn(async () => {
        const err: any = new Error("Duplicate entry");
        err.cause = { code: "ER_DUP_ENTRY" };
        throw err;
      }),
    };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { confirmarInscripcion } = await import("./db");
    const resultado = await confirmarInscripcion(1, seleccionValida);
    expect(resultado).toEqual({ ok: false, error: "YA_INSCRITO" });
  });
});
