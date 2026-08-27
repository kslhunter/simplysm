import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";
import { cpx, fsx } from "@simplysm/core-node";
import { StorageFactory } from "@simplysm/storage";

const mocks = {
  execa: vi.spyOn(cpx, "spawn"),
  fsx: {
    readJson: vi.spyOn(fsx, "readJson"),
    copy: vi.spyOn(fsx, "copy"),
    mkdir: vi.spyOn(fsx, "mkdir"),
    readdir: vi.spyOn(fsx, "readdir"),
    rm: vi.spyOn(fsx, "rm"),
  },
  storageConnect: vi.spyOn(StorageFactory, "connect"),
};

import { runDeployment } from "../../src/commands/publish/deployment-phase";

const CWD = process.cwd();

function pkgPath(name: string): string {
  return path.resolve(CWD, `packages/${name}`);
}

function createMockLogger() {
  return {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    start: vi.fn(),
    success: vi.fn(),
    fail: vi.fn(),
  } as unknown as ReturnType<typeof import("@simplysm/core-common").createLogger>;
}

/** npm 호출 중 실제 배포(publish)만 골라낸다. dist-tag 조회(`npm view`)와 구분하기 위함 */
function isNpmPublish(cmd: string, args?: string[]): boolean {
  return cmd === "npm" && args?.[0] === "publish";
}

/** 독립 패키지들이 한 레벨에 오도록 의존성 없는 package.json 을 돌려준다 */
function mockIndependentPackages(): void {
  mocks.fsx.readJson.mockImplementation(((p: string) => {
    const name = path.basename(path.dirname(p));
    return { name: `@simplysm/${name}`, version: "14.0.1", dependencies: {} };
  }) as never);
}

describe("runDeployment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
    // npm 배포는 pnpm pack 이 만든 tarball 을 npm publish 로 올린다
    mocks.fsx.mkdir.mockResolvedValue(undefined);
    mocks.fsx.rm.mockResolvedValue(undefined);
    mocks.fsx.readdir.mockResolvedValue(["pkg-14.0.1.tgz"]);
    // clearAllMocks 는 호출 기록만 지우므로, 구현이 테스트 간에 새지 않도록 매번 초기화한다
    mocks.execa.mockImplementation((() => ({ stdout: "", stderr: "", exitCode: 0 })) as never);
    mocks.storageConnect.mockResolvedValue(undefined);
  });

  it("deploys packages in dependency level order", async () => {
    const publishOrder: string[] = [];
    mocks.execa.mockImplementation(
      ((_cmd: string, _args?: string[], opts?: { cwd?: string }) => {
        publishOrder.push(path.basename(opts?.cwd ?? ""));
        return { stdout: "", stderr: "", exitCode: 0 };
      }) as never,
    );
    mocks.fsx.readJson.mockImplementation(((p: string) => {
      if (p.includes("pkg-b")) {
        return {
          name: "@simplysm/pkg-b",
          version: "14.0.1",
          dependencies: { "@simplysm/pkg-a": "~14.0.0" },
        };
      }
      return { name: "@simplysm/pkg-a", version: "14.0.1", dependencies: {} };
    }) as never);

    const logger = createMockLogger();
    await runDeployment(
      [
        { name: "pkg-a", path: pkgPath("pkg-a"), config: { type: "npm" } },
        { name: "pkg-b", path: pkgPath("pkg-b"), config: { type: "npm" } },
      ],
      "14.0.1",
      CWD,
      logger,
      false,
      undefined,
    );

    const aIdx = publishOrder.indexOf("pkg-a");
    const bIdx = publishOrder.indexOf("pkg-b");
    expect(aIdx).toBeLessThan(bIdx);
  });

  it("runs npm publishes one at a time so their auth prompts cannot collide", async () => {
    mockIndependentPackages();

    let active = 0;
    let maxActive = 0;
    mocks.execa.mockImplementation(((cmd: string, args?: string[]) => {
      if (!isNpmPublish(cmd, args)) return { stdout: "", stderr: "", exitCode: 0 };
      active++;
      maxActive = Math.max(maxActive, active);
      return new Promise((resolve) => {
        setTimeout(() => {
          active--;
          resolve({ stdout: "", stderr: "", exitCode: 0 });
        }, 10);
      });
    }) as never);

    const logger = createMockLogger();
    await runDeployment(
      [
        { name: "pkg-a", path: pkgPath("pkg-a"), config: { type: "npm" } },
        { name: "pkg-b", path: pkgPath("pkg-b"), config: { type: "npm" } },
        { name: "pkg-c", path: pkgPath("pkg-c"), config: { type: "npm" } },
      ],
      "14.0.1",
      CWD,
      logger,
      false,
      undefined,
    );

    expect(maxActive).toBe(1);
    expect(process.exitCode).toBeUndefined();
  });

  it("still runs non-npm publishes in parallel", async () => {
    mockIndependentPackages();

    let active = 0;
    let maxActive = 0;
    mocks.storageConnect.mockImplementation(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active--;
    });

    const logger = createMockLogger();
    await runDeployment(
      [
        { name: "pkg-a", path: pkgPath("pkg-a"), config: { type: "ftp", host: "h" } },
        { name: "pkg-b", path: pkgPath("pkg-b"), config: { type: "ftp", host: "h" } },
      ],
      "14.0.1",
      CWD,
      logger,
      false,
      undefined,
    );

    expect(maxActive).toBe(2);
    expect(process.exitCode).toBeUndefined();
  });

  it("does not retry a failed npm publish", async () => {
    let publishAttempts = 0;
    mocks.execa.mockImplementation(((cmd: string, args?: string[]) => {
      if (!isNpmPublish(cmd, args)) return { stdout: "", stderr: "", exitCode: 0 };
      publishAttempts++;
      throw new Error("publish failed");
    }) as never);
    mocks.fsx.readJson.mockResolvedValue({
      name: "@simplysm/pkg-a",
      version: "14.0.1",
      dependencies: {},
    });

    const logger = createMockLogger();
    await runDeployment(
      [{ name: "pkg-a", path: pkgPath("pkg-a"), config: { type: "npm" } }],
      "14.0.1",
      CWD,
      logger,
      false,
      undefined,
    );

    // 재시도하면 npm 인증 UI 가 다시 뜨고, 인증·권한·버전 충돌은 재시도해도 같은 결과다
    expect(publishAttempts).toBe(1);
    expect(process.exitCode).toBe(1);
  });

  it("still retries a failed storage publish up to 3 times", async () => {
    mockIndependentPackages();
    let attempts = 0;
    mocks.storageConnect.mockImplementation(() => {
      attempts++;
      throw new Error("connection reset");
    });

    const logger = createMockLogger();
    await runDeployment(
      [{ name: "pkg-a", path: pkgPath("pkg-a"), config: { type: "ftp", host: "h" } }],
      "14.0.1",
      CWD,
      logger,
      false,
      undefined,
    );

    expect(attempts).toBe(3);
    expect(process.exitCode).toBe(1);
  });

  it("reports partially deployed packages on failure", async () => {
    mockIndependentPackages();

    // pkg-a succeeds, pkg-b fails
    mocks.execa.mockImplementation(
      ((cmd: string, args?: string[], opts?: { cwd?: string }) => {
        if (isNpmPublish(cmd, args) && opts?.cwd?.includes("pkg-b")) {
          throw new Error("publish failed");
        }
        return { stdout: "", stderr: "", exitCode: 0 };
      }) as never,
    );

    const logger = createMockLogger();
    await runDeployment(
      [
        { name: "pkg-a", path: pkgPath("pkg-a"), config: { type: "npm" } },
        { name: "pkg-b", path: pkgPath("pkg-b"), config: { type: "npm" } },
      ],
      "14.0.1",
      CWD,
      logger,
      false,
      undefined,
    );

    expect(process.exitCode).toBe(1);
    // Should have logged error about partially deployed
    const errorCalls = (logger.error as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const hasPartialMsg = errorCalls.some((c: unknown[]) =>
      String(c[0]).includes("이미 배포된 패키지"),
    );
    expect(hasPartialMsg).toBe(true);
  });

  it("passes the OTP through to npm publish", async () => {
    mockIndependentPackages();
    const npmArgs: string[][] = [];
    mocks.execa.mockImplementation(((cmd: string, args?: string[]) => {
      if (isNpmPublish(cmd, args)) npmArgs.push(args ?? []);
      return { stdout: "", stderr: "", exitCode: 0 };
    }) as never);

    const logger = createMockLogger();
    await runDeployment(
      [{ name: "pkg-a", path: pkgPath("pkg-a"), config: { type: "npm" } }],
      "14.0.1",
      CWD,
      logger,
      false,
      "123456",
    );

    expect(npmArgs[0][npmArgs[0].indexOf("--otp") + 1]).toBe("123456");
  });
});
