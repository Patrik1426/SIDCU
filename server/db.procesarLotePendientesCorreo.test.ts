import { vi, describe, it, expect, beforeEach } from "vitest";
import { makeTxRecorder } from "./db.transaction-test-helpers";

vi.mock("mysql2/promise", () => ({ default: { createPool: vi.fn(() => ({})) } }));
vi.mock("drizzle-orm/mysql2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm/mysql2")>();
  return { ...actual, drizzle: vi.fn() };
});
vi.mock("./lib/email", () => ({ enviarCorreoEvaluador: vi.fn() }));

beforeEach(() => {
  vi.resetModules();
});

describe("procesarLotePendientesCorreo", () => {
  it("marca enviado en exito, usa el password de la fila (no de users) y lo limpia al terminar", async () => {
    const pendiente = { id: 1, promocionId: 1, destinatarioUserId: 100, rol: "jefe", intentos: 0, passwordTemporalEnClaro: "PASSTEMP12AB" };
    const destinatario = { email: "jefe@example.com", nombre: "Ana Lopez", curp: "AAAA000101HDFXXX01" };
    const trabajador = { nombreCompleto: "Beto Ruiz" };
    const { tx } = makeTxRecorder([[pendiente], [destinatario], [trabajador]], []);
    const fakeDb = { select: tx.select, update: tx.update };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);
    const { enviarCorreoEvaluador } = await import("./lib/email");
    vi.mocked(enviarCorreoEvaluador).mockResolvedValue({ ok: true });

    const { procesarLotePendientesCorreo } = await import("./db");
    const resultado = await procesarLotePendientesCorreo();
    expect(resultado).toEqual({ procesados: 1, enviados: 1, fallidos: 0 });
    expect(enviarCorreoEvaluador).toHaveBeenCalledWith(
      "jefe@example.com",
      "evaluador_nueva_cuenta",
      expect.objectContaining({ passwordTemporal: "PASSTEMP12AB", trabajador: "Beto Ruiz" }),
    );
  });

  it("usa la plantilla sin credenciales cuando passwordTemporalEnClaro es null", async () => {
    const pendiente = { id: 2, promocionId: 1, destinatarioUserId: 200, rol: "companero1", intentos: 0, passwordTemporalEnClaro: null };
    const destinatario = { email: "companero@example.com", nombre: "Carlos Diaz", curp: "CCCC000101HDFXXX03" };
    const trabajador = { nombreCompleto: "Beto Ruiz" };
    const { tx } = makeTxRecorder([[pendiente], [destinatario], [trabajador]], []);
    const fakeDb = { select: tx.select, update: tx.update };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);
    const { enviarCorreoEvaluador } = await import("./lib/email");
    vi.mocked(enviarCorreoEvaluador).mockResolvedValue({ ok: true });

    const { procesarLotePendientesCorreo } = await import("./db");
    await procesarLotePendientesCorreo();
    expect(enviarCorreoEvaluador).toHaveBeenCalledWith("companero@example.com", "evaluador_cuenta_existente", expect.anything());
  });

  it("incrementa intentos en fallo, sin llegar todavia al tope, y conserva el password para el reintento", async () => {
    const pendiente = { id: 1, promocionId: 1, destinatarioUserId: 100, rol: "jefe", intentos: 2, passwordTemporalEnClaro: "PASSTEMP12AB" };
    const destinatario = { email: "jefe@example.com", nombre: "Ana Lopez", curp: "AAAA000101HDFXXX01" };
    const trabajador = { nombreCompleto: "Beto Ruiz" };
    const { tx, calls } = makeTxRecorder([[pendiente], [destinatario], [trabajador]], []);
    const fakeDb = { select: tx.select, update: tx.update };
    const { drizzle } = await import("drizzle-orm/mysql2");
    vi.mocked(drizzle).mockReturnValue(fakeDb as any);
    const { enviarCorreoEvaluador } = await import("./lib/email");
    vi.mocked(enviarCorreoEvaluador).mockResolvedValue({ ok: false, error: "timeout" });

    const { procesarLotePendientesCorreo } = await import("./db");
    const resultado = await procesarLotePendientesCorreo();
    expect(resultado).toEqual({ procesados: 1, enviados: 0, fallidos: 1 });
    expect(calls).toContain("update");
  });
});
