import { vi, describe, it, expect, beforeEach } from "vitest";

const sendMock = vi.fn();
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(() => ({ send: sendMock })),
  PutObjectCommand: vi.fn((input) => ({ input, __type: "Put" })),
  GetObjectCommand: vi.fn((input) => ({ input, __type: "Get" })),
  DeleteObjectCommand: vi.fn((input) => ({ input, __type: "Delete" })),
  HeadObjectCommand: vi.fn((input) => ({ input, __type: "Head" })),
}));
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(async (_client, cmd) => `https://signed.example/${cmd.__type}`),
}));

const ENV = {
  AWS_ACCESS_KEY_ID: "test-key",
  AWS_SECRET_ACCESS_KEY: "test-secret",
  AWS_REGION: "us-east-1",
  AWS_S3_BUCKET: "test-bucket",
};

describe("server/lib/s3", () => {
  beforeEach(() => {
    vi.resetModules();
    sendMock.mockReset();
    for (const [k, v] of Object.entries(ENV)) process.env[k] = v;
  });

  it("urlSubida regresa una URL firmada de PUT", async () => {
    const { urlSubida } = await import("./s3");
    const url = await urlSubida("inconformidad/1/2/abc.pdf", "application/pdf");
    expect(url).toBe("https://signed.example/Put");
  });

  it("verificarArchivo regresa existe:true con el tamano real cuando el objeto existe", async () => {
    sendMock.mockResolvedValueOnce({ ContentLength: 12345 });
    const { verificarArchivo } = await import("./s3");
    const res = await verificarArchivo("inconformidad/1/2/abc.pdf");
    expect(res).toEqual({ existe: true, tamanoBytes: 12345 });
  });

  it("verificarArchivo regresa existe:false solo en un 404 real", async () => {
    sendMock.mockRejectedValueOnce({ name: "NotFound" });
    const { verificarArchivo } = await import("./s3");
    const res = await verificarArchivo("inconformidad/1/2/abc.pdf");
    expect(res).toEqual({ existe: false });
  });

  it("verificarArchivo propaga cualquier otro error de AWS (no lo disfraza de 'no existe')", async () => {
    sendMock.mockRejectedValueOnce(new Error("403 forbidden"));
    const { verificarArchivo } = await import("./s3");
    await expect(verificarArchivo("x")).rejects.toThrow("403 forbidden");
  });

  it("revienta con mensaje claro si falta una variable de entorno", async () => {
    delete process.env.AWS_S3_BUCKET;
    const { urlSubida } = await import("./s3");
    await expect(urlSubida("k", "application/pdf")).rejects.toThrow("AWS_S3_BUCKET no está configurado");
  });

  it("borrarArchivoSeguro nunca lanza, solo loguea si falla", async () => {
    sendMock.mockRejectedValueOnce(new Error("boom"));
    const { borrarArchivoSeguro } = await import("./s3");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(borrarArchivoSeguro("k")).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("tieneEncabezadoPDF regresa true si los primeros bytes son la firma %PDF-", async () => {
    sendMock.mockResolvedValueOnce({ Body: { transformToByteArray: async () => new TextEncoder().encode("%PDF-") } });
    const { tieneEncabezadoPDF } = await import("./s3");
    await expect(tieneEncabezadoPDF("x")).resolves.toBe(true);
  });

  it("tieneEncabezadoPDF regresa false si el contenido real no es un PDF (aunque el nombre/tipo declarado diga que si)", async () => {
    sendMock.mockResolvedValueOnce({ Body: { transformToByteArray: async () => new TextEncoder().encode("hola!") } });
    const { tieneEncabezadoPDF } = await import("./s3");
    await expect(tieneEncabezadoPDF("x")).resolves.toBe(false);
  });

  it("tieneEncabezadoPDF regresa false si la respuesta no trae Body", async () => {
    sendMock.mockResolvedValueOnce({});
    const { tieneEncabezadoPDF } = await import("./s3");
    await expect(tieneEncabezadoPDF("x")).resolves.toBe(false);
  });
});
