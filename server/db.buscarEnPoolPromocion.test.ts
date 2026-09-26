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
    const fila = { curp: "AAAA000101HDFXXX01", nombre: "Ana Lopez", correoSugerido: null, userId: 12, emailCuenta: null };
    // Primer select: resolver el curp del excluirUserId (aqui sin curp -- no excluye nada).
    // Segundo select: la busqueda real en el pool.
    const { tx } = makeTxRecorder([[], [fila]], []);
    const fakeDb = { select: tx.select };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { buscarEnPoolPromocion } = await import("./db");
    const resultado = await buscarEnPoolPromocion("Ana", "companero", 1);
    expect(resultado).toEqual([{ curp: "AAAA000101HDFXXX01", nombre: "Ana Lopez", tieneCuenta: true, correoPrellenado: null }]);
  });

  it("tieneCuenta es false si userId viene null (sin cuenta creada todavia)", async () => {
    const fila = { curp: "BBBB000101HDFXXX02", nombre: "Beto Ruiz", correoSugerido: null, userId: null, emailCuenta: null };
    const { tx } = makeTxRecorder([[], [fila]], []);
    const fakeDb = { select: tx.select };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { buscarEnPoolPromocion } = await import("./db");
    const [resultado] = await buscarEnPoolPromocion("Beto", "jefe", 1);
    expect(resultado.tieneCuenta).toBe(false);
  });

  // I2 original: precedencia de correo a prellenar. Rediseño 2026-09-26 quita
  // el 3er nivel (servidoresPublicos.email/padron) -- ya no hay padron en
  // este flujo, solo quedan 2 fuentes.
  it("correoPrellenado prioriza users.email sobre correoSugerido", async () => {
    const fila = { curp: "CCCC000101HDFXXX03", nombre: "Carla Diaz", correoSugerido: "csv@example.com", userId: 20, emailCuenta: "cuenta@example.com" };
    const { tx } = makeTxRecorder([[], [fila]], []);
    const fakeDb = { select: tx.select };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { buscarEnPoolPromocion } = await import("./db");
    const [resultado] = await buscarEnPoolPromocion("Carla", "jefe", 1);
    expect(resultado.correoPrellenado).toBe("cuenta@example.com");
  });

  it("correoPrellenado cae a correoSugerido si no hay cuenta (users.email null)", async () => {
    const fila = { curp: "DDDD000101HDFXXX04", nombre: "Dario Ruiz", correoSugerido: "csv@example.com", userId: null, emailCuenta: null };
    const { tx } = makeTxRecorder([[], [fila]], []);
    const fakeDb = { select: tx.select };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { buscarEnPoolPromocion } = await import("./db");
    const [resultado] = await buscarEnPoolPromocion("Dario", "companero", 1);
    expect(resultado.correoPrellenado).toBe("csv@example.com");
  });

  it("correoPrellenado es null si ninguna de las 2 fuentes tiene valor", async () => {
    const fila = { curp: "FFFF000101HDFXXX06", nombre: "Fabian Sosa", correoSugerido: null, userId: null, emailCuenta: null };
    const { tx } = makeTxRecorder([[], [fila]], []);
    const fakeDb = { select: tx.select };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { buscarEnPoolPromocion } = await import("./db");
    const [resultado] = await buscarEnPoolPromocion("Fabian", "companero", 1);
    expect(resultado.correoPrellenado).toBeNull();
  });
});
