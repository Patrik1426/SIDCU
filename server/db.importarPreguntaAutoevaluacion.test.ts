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

describe("importarFilaPreguntaAutoevaluacion", () => {
  it("rechaza texto vacio sin llegar a la DB", async () => {
    const { tx } = makeTxRecorder([], []);
    const fakeDb = { insert: tx.insert };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { importarFilaPreguntaAutoevaluacion } = await import("./db");
    const resultado = await importarFilaPreguntaAutoevaluacion("   ", "siempre");
    expect(resultado).toEqual({ ok: false, error: "Falta el texto de la pregunta" });
  });

  it("rechaza una respuesta_correcta que no sea una opcion Likert valida", async () => {
    const { importarFilaPreguntaAutoevaluacion } = await import("./db");
    const resultado = await importarFilaPreguntaAutoevaluacion("¿Llegas puntual?", "tal vez");
    expect(resultado).toEqual({ ok: false, error: 'respuesta_correcta inválida: "tal vez" (usa siempre/frecuente/algunas_veces/nunca)' });
  });

  it("normaliza mayusculas/espacios de la columna correcta e inserta", async () => {
    const { tx, calls } = makeTxRecorder([], []);
    const fakeDb = { insert: tx.insert };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { importarFilaPreguntaAutoevaluacion } = await import("./db");
    const resultado = await importarFilaPreguntaAutoevaluacion("¿Llegas puntual?", " Algunas Veces ");
    expect(resultado).toEqual({ ok: true });
    expect(calls).toEqual(["insert"]);
  });
});

describe("contarPreguntasActivasAutoevaluacion", () => {
  it("regresa el conteo de preguntas activas", async () => {
    const { tx } = makeTxRecorder([[{ count: 45 }]], []);
    const fakeDb = { select: tx.select };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { contarPreguntasActivasAutoevaluacion } = await import("./db");
    const resultado = await contarPreguntasActivasAutoevaluacion();
    expect(resultado).toBe(45);
  });
});
