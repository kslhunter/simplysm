import { describe, it, expect, afterAll } from "vitest";
import { createServer, build, type ViteDevServer, type Rollup } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.resolve(__dirname, "..", "fixture");

const ENV_DEFINE: Record<string, string> = {
  "import.meta.env.DEV": '"true"',
  "import.meta.env.VER": '"1.0.0"',
};

describe("Vite define env 주입 통합 테스트", () => {
  describe("dev 모드 (transformRequest)", () => {
    let server: ViteDevServer | undefined;

    afterAll(async () => {
      if (server != null) {
        await server.close();
      }
    });

    it("import.meta.env spread에 define 값이 반영된다", async () => {
      server = await createServer({
        root: FIXTURE_DIR,
        logLevel: "silent",
        server: { middlewareMode: true },
        define: ENV_DEFINE,
        optimizeDeps: { noDiscovery: true },
      });

      const result = await server.transformRequest("/entry.js");
      expect(result).not.toBeNull();

      // dev 모드에서 Vite가 import.meta.env에 값을 주입한다
      expect(result!.code).toContain("true");
      expect(result!.code).toContain("1.0.0");
    });
  });

  describe("build 모드 (vite build)", () => {
    it("import.meta.env spread가 빌드 결과물에 인라인된다", async () => {
      const result = await build({
        root: FIXTURE_DIR,
        logLevel: "silent",
        define: ENV_DEFINE,
        build: {
          write: false,
          minify: false,
          lib: {
            entry: path.join(FIXTURE_DIR, "entry.js"),
            formats: ["es"],
            fileName: "entry",
          },
        },
      });

      const rollupOutput = Array.isArray(result) ? result[0] : (result as Rollup.RollupOutput);
      const output = rollupOutput.output[0];
      const code = output.code;

      // build 모드에서 import.meta.env가 객체 리터럴로 치환된다
      expect(code).not.toContain("import.meta.env");
      expect(code).toContain("true");
      expect(code).toContain("1.0.0");
    });
  });
});
