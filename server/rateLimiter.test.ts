import { describe, it, expect } from "vitest";
import { extraerCurp } from "./middleware/rateLimiter";
import type { Request } from "express";

function makeReq(body: any): Request {
  return { body } as Request;
}

describe("extraerCurp", () => {
  it("extrae curp de un body directo (no batched)", () => {
    expect(extraerCurp(makeReq({ curp: "peju900101hdfrxn01", password: "x" }))).toBe("PEJU900101HDFRXN01");
  });

  it("extrae curp de un body batched con superjson (body['0'].json.curp)", () => {
    expect(extraerCurp(makeReq({ "0": { json: { curp: "peju900101hdfrxn01", password: "x" } } }))).toBe(
      "PEJU900101HDFRXN01",
    );
  });

  it("extrae curp de un body envuelto directo en json (sin indice de batch)", () => {
    expect(extraerCurp(makeReq({ json: { curp: "peju900101hdfrxn01" } }))).toBe("PEJU900101HDFRXN01");
  });

  it("retorna null si no hay body", () => {
    expect(extraerCurp(makeReq(undefined))).toBeNull();
  });

  it("retorna null si el body no trae curp en ninguna forma reconocida", () => {
    expect(extraerCurp(makeReq({ foo: "bar" }))).toBeNull();
  });

  it("retorna null si curp viene vacio o solo espacios", () => {
    expect(extraerCurp(makeReq({ curp: "   " }))).toBeNull();
  });

  it("recorta espacios y normaliza a mayusculas", () => {
    expect(extraerCurp(makeReq({ curp: "  peju900101hdfrxn01  " }))).toBe("PEJU900101HDFRXN01");
  });
});
