import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";
import { cpx, fsx } from "@simplysm/core-node";
import { StorageFactory } from "@simplysm/storage";

const mocks = {
  execa: vi.spyOn(cpx, "spawn"),
  fsx: {
    readJson: vi.spyOn(fsx, "readJson"),
    copy: vi.spyOn(fsx, "copy"),
  },
  storageConnect: vi.spyOn(StorageFactory, "connect"),
};

import { runDeployment } from "../../src/commands/publish/deployment-phase";

const CWD = process.cwd();

function pkgPath(name: string): string {
  return path.resolve(CWD, `packages/${name}`);
}

function createLogger() {
  return {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    start: vi.fn(),
    success: vi.fn(),
    fail: vi.fn(),
  } as unknown as ReturnType<typeof import("consola").consola.withTag>;
}

describe("runDeployment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        return { name: "@simplysm/pkg-b", version: "14.0.1", dependencies: { "@simplysm/pkg-a": "~14.0.0" } };
      }
      return { name: "@simplysm/pkg-a", version: "14.0.1", dependencies: {} };
    }) as never);

    const logger = createLogger();
    await runDeployment(
      [
        { name: "pkg-a", path: pkgPath("pkg-a"), config: { type: "npm" } },
        { name: "pkg-b", path: pkgPath("pkg-b"), config: { type: "npm" } },
      ],
      "14.0.1",
      CWD,
      logger,
      false,
    );

    const aIdx = publishOrder.indexOf("pkg-a");
    const bIdx = publishOrder.indexOf("pkg-b");
    expect(aIdx).toBeLessThan(bIdx);
  });

  it("retries failed publish up to 3 times then sets exitCode", async () => {
    let publishAttempts = 0;
    mocks.execa.mockImplementation(() => {
      publishAttempts++;
      throw new Error("publish failed");
    });
    mocks.fsx.readJson.mockResolvedValue({
      name: "@simplysm/pkg-a",
      version: "14.0.1",
      dependencies: {},
    });

    const logger = createLogger();
    await runDeployment(
      [{ name: "pkg-a", path: pkgPath("pkg-a"), config: { type: "npm" } }],
      "14.0.1",
      CWD,
      logger,
      false,
    );

    expect(publishAttempts).toBe(3);
    expect(process.exitCode).toBe(1);
  });

  it("reports partially deployed packages on failure", async () => {
    mocks.fsx.readJson.mockImplementation(((p: string) => {
      const name = path.basename(path.dirname(p));
      return { name: `@simplysm/${name}`, version: "14.0.1", dependencies: {} };
    }) as never);

    // pkg-a succeeds, pkg-b fails
    mocks.execa.mockImplementation(
      ((_cmd: string, _args?: string[], opts?: { cwd?: string }) => {
        if (opts?.cwd?.includes("pkg-b")) {
          throw new Error("publish failed");
        }
        return { stdout: "", stderr: "", exitCode: 0 };
      }) as never,
    );

    const logger = createLogger();
    await runDeployment(
      [
        { name: "pkg-a", path: pkgPath("pkg-a"), config: { type: "npm" } },
        { name: "pkg-b", path: pkgPath("pkg-b"), config: { type: "npm" } },
      ],
      "14.0.1",
      CWD,
      logger,
      false,
    );

    expect(process.exitCode).toBe(1);
    // Should have logged error about partially deployed
    const errorCalls = (logger.error as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const hasPartialMsg = errorCalls.some((c: unknown[]) =>
      String(c[0]).includes("이미 배포된 패키지"),
    );
    expect(hasPartialMsg).toBe(true);
  });
});
