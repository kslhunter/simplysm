import { describe, it, expect, afterAll } from "vitest";
import esbuild from "esbuild";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import fs from "fs";
import os from "os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.resolve(__dirname, "..", "fixture");
const ENTRY = path.join(FIXTURE_DIR, "entry.js");

/** Replicates client env define from sd-cli (esbuild-client-config) for integration testing */
function envDefine(env: Record<string, string>): Record<string, string> {
  return { "import.meta.env": JSON.stringify(env) };
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-cli-client-test-"));

/**
 * 빌드된 ESM 번들을 순수 node 자식 프로세스에서 평가해 export 값을 반환한다.
 * (vitest 환경이 번들에 import.meta.env를 주입하는 것을 피하기 위해 프로세스를 격리한다)
 */
function evalModuleExports(outFile: string): { DEV?: string; VER?: string } {
  const runner = path.join(tmpDir, `run-${path.basename(outFile)}`);
  fs.writeFileSync(
    runner,
    `import * as m from ${JSON.stringify(pathToFileURL(outFile).href)};` +
      `process.stdout.write(JSON.stringify({ DEV: m.DEV, VER: m.VER }));`,
  );
  return JSON.parse(execSync(`node "${runner}"`, { encoding: "utf-8" }));
}

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("esbuild define env 주입 통합 테스트", () => {
  it("define으로 주입한 import.meta.env가 빌드 결과에 반영된다", async () => {
    const outFile = path.join(tmpDir, "define-basic.mjs");

    await esbuild.build({
      entryPoints: [ENTRY],
      outfile: outFile,
      format: "esm",
      platform: "browser",
      bundle: true,
      define: envDefine({ DEV: "true", VER: "1.0.0" }),
    });

    const result = evalModuleExports(outFile);
    expect(result.DEV).toBe("true");
    expect(result.VER).toBe("1.0.0");
  });

  it("env가 없으면 import.meta.env가 미정의로 동작한다 (정적 치환 없음)", async () => {
    const outFile = path.join(tmpDir, "no-define.mjs");

    await esbuild.build({
      entryPoints: [ENTRY],
      outfile: outFile,
      format: "esm",
      platform: "browser",
      bundle: true,
    });

    const result = evalModuleExports(outFile);
    expect(result.DEV).toBeUndefined();
    expect(result.VER).toBeUndefined();
  });
});
