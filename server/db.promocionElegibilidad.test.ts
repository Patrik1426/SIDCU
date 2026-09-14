import { describe, it, expect } from "vitest";
import { calcularElegibilidadPromocion, elegirDosAlAzar } from "./db";

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

describe("elegirDosAlAzar (funcion pura)", () => {
  it("regresa null si hay menos de 2 disponibles", () => {
    expect(elegirDosAlAzar([])).toBeNull();
    expect(elegirDosAlAzar([1])).toBeNull();
  });

  it("regresa exactamente 2 ids distintos, ambos del arreglo original", () => {
    const ids = [10, 20, 30, 40, 50];
    const resultado = elegirDosAlAzar(ids);
    expect(resultado).not.toBeNull();
    expect(resultado![0]).not.toBe(resultado![1]);
    expect(ids).toContain(resultado![0]);
    expect(ids).toContain(resultado![1]);
  });

  it("con exactamente 2 disponibles, regresa esos 2 (en cualquier orden)", () => {
    const resultado = elegirDosAlAzar([7, 8]);
    expect(resultado!.slice().sort()).toEqual([7, 8]);
  });

  it("no muta el arreglo original", () => {
    const ids = [1, 2, 3];
    const copia = [...ids];
    elegirDosAlAzar(ids);
    expect(ids).toEqual(copia);
  });
});
