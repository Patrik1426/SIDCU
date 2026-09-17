import { vi, describe, it, expect } from "vitest";

vi.mock("dns/promises", () => ({ resolveMx: vi.fn() }));

describe("validarCorreoEvaluador", () => {
  it("rechaza formato invalido sin llegar a consultar DNS", async () => {
    const dns = await import("dns/promises");
    const { validarCorreoEvaluador } = await import("./validarCorreo");
    const resultado = await validarCorreoEvaluador("no-es-correo");
    expect(resultado).toEqual({ ok: false, error: "formato de correo inválido" });
    expect(dns.resolveMx).not.toHaveBeenCalled();
  });

  it("acepta si el dominio tiene registro MX", async () => {
    const dns = await import("dns/promises");
    vi.mocked(dns.resolveMx).mockResolvedValue([{ exchange: "mx.example.com", priority: 10 }]);
    const { validarCorreoEvaluador } = await import("./validarCorreo");
    const resultado = await validarCorreoEvaluador("persona@example.com");
    expect(resultado).toEqual({ ok: true });
  });

  it("rechaza si el dominio no tiene registro MX", async () => {
    const dns = await import("dns/promises");
    vi.mocked(dns.resolveMx).mockRejectedValue(new Error("ENOTFOUND"));
    const { validarCorreoEvaluador } = await import("./validarCorreo");
    const resultado = await validarCorreoEvaluador("persona@dominio-inventado-xyz.com");
    expect(resultado).toEqual({ ok: false, error: "el dominio del correo no existe" });
  });
});
