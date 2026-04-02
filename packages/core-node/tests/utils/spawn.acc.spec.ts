import { describe, expect, it } from "vitest";
import { spawn } from "../../src/utils/cp";

describe("spawn — stdio 배열 스트림별 개별 판단", () => {
  const CMD = "node";
  const WRITE_BOTH = ["-e", "process.stdout.write('out'); process.stderr.write('err')"];

  it("stdio='pipe'이면 stdout/stderr 모두 수집", async () => {
    const result = await spawn(CMD, WRITE_BOTH, { stdio: "pipe" });
    expect(result.stdout).toBe("out");
    expect(result.stderr).toBe("err");
  });

  it("stdio='inherit'이면 수집하지 않음", async () => {
    const result = await spawn(CMD, WRITE_BOTH, { stdio: "inherit" });
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });

  it("stdio 미지정이면 기본값 pipe로 동작", async () => {
    const result = await spawn(CMD, WRITE_BOTH);
    expect(result.stdout).toBe("out");
    expect(result.stderr).toBe("err");
  });

  it("stdout만 pipe", async () => {
    const result = await spawn(CMD, WRITE_BOTH, {
      stdio: ["ignore", "pipe", "inherit"],
    });
    expect(result.stdout).toBe("out");
    expect(result.stderr).toBe("");
  });

  it("stderr만 pipe", async () => {
    const result = await spawn(CMD, WRITE_BOTH, {
      stdio: ["ignore", "inherit", "pipe"],
    });
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("err");
  });

  it("전부 inherit", async () => {
    const result = await spawn(CMD, WRITE_BOTH, {
      stdio: ["ignore", "inherit", "inherit"],
    });
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });

  it("전부 pipe", async () => {
    const result = await spawn(CMD, WRITE_BOTH, {
      stdio: ["pipe", "pipe", "pipe"],
    });
    expect(result.stdout).toBe("out");
    expect(result.stderr).toBe("err");
  });
});
