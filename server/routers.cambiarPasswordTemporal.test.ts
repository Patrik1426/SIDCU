import { vi, describe, it, expect, beforeEach } from "vitest";

// I5 (revision final de rama): cambiarPasswordTemporal no verificaba que el
// usuario tuviera passwordTemporal=true -- cualquier cuenta autenticada
// podia usarla como cambio de password self-service sin password actual.
// Este archivo no sigue el patron db.*.test.ts (mockear mysql2/drizzle) --
// el fix vive en el ROUTER (server/routers.ts), no en server/db.ts, y este
// repo no tenia hasta ahora ningun test a nivel router: se usa
// appRouter.createCaller() con "./db" y "./auth" mockeados por completo
// (evita el pool real de mysql2 y el pool de worker threads de bcrypt que
// auth.ts levanta al importarse).
vi.mock("./auth", () => ({
  hashPassword: vi.fn(async () => "hash-simulado"),
}));

vi.mock("./db", () => ({
  getUserById: vi.fn(),
  actualizarPasswordUsuario: vi.fn(),
  // La mutation real hace un import() dinamico de getDb para apagar
  // passwordTemporal despues de actualizarPasswordUsuario -- sin este stub
  // intentaria crear un pool mysql2 real.
  getDb: vi.fn(async () => ({
    update: () => ({ set: () => ({ where: () => Promise.resolve([{}]) }) }),
  })),
}));

beforeEach(() => {
  vi.resetModules();
});

describe("auth.cambiarPasswordTemporal", () => {
  it("rechaza con FORBIDDEN si el usuario no tiene passwordTemporal pendiente", async () => {
    const { getUserById, actualizarPasswordUsuario } = await import("./db");
    vi.mocked(getUserById).mockResolvedValue({ id: 1, passwordTemporal: false } as any);

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({ user: { id: 1, role: "user", email: null, nombre: "Ana" }, req: {} as any, res: {} as any } as any);

    let capturado: any;
    try {
      await caller.auth.cambiarPasswordTemporal({ nuevoPassword: "nuevopass123" });
    } catch (err) {
      capturado = err;
    }
    expect(capturado).toBeDefined();
    expect(capturado.code).toBe("FORBIDDEN");
    expect(actualizarPasswordUsuario).not.toHaveBeenCalled();
  });

  it("rechaza con FORBIDDEN si getUserById no encuentra al usuario (cuenta borrada a medio camino)", async () => {
    const { getUserById, actualizarPasswordUsuario } = await import("./db");
    vi.mocked(getUserById).mockResolvedValue(null as any);

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({ user: { id: 1, role: "user", email: null, nombre: "Ana" }, req: {} as any, res: {} as any } as any);

    let capturado: any;
    try {
      await caller.auth.cambiarPasswordTemporal({ nuevoPassword: "nuevopass123" });
    } catch (err) {
      capturado = err;
    }
    expect(capturado?.code).toBe("FORBIDDEN");
    expect(actualizarPasswordUsuario).not.toHaveBeenCalled();
  });

  it("permite el cambio si passwordTemporal es true", async () => {
    const { getUserById, actualizarPasswordUsuario } = await import("./db");
    vi.mocked(getUserById).mockResolvedValue({ id: 1, passwordTemporal: true } as any);

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({ user: { id: 1, role: "user", email: null, nombre: "Ana" }, req: {} as any, res: {} as any } as any);

    const resultado = await caller.auth.cambiarPasswordTemporal({ nuevoPassword: "nuevopass123" });
    expect(resultado).toEqual({ success: true });
    expect(actualizarPasswordUsuario).toHaveBeenCalledWith(1, "hash-simulado");
  });
});
