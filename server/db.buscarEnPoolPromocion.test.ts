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

describe("buscarEnPoolPromocion", () => {
  it("regresa coincidencias del rol pedido con tieneCuenta calculado", async () => {
    const fila = { servidorId: 5, nombreCompleto: "Ana Lopez", curp: "AAAA000101HDFXXX01", userId: 12 };
    const { tx } = makeTxRecorder([[fila]], []);
    const fakeDb = { select: tx.select };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { buscarEnPoolPromocion } = await import("./db");
    const resultado = await buscarEnPoolPromocion("Ana", "companero", 1);
    expect(resultado).toEqual([{ servidorId: 5, nombreCompleto: "Ana Lopez", curp: "AAAA000101HDFXXX01", tieneCuenta: true }]);
  });

  it("tieneCuenta es false si userId viene null (sin cuenta creada todavia) -- y no se excluye por error", async () => {
    const fila = { servidorId: 6, nombreCompleto: "Beto Ruiz", curp: "BBBB000101HDFXXX02", userId: null };
    const { tx } = makeTxRecorder([[fila]], []);
    const fakeDb = { select: tx.select };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    // excluirUserId=1 no debe ocultar filas con userId=null -- si la
    // implementacion usara ne(servidoresPublicos.userId, excluirUserId) sin
    // el or(isNull(...)) de seguridad, esta fila desaparecería del resultado
    // (NULL <> 1 evalua a NULL en SQL, la fila se filtra por accidente).
    const { buscarEnPoolPromocion } = await import("./db");
    const [resultado] = await buscarEnPoolPromocion("Beto", "jefe", 1);
    expect(resultado.tieneCuenta).toBe(false);
  });
});
