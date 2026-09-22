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

describe("importarFilaPreguntaEvaluador", () => {
  it("rechaza texto vacio sin llegar a la DB", async () => {
    const { importarFilaPreguntaEvaluador } = await import("./db");
    const resultado = await importarFilaPreguntaEvaluador("jefe", "   ", "siempre");
    expect(resultado).toEqual({ ok: false, error: "Falta el texto de la pregunta" });
  });

  it("rechaza una respuesta_correcta que no sea una opcion Likert valida", async () => {
    const { importarFilaPreguntaEvaluador } = await import("./db");
    const resultado = await importarFilaPreguntaEvaluador("companero", "¿Colabora en equipo?", "tal vez");
    expect(resultado).toEqual({ ok: false, error: 'respuesta_correcta inválida: "tal vez" (usa siempre/frecuente/algunas_veces/nunca)' });
  });

  it("inserta con el rol correcto (jefe)", async () => {
    const { tx, calls } = makeTxRecorder([], []);
    const fakeDb = { insert: tx.insert };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { importarFilaPreguntaEvaluador } = await import("./db");
    const resultado = await importarFilaPreguntaEvaluador("jefe", "¿Delega tareas con claridad?", " Frecuente ");
    expect(resultado).toEqual({ ok: true });
    expect(calls).toEqual(["insert"]);
  });

  it("inserta con el rol correcto (companero)", async () => {
    const { tx, calls } = makeTxRecorder([], []);
    const fakeDb = { insert: tx.insert };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { importarFilaPreguntaEvaluador } = await import("./db");
    const resultado = await importarFilaPreguntaEvaluador("companero", "¿Comparte información relevante?", "nunca");
    expect(resultado).toEqual({ ok: true });
    expect(calls).toEqual(["insert"]);
  });
});

describe("contarPreguntasActivasEvaluador", () => {
  it("regresa el conteo de preguntas activas del rol pedido", async () => {
    const { tx } = makeTxRecorder([[{ count: 60 }]], []);
    const fakeDb = { select: tx.select };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { contarPreguntasActivasEvaluador } = await import("./db");
    const resultado = await contarPreguntasActivasEvaluador("jefe");
    expect(resultado).toBe(60);
  });
});
