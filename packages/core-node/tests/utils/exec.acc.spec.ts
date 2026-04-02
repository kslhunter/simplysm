import { describe, expect, it } from "vitest";
import { spawn, spawnSync } from "../../src/utils/cp";

describe("spawn", () => {
  it("stdout를 캡처하여 반환", async () => {
    const result = await spawn("node", ["-e", "console.log('hello')"]);
    expect(result.stdout.trim()).toBe("hello");
    expect(result.exitCode).toBe(0);
  });

  it("stderr를 캡처하여 반환", async () => {
    const result = await spawn("node", ["-e", "console.error('err')"], { reject: false });
    expect(result.stderr.trim()).toBe("err");
  });

  it("reject: false 시 실패해도 결과 반환", async () => {
    const result = await spawn("node", ["-e", "process.exit(1)"], { reject: false });
    expect(result.exitCode).toBe(1);
  });

  it("기본 동작: 실패 시 예외 발생", async () => {
    await expect(spawn("node", ["-e", "process.exit(1)"])).rejects.toThrow();
  });

  it("shell 옵션으로 셸 명령 실행", async () => {
    const result = await spawn("echo hello", [], { shell: true });
    expect(result.stdout.trim()).toBe("hello");
  });

  it("kill()로 프로세스 종료", async () => {
    const proc = spawn("node", ["-e", "setTimeout(() => {}, 60000)"], { reject: false });
    proc.kill();
    const result = await proc;
    expect(result.exitCode).not.toBe(0);
  });

  it("env 옵션으로 환경변수 전달", async () => {
    const result = await spawn("node", ["-e", "console.log(process.env.TEST_VAR)"], {
      env: { TEST_VAR: "test_value" },
    });
    expect(result.stdout.trim()).toBe("test_value");
  });

  it("stdio inherit 모드에서 stdout/stderr 비어있음", async () => {
    const result = await spawn("node", ["-e", "console.log('hello')"], {
      stdio: "inherit",
      reject: false,
    });
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
  });
});

describe("spawnSync", () => {
  it("stdout를 동기적으로 반환", () => {
    const result = spawnSync("node", ["-v"]);
    expect(result.stdout.trim()).toMatch(/^v\d+/);
    expect(result.exitCode).toBe(0);
  });
});
