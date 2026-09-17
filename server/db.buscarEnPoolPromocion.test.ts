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
    const fila = { servidorId: 5, nombreCompleto: "Ana Lopez", curp: "AAAA000101HDFXXX01", userId: 12, emailPadron: null, correoSugerido: null, emailCuenta: null };
    const { tx } = makeTxRecorder([[fila]], []);
    const fakeDb = { select: tx.select };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { buscarEnPoolPromocion } = await import("./db");
    const resultado = await buscarEnPoolPromocion("Ana", "companero", 1);
    expect(resultado).toEqual([{ servidorId: 5, nombreCompleto: "Ana Lopez", curp: "AAAA000101HDFXXX01", tieneCuenta: true, correoPrellenado: null }]);
  });

  it("tieneCuenta es false si userId viene null (sin cuenta creada todavia) -- y no se excluye por error", async () => {
    const fila = { servidorId: 6, nombreCompleto: "Beto Ruiz", curp: "BBBB000101HDFXXX02", userId: null, emailPadron: null, correoSugerido: null, emailCuenta: null };
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

  // I2 (revision final de rama): el spec (seccion 4) define una precedencia
  // de 3 fuentes para el correo a prellenar -- antes buscarEnPoolPromocion
  // ni siquiera las seleccionaba (nadie del lado de lectura las usaba).
  it("correoPrellenado prioriza users.email sobre correoSugerido y sobre servidoresPublicos.email", async () => {
    const fila = { servidorId: 7, nombreCompleto: "Carla Diaz", curp: "CCCC000101HDFXXX03", userId: 20, emailPadron: "padron@example.com", correoSugerido: "csv@example.com", emailCuenta: "cuenta@example.com" };
    const { tx } = makeTxRecorder([[fila]], []);
    const fakeDb = { select: tx.select };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { buscarEnPoolPromocion } = await import("./db");
    const [resultado] = await buscarEnPoolPromocion("Carla", "jefe", 1);
    expect(resultado.correoPrellenado).toBe("cuenta@example.com");
  });

  it("correoPrellenado cae a correoSugerido si no hay cuenta (users.email null)", async () => {
    const fila = { servidorId: 8, nombreCompleto: "Dario Ruiz", curp: "DDDD000101HDFXXX04", userId: null, emailPadron: "padron@example.com", correoSugerido: "csv@example.com", emailCuenta: null };
    const { tx } = makeTxRecorder([[fila]], []);
    const fakeDb = { select: tx.select };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { buscarEnPoolPromocion } = await import("./db");
    const [resultado] = await buscarEnPoolPromocion("Dario", "companero", 1);
    expect(resultado.correoPrellenado).toBe("csv@example.com");
  });

  it("correoPrellenado cae a servidoresPublicos.email (padron) si no hay cuenta ni correoSugerido", async () => {
    const fila = { servidorId: 9, nombreCompleto: "Elena Cruz", curp: "EEEE000101HDFXXX05", userId: null, emailPadron: "padron@example.com", correoSugerido: null, emailCuenta: null };
    const { tx } = makeTxRecorder([[fila]], []);
    const fakeDb = { select: tx.select };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { buscarEnPoolPromocion } = await import("./db");
    const [resultado] = await buscarEnPoolPromocion("Elena", "companero", 1);
    expect(resultado.correoPrellenado).toBe("padron@example.com");
  });

  it("correoPrellenado es null si ninguna de las 3 fuentes tiene valor", async () => {
    const fila = { servidorId: 10, nombreCompleto: "Fabian Sosa", curp: "FFFF000101HDFXXX06", userId: null, emailPadron: null, correoSugerido: null, emailCuenta: null };
    const { tx } = makeTxRecorder([[fila]], []);
    const fakeDb = { select: tx.select };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { buscarEnPoolPromocion } = await import("./db");
    const [resultado] = await buscarEnPoolPromocion("Fabian", "companero", 1);
    expect(resultado.correoPrellenado).toBeNull();
  });
});
