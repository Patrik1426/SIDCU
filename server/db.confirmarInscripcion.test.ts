import { vi, describe, it, expect } from "vitest";
import { makeTxRecorder } from "./db.transaction-test-helpers";

vi.mock("mysql2/promise", () => ({ default: { createPool: vi.fn(() => ({})) } }));
vi.mock("drizzle-orm/mysql2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm/mysql2")>();
  return { ...actual, drizzle: vi.fn() };
});
vi.mock("./auth", () => ({
  generarPasswordTemporal: vi.fn(() => "PASSTEMP12AB"),
  hashPassword: vi.fn(async () => "hash-simulado"),
}));
// I3: confirmarInscripcion ahora valida formato+MX de los 3 correos ANTES de
// abrir la transaccion -- sin mockear esto, cada test dispararia una
// resolucion DNS real (lenta y no determinista en CI). Default: todos
// validos: los tests que quieren probar el rechazo lo sobreescriben.
vi.mock("./lib/validarCorreo", () => ({
  validarCorreoEvaluador: vi.fn(async () => ({ ok: true })),
}));

const seleccionValida = {
  jefe: { servidorId: 10, correo: "jefe@example.com" },
  companero1: { servidorId: 20, correo: "c1@example.com" },
  companero2: { servidorId: 30, correo: "c2@example.com" },
};

describe("confirmarInscripcion", () => {
  it("no elegible: promedio de los 2 cursos completados por debajo de 70", async () => {
    vi.resetModules();
    const { tx } = makeTxRecorder([[{ calificacion: 50 }, { calificacion: 60 }]], []);
    const fakeDb = { transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { confirmarInscripcion } = await import("./db");
    const resultado = await confirmarInscripcion(1, seleccionValida);
    expect(resultado).toEqual({ ok: false, error: "NO_ELEGIBLE" });
  });

  it("seleccion invalida: alguno de los 3 no esta en el pool del rol correcto", async () => {
    vi.resetModules();
    const { tx } = makeTxRecorder([
      [{ calificacion: 75 }, { calificacion: 90 }], // cursos completados
      [], // pool jefe: no encontro al servidorId=10 como jefe activo
    ], []);
    const fakeDb = { transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { confirmarInscripcion } = await import("./db");
    const resultado = await confirmarInscripcion(1, seleccionValida);
    expect(resultado).toEqual({ ok: false, error: "SELECCION_INVALIDA" });
  });

  it("confirma: crea promocion + 3 correos pendientes + evaluaciones + auditoria en una transaccion", async () => {
    vi.resetModules();
    const { tx, calls } = makeTxRecorder([
      [{ calificacion: 75 }, { calificacion: 90 }], // cursos
      [{ servidorId: 10 }], // pool jefe valido
      [{ servidorId: 20 }], // pool companero1 valido
      [{ servidorId: 30 }], // pool companero2 valido
      [{ id: 42 }], // C1: servidorPropio del llamante (42, no coincide con 10/20/30) -- se reusa para auditoria
      [{ userId: 100 }], // asignarEvaluador jefe: ya tiene cuenta
      [{ userId: 200 }], // asignarEvaluador companero1: ya tiene cuenta
      [{ userId: 300 }], // asignarEvaluador companero2: ya tiene cuenta
    ], []);
    const fakeDb = { transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { confirmarInscripcion } = await import("./db");
    const resultado = await confirmarInscripcion(1, seleccionValida);
    expect(resultado).toEqual({ ok: true });
    // insert: promociones + promocionCorreosPendientes (batch de 3 filas en
    // un solo insert) + evaluaciones (batch de 3 filas en un solo insert,
    // Task 4) + auditoria = 4 llamadas reales a tx.insert(). El brief
    // original de este test asumia 3 inserts separados por correo = 5, pero
    // el codigo real hace un solo insert().values([fila1, fila2, fila3]) --
    // una sola query, mismo resultado, menos round-trips. Se ajusta el
    // conteo aqui para reflejar la ejecucion real en vez de forzar al
    // codigo de produccion a partir el insert en 3 solo para inflar el
    // conteo. Conteo subio de 3 a 4 al agregar el insert de evaluaciones
    // (Task 4, confirmarInscripcion extendido).
    expect(calls.filter((c) => c === "insert")).toHaveLength(4);
  });

  // C1 (revision final de rama): antes, asignarEvaluador se llamaba para los
  // 3 slots PRIMERO y solo DESPUES se comparaba el userId resultante contra
  // el del llamante -- si el trabajador se auto-seleccionaba, esas llamadas
  // ya habian hecho un INSERT/UPDATE que quedaba commiteado aunque la
  // inscripcion se rechazara despues, huerfanando la cuenta. Ahora el
  // chequeo usa el servidorId propio del llamante y corre ANTES de tocar
  // asignarEvaluador -- no debe haber NINGUN insert, ni siquiera para los
  // otros 2 slots validos.
  it("auto-seleccion: rechaza con SELECCION_INVALIDA SIN llamar asignarEvaluador para ningun slot (transaccion completa, sin escritura parcial)", async () => {
    vi.resetModules();
    const { tx, calls } = makeTxRecorder([
      [{ calificacion: 75 }, { calificacion: 90 }], // cursos
      [{ servidorId: 10 }], // pool jefe valido
      [{ servidorId: 20 }], // pool companero1 valido
      [{ servidorId: 30 }], // pool companero2 valido
      [{ id: 20 }], // C1: servidorPropio del llamante == companero1.servidorId -> auto-seleccion
    ], []);
    const fakeDb = { transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { confirmarInscripcion } = await import("./db");
    const resultado = await confirmarInscripcion(1, seleccionValida);
    expect(resultado).toEqual({ ok: false, error: "SELECCION_INVALIDA" });
    expect(calls).not.toContain("insert");
    expect(calls).not.toContain("update");
  });

  // I1 (revision final de rama): servidorEnPool ahora tambien exige
  // servidoresPublicos.estatus="activo" y (si tiene cuenta) users.isActive --
  // antes solo miraba promocionEvaluadorPool.rol+activo, una regresion del
  // fix c55d401 del diseño anterior. El mock no evalua el WHERE real (ver
  // limitacion documentada en db.transaction-test-helpers.ts / README de
  // este repo de tests), asi que esta prueba fija el CONTRATO: si MySQL
  // excluye la fila (por el join a servidoresPublicos/users que ahora forma
  // parte de la query), confirmarInscripcion debe seguir rechazando con
  // SELECCION_INVALIDA -- exactamente el mismo resultado que si la fila
  // nunca hubiera estado en el pool.
  it("servidor/usuario inactivo: se excluye del pool (simulado por MySQL sin regresar fila) y se rechaza", async () => {
    vi.resetModules();
    const { tx } = makeTxRecorder([
      [{ calificacion: 75 }, { calificacion: 90 }], // cursos
      [], // pool jefe: servidorEnPool no regresa fila -- excluido por estatus/isActive
    ], []);
    const fakeDb = { transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { confirmarInscripcion } = await import("./db");
    const resultado = await confirmarInscripcion(1, seleccionValida);
    expect(resultado).toEqual({ ok: false, error: "SELECCION_INVALIDA" });
  });

  // Hallazgo real 2026-09-23 (verificacion en vivo, modulo Evaluadores):
  // servidorEnPool bloqueaba TAMBIEN a una cuenta on-the-fly de evaluador
  // que expiro por el worker de 3 dias habiles -- nunca se podia volver a
  // seleccionar a ese evaluador, asi que la reactivacion de asignarEvaluador
  // (fix wave de la revision final) era codigo muerto. Fix: servidorEnPool
  // ahora acepta la fila si evaluadorCuentaExpiraEn no es null (cuenta
  // on-the-fly, isActive=false es recuperable), aunque isActive sea false.
  // Mismo limite del mock que el test de arriba: no evalua el WHERE real,
  // asi que esta prueba fija el CONTRATO -- si MySQL SI regresa la fila
  // (porque cumple el nuevo OR), confirmarInscripcion debe seguir su camino
  // normal, no rechazar.
  it("servidor con cuenta on-the-fly expirada: pool SI regresa fila (recuperable) y no rechaza por eso", async () => {
    vi.resetModules();
    const { tx, calls } = makeTxRecorder([
      [{ calificacion: 75 }, { calificacion: 90 }], // cursos completados
      [{ servidorId: 10 }], // pool jefe: SI regresa fila pese a isActive=false
      [{ servidorId: 20 }], // pool companero1
      [{ servidorId: 30 }], // pool companero2
      [{ id: 1 }], // servidorPropio (auto-seleccion check)
      [{ userId: null, curp: "X", nombreCompleto: "Jefe Ejemplo" }], // asignarEvaluador: select servidor (jefe)
      [{ userId: null, curp: "Y", nombreCompleto: "Comp1 Ejemplo" }], // asignarEvaluador: select servidor (companero1)
      [{ userId: null, curp: "Z", nombreCompleto: "Comp2 Ejemplo" }], // asignarEvaluador: select servidor (companero2)
    ], [{ insertId: 900 }]);
    const fakeDb = { transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { confirmarInscripcion } = await import("./db");
    const resultado = await confirmarInscripcion(1, seleccionValida);
    expect(resultado).toEqual({ ok: true });
    expect(calls).not.toEqual([]);
  });

  // I3 (revision final de rama): validarCorreoEvaluador (formato+MX) antes
  // solo se llamaba desde importarFilaEvaluador -- las 3 selecciones del
  // trabajador solo pasaban por z.string().email() en el router (formato,
  // sin MX). Corre ANTES de abrir la transaccion (ni siquiera llega a
  // consultar elegibilidad).
  it("correo invalido: rechaza con CORREO_INVALIDO sin abrir transaccion", async () => {
    vi.resetModules();
    const { validarCorreoEvaluador } = await import("./lib/validarCorreo");
    vi.mocked(validarCorreoEvaluador).mockResolvedValueOnce({ ok: false, error: "el dominio del correo no existe" });
    const fakeDb = { transaction: vi.fn() };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { confirmarInscripcion } = await import("./db");
    const resultado = await confirmarInscripcion(1, seleccionValida);
    expect(resultado).toEqual({ ok: false, error: "CORREO_INVALIDO" });
    expect(fakeDb.transaction).not.toHaveBeenCalled();
  });

  it("crea las 3 filas de evaluaciones (jefe, companero1, companero2) junto con la inscripcion", async () => {
    vi.resetModules();
    const completadas = [{ calificacion: 80 }, { calificacion: 90 }];
    const servidorPropio = { id: 1 };
    // Mismo fixture base que el test "confirma" de este archivo (elegibilidad
    // ok, pool ok, sin auto-seleccion), pero aqui ninguno de los 3
    // evaluadores tiene cuenta todavia -- asignarEvaluador entra a la rama de
    // "cuenta nueva" para los 3, que hace su propio select (servidor por id,
    // sin userId) antes de insertar. Por eso hacen falta 8 selectResults
    // (completadas, 3x pool, servidorPropio, 3x select-de-asignarEvaluador),
    // no solo los 5 del brief original -- el orden real de awaits dentro de
    // confirmarInscripcion/asignarEvaluador exige esa forma exacta.
    const { tx, calls } = makeTxRecorder(
      [
        completadas,
        [{ activo: true }], // pool jefe
        [{ activo: true }], // pool companero1
        [{ activo: true }], // pool companero2
        [servidorPropio], // servidorPropio (id 1, distinto de 10/11/12 -> sin auto-seleccion)
        [{ userId: null, curp: "AAAA000101HDFRRN01", nombreCompleto: "Jefe De Prueba" }], // asignarEvaluador jefe: sin cuenta
        [{ userId: null, curp: "BBBB000101HDFRRN02", nombreCompleto: "Companero Uno" }], // asignarEvaluador companero1: sin cuenta
        [{ userId: null, curp: "CCCC000101HDFRRN03", nombreCompleto: "Companero Dos" }], // asignarEvaluador companero2: sin cuenta
      ],
      [{ insertId: 200 }],
    );
    const fakeDb = { transaction: vi.fn((cb: any) => cb(tx)) };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { confirmarInscripcion } = await import("./db");
    const resultado = await confirmarInscripcion(1, {
      jefe: { servidorId: 10, correo: "jefe@ejemplo.com" },
      companero1: { servidorId: 11, correo: "c1@ejemplo.com" },
      companero2: { servidorId: 12, correo: "c2@ejemplo.com" },
    });

    expect(resultado).toEqual({ ok: true });
    // 3x insert de asignarEvaluador (cuenta nueva cada uno, fixture arriba) +
    // insert promociones + insert promocionCorreosPendientes + insert
    // evaluaciones + insert auditoria = 7 inserts exactos con este fixture.
    // A proposito NO se usa >=4 (como sugeria el brief original): con los 3
    // evaluadores sin cuenta ya hay 6 inserts SIN el insert de evaluaciones
    // (3 users + promociones + correos + auditoria), asi que un umbral >=4
    // pasaria igual aunque el codigo nuevo no exista -- no seria una
    // asercion load-bearing. El conteo exacto de 7 si lo es: verificado en
    // RED (6, sin el cambio) antes de implementar.
    expect(calls.filter((c) => c === "insert")).toHaveLength(7);
  });

  it("doble inscripcion: ER_DUP_ENTRY se traduce a YA_INSCRITO", async () => {
    vi.resetModules();
    const fakeDb = {
      transaction: vi.fn(async () => {
        const err: any = new Error("Duplicate entry");
        err.cause = { code: "ER_DUP_ENTRY" };
        throw err;
      }),
    };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);

    const { confirmarInscripcion } = await import("./db");
    const resultado = await confirmarInscripcion(1, seleccionValida);
    expect(resultado).toEqual({ ok: false, error: "YA_INSCRITO" });
  });
});
