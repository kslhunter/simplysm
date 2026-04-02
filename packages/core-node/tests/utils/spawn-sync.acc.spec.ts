import { describe, expect, it } from "vitest";
import { spawnSync } from "../../src/utils/cp";

describe("spawnSync — stdio 배열 스트림별 개별 판단", () => {
  const CMD = "node";
  const WRITE_BOTH = ["-e", "process.stdout.write('out'); process.stderr.write('err')"];

  it("배열 stdio에서 stdout만 pipe", () => {
    const result = spawnSync(CMD, WRITE_BOTH, {
      stdio: ["ignore", "pipe", "inherit"],
    });
    expect(result.stdout).toBe("out");
    expect(result.stderr).toBe("");
  });

  it("배열 stdio에서 stderr만 pipe", () => {
    const result = spawnSync(CMD, WRITE_BOTH, {
      stdio: ["ignore", "inherit", "pipe"],
    });
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("err");
  });

  it("배열 stdio에서 전부 pipe", () => {
    const result = spawnSync(CMD, WRITE_BOTH, {
      stdio: ["pipe", "pipe", "pipe"],
    });
    expect(result.stdout).toBe("out");
    expect(result.stderr).toBe("err");
  });
});
