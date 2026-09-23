import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./db", () => ({
  estadoRestriccionEvaluador: vi.fn(),
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("protectedProcedureSinRestriccion", () => {
  it("rechaza con FORBIDDEN si la cuenta esta restringida", async () => {
    const { estadoRestriccionEvaluador } = await import("./db");
    vi.mocked(estadoRestriccionEvaluador).mockResolvedValue({ restringido: true });

    const { router, protectedProcedureSinRestriccion } = await import("./trpc");
    const testRouter = router({
      test: protectedProcedureSinRestriccion.query(() => "ok"),
    });

    const caller = testRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: { id: 1, email: null, role: "user", nombre: "Fernando" },
    });

    await expect(caller.test()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("deja pasar si la cuenta no esta restringida", async () => {
    const { estadoRestriccionEvaluador } = await import("./db");
    vi.mocked(estadoRestriccionEvaluador).mockResolvedValue({ restringido: false });

    const { router, protectedProcedureSinRestriccion } = await import("./trpc");
    const testRouter = router({
      test: protectedProcedureSinRestriccion.query(() => "ok"),
    });

    const caller = testRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: { id: 2, email: null, role: "user", nombre: "Diego" },
    });

    await expect(caller.test()).resolves.toBe("ok");
  });

  it("rechaza con UNAUTHORIZED si no hay usuario, sin llegar a consultar la restriccion", async () => {
    const { estadoRestriccionEvaluador } = await import("./db");

    const { router, protectedProcedureSinRestriccion } = await import("./trpc");
    const testRouter = router({
      test: protectedProcedureSinRestriccion.query(() => "ok"),
    });

    const caller = testRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: null,
    });

    await expect(caller.test()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(estadoRestriccionEvaluador).not.toHaveBeenCalled();
  });
});
