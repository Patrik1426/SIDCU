import { describe, it, expect, vi, beforeEach } from "vitest";

// Hallazgo de auditoria DBA: CircuitBreaker existia sin ningun test, y sin
// ningun caller real (safeQuery, su unico wrapper pensado para usarlo, nunca
// se llamaba en el resto del codigo) -- el health check de /api/health leia
// su estado pero nada lo alimentaba con fallos reales, asi que siempre
// reportaba "CLOSED" sin importar la salud real de la DB. Este archivo
// prueba la clase en si (logica pura, sin DB real) antes de conectarla de
// verdad al query del health check.
describe("CircuitBreaker", () => {
  beforeEach(() => {
    // dbCircuitBreaker es un singleton a nivel de modulo -- sin resetear,
    // el estado (failures acumulados) se arrastraria de un test a otro.
    vi.resetModules();
  });

  it("arranca CLOSED y deja pasar llamadas exitosas", async () => {
    const { dbCircuitBreaker } = await import("./circuitBreaker");
    expect(dbCircuitBreaker.getState().state).toBe("CLOSED");
    const resultado = await dbCircuitBreaker.execute(async () => "ok");
    expect(resultado).toBe("ok");
    expect(dbCircuitBreaker.getState().state).toBe("CLOSED");
  });

  it("abre (OPEN) tras 5 fallos consecutivos y rechaza sin ni siquiera intentar la funcion", async () => {
    const { dbCircuitBreaker } = await import("./circuitBreaker");
    const fnFalla = vi.fn(async () => { throw new Error("db caida"); });

    for (let i = 0; i < 5; i++) {
      await expect(dbCircuitBreaker.execute(fnFalla)).rejects.toThrow("db caida");
    }
    expect(dbCircuitBreaker.getState().state).toBe("OPEN");
    expect(fnFalla).toHaveBeenCalledTimes(5);

    // Un 6to intento mientras esta OPEN ni siquiera llama a fnFalla -- ese es
    // el punto del circuit breaker, cortar la carga hacia una DB ya en apuros.
    await expect(dbCircuitBreaker.execute(fnFalla)).rejects.toThrow("Sistema temporalmente saturado");
    expect(fnFalla).toHaveBeenCalledTimes(5);
  });

  it("un exito reinicia el contador de fallos a 0", async () => {
    const { dbCircuitBreaker } = await import("./circuitBreaker");
    const fnFalla = vi.fn(async () => { throw new Error("fallo"); });
    for (let i = 0; i < 3; i++) {
      await expect(dbCircuitBreaker.execute(fnFalla)).rejects.toThrow();
    }
    expect(dbCircuitBreaker.getState().failures).toBe(3);

    await dbCircuitBreaker.execute(async () => "ok");
    expect(dbCircuitBreaker.getState()).toEqual({ state: "CLOSED", failures: 0 });
  });
});
