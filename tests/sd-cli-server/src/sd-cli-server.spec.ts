import { describe, it, expect, afterAll } from "vitest";
import esbuild from "esbuild";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import os from "os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.resolve(__dirname, "..", "fixture");
const ENTRY = path.join(FIXTURE_DIR, "entry.js");

/** Replicates createEnvBanner from sd-cli for integration testing */
function banner(env: Record<string, string>): string {
  return `for(const[__k,__v]of Object.entries(${JSON.stringify(env)})){process.env[__k]??=__v;}`;
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-cli-server-test-"));

/** Node.js 실행에 필요한 최소 env (DEV/VER 제거) */
function cleanEnv(): Record<string, string> {
  const env = { ...process.env } as Record<string, string>;
  delete env["DEV"];
  delete env["VER"];
  return env;
}

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("esbuild banner env 주입 통합 테스트", () => {
  it("banner로 주입한 env가 process.env spread에 반영된다", async () => {
    const outFile = path.join(tmpDir, "banner-basic.mjs");

    await esbuild.build({
      entryPoints: [ENTRY],
      outfile: outFile,
      format: "esm",
      platform: "node",
      bundle: true,
      banner: { js: banner({ DEV: "true", VER: "1.0.0" }) },
    });

    const output = execSync(`node "${outFile}"`, { encoding: "utf-8", env: cleanEnv() });
    const result = JSON.parse(output);

    expect(result.DEV).toBe("true");
    expect(result.VER).toBe("1.0.0");
  });

  it("런타임 ENV가 banner 값을 오버라이드한다 (??= semantics)", async () => {
    const outFile = path.join(tmpDir, "banner-override.mjs");

    await esbuild.build({
      entryPoints: [ENTRY],
      outfile: outFile,
      format: "esm",
      platform: "node",
      bundle: true,
      banner: { js: banner({ DEV: "true", VER: "1.0.0" }) },
    });

    const output = execSync(`node "${outFile}"`, {
      encoding: "utf-8",
      env: { ...cleanEnv(), DEV: "false" },
    });
    const result = JSON.parse(output);

    expect(result.DEV).toBe("false");
    expect(result.VER).toBe("1.0.0");
  });

  it("env가 없으면 banner 없이 빌드된다 (process.env는 런타임 값 사용)", async () => {
    const outFile = path.join(tmpDir, "no-banner.mjs");

    await esbuild.build({
      entryPoints: [ENTRY],
      outfile: outFile,
      format: "esm",
      platform: "node",
      bundle: true,
    });

    const output = execSync(`node "${outFile}"`, {
      encoding: "utf-8",
      env: { ...cleanEnv(), DEV: "true", VER: "2.0.0" },
    });
    const result = JSON.parse(output);

    expect(result.DEV).toBe("true");
    expect(result.VER).toBe("2.0.0");
  });
});
