import { describe, it, expect } from "vitest";

describe("sortearPreguntasAutoevaluacion (funcion pura, sin DB)", () => {
  it("regresa exactamente `cantidad` ids, todos distintos", async () => {
    const { sortearPreguntasAutoevaluacion } = await import("./db");
    const disponibles = Array.from({ length: 60 }, (_, i) => i + 1);
    const resultado = sortearPreguntasAutoevaluacion(disponibles, 28);
    expect(resultado).toHaveLength(28);
    expect(new Set(resultado).size).toBe(28);
  });

  it("todos los ids sorteados vienen del set disponible", async () => {
    const { sortearPreguntasAutoevaluacion } = await import("./db");
    const disponibles = [10, 20, 30, 40, 50];
    const resultado = sortearPreguntasAutoevaluacion(disponibles, 3);
    for (const id of resultado) {
      expect(disponibles).toContain(id);
    }
  });

  it("si cantidad >= disponibles, regresa todos (sin duplicar ni tronar)", async () => {
    const { sortearPreguntasAutoevaluacion } = await import("./db");
    const disponibles = [1, 2, 3];
    const resultado = sortearPreguntasAutoevaluacion(disponibles, 28);
    expect(resultado).toHaveLength(3);
    expect(new Set(resultado)).toEqual(new Set([1, 2, 3]));
  });

  it("no muta el array de entrada", async () => {
    const { sortearPreguntasAutoevaluacion } = await import("./db");
    const disponibles = [1, 2, 3, 4, 5];
    const copiaOriginal = [...disponibles];
    sortearPreguntasAutoevaluacion(disponibles, 3);
    expect(disponibles).toEqual(copiaOriginal);
  });
});

describe("calcularPuntajeAutoevaluacion (funcion pura, sin DB)", () => {
  it("hoy regresa el conteo crudo de aciertos -- formula real pendiente de confirmar con el cliente", async () => {
    const { calcularPuntajeAutoevaluacion } = await import("./db");
    expect(calcularPuntajeAutoevaluacion(0)).toBe(0);
    expect(calcularPuntajeAutoevaluacion(14)).toBe(14);
    expect(calcularPuntajeAutoevaluacion(28)).toBe(28);
  });
});
