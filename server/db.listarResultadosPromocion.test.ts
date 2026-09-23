import { describe, it, expect, vi, beforeEach } from "vitest";

// Igual que server/db.listarInscripcionesPromocion.test.ts: mysql2/promise
// se mockea para que getDb() nunca abra un pool real (createPool real
// truena sin DATABASE_URL), y drizzle-orm/mysql2 se mockea para poder
// inyectar un fakeDb encadenable via drizzle(pool, ...).mockReturnValue().
// El mock sugerido en el brief (vi.spyOn sobre el objeto namespace de
// "./db") no funciona: getDb() llama a la funcion local del modulo, no al
// binding exportado, asi que el spy nunca intercepta la llamada interna
// -- se ajusto al patron real ya probado por listarInscripcionesPromocion.
vi.mock("mysql2/promise", () => ({ default: { createPool: vi.fn(() => ({})) } }));
vi.mock("drizzle-orm/mysql2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm/mysql2")>();
  return { ...actual, drizzle: vi.fn() };
});

function encadenable(resultado: any) {
  const q: any = {};
  q.select = vi.fn(() => q);
  q.from = vi.fn(() => q);
  q.innerJoin = vi.fn(() => q);
  q.leftJoin = vi.fn(() => q);
  q.where = vi.fn(() => Promise.resolve(resultado));
  return q;
}

beforeEach(() => {
  vi.resetModules();
});

describe("listarResultadosPromocion", () => {
  it("regresa items con total/completo calculados y metadatos de paginacion", async () => {
    const filasCrudas = [
      {
        promocionId: 1,
        trabajadorNombre: "Ana Torres",
        trabajadorCurp: "AAAA000101MDFXXX01",
        autoEstado: "enviado", autoPuntaje: 14,
        jefeEstado: "enviado", jefePuntaje: 14,
        c1Estado: "enviado", c1Puntaje: 5.571,
        c2Estado: "borrador", c2Puntaje: null,
      },
    ];
    const dbFake = {
      select: vi.fn()
        .mockReturnValueOnce(encadenable(filasCrudas))
        .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => Promise.resolve([{ count: 1 }])) })) }),
    };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(dbFake as any);

    const { listarResultadosPromocion } = await import("./db");
    const resultado = await listarResultadosPromocion({ page: 1, limit: 20 });

    expect(resultado.items).toHaveLength(1);
    expect(resultado.items[0].total).toBeCloseTo(33.571, 3);
    expect(resultado.items[0].completo).toBe(false);
    expect(resultado.total).toBe(1);
    expect(resultado.page).toBe(1);
  });

  it("filtro estado=completo excluye a los que no tienen los 4 componentes enviados", async () => {
    const filasCrudas = [
      { promocionId: 1, trabajadorNombre: "Ana", trabajadorCurp: "X1", autoEstado: "enviado", autoPuntaje: 14, jefeEstado: "enviado", jefePuntaje: 14, c1Estado: "enviado", c1Puntaje: 6, c2Estado: "enviado", c2Puntaje: 6 },
      { promocionId: 2, trabajadorNombre: "Beto", trabajadorCurp: "X2", autoEstado: "borrador", autoPuntaje: null, jefeEstado: "enviado", jefePuntaje: 14, c1Estado: "enviado", c1Puntaje: 6, c2Estado: "enviado", c2Puntaje: 6 },
    ];
    const dbFake = {
      select: vi.fn()
        .mockReturnValueOnce(encadenable(filasCrudas))
        .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => Promise.resolve([{ count: 2 }])) })) }),
    };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(dbFake as any);

    const { listarResultadosPromocion } = await import("./db");
    const resultado = await listarResultadosPromocion({ page: 1, limit: 20, estado: "completo" });

    expect(resultado.items).toHaveLength(1);
    expect(resultado.items[0].trabajadorNombre).toBe("Ana");
  });
});
