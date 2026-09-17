import { describe, it, expect } from "vitest";
import { calcularElegibilidadPromocion } from "./db";

describe("calcularElegibilidadPromocion (funcion pura)", () => {
  it("elegible: 2 cursos aprobados, cada uno >=70", () => {
    expect(calcularElegibilidadPromocion([70, 85])).toEqual({ elegible: true, calificacion1: 70, calificacion2: 85 });
  });

  it("no elegible: solo 1 curso aprobado", () => {
    expect(calcularElegibilidadPromocion([60, 85])).toEqual({ elegible: false });
  });

  it("no elegible: 0 cursos completados", () => {
    expect(calcularElegibilidadPromocion([])).toEqual({ elegible: false });
  });

  it("NO es un promedio -- 60 y 85 no cuentan aunque el promedio sea >=70", () => {
    // (60+85)/2 = 72.5, pero la regla real es cada curso individual >=70.
    const resultado = calcularElegibilidadPromocion([60, 85]);
    expect(resultado.elegible).toBe(false);
  });

  it("3 cursos aprobados: usa los primeros 2 que encuentra", () => {
    expect(calcularElegibilidadPromocion([75, 80, 90])).toEqual({ elegible: true, calificacion1: 75, calificacion2: 80 });
  });
});
