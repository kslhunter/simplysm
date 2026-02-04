import { describe, it, expect } from "vitest";

describe("env define", () => {
  describe("server build define", () => {
    it("should create define object from env config", () => {
      const env = { SD_VERSION: "1.0.0", __DEV__: "true" };
      const define: Record<string, string> = {};

      for (const [key, value] of Object.entries(env)) {
        define[`process.env["${key}"]`] = JSON.stringify(value);
      }

      expect(define).toEqual({
        'process.env["SD_VERSION"]': '"1.0.0"',
        'process.env["__DEV__"]': '"true"',
      });
    });
  });

  describe("client build define", () => {
    it("should create define object with process.env as object", () => {
      const env = { SD_VERSION: "1.0.0", __DEV__: "true" };
      const envDefine: Record<string, string> = {};
      envDefine["process.env"] = JSON.stringify(env);

      expect(envDefine).toEqual({
        "process.env": '{"SD_VERSION":"1.0.0","__DEV__":"true"}',
      });
    });
  });
});
