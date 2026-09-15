import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";
import semver from "semver";
import { cpx, fsx } from "@simplysm/core-node";

const mocks = {
  spawn: vi.spyOn(cpx, "spawn"),
  mkdir: vi.spyOn(fsx, "mkdir"),
  readdir: vi.spyOn(fsx, "readdir"),
  rm: vi.spyOn(fsx, "rm"),
  readJson: vi.spyOn(fsx, "readJson"),
};

import { publishNpm } from "../../src/commands/publish/npm-publisher";

const TARBALL = "simplysm-pkg-a-14.0.1.tgz";

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

interface SpawnCall {
  cmd: string;
  args: string[];
  opts: { cwd?: string; stdio?: unknown };
}

/**
 * cpx.spawn 호출을 수집한다.
 *
 * `npm view <pkg> dist-tags.latest` 응답만 `registryLatest` 로 흉내내고, 나머지는 성공 처리한다.
 * 반환 배열에는 publish 파이프라인 호출(pack, publish)만 담긴다.
 */
function captureSpawns(registryLatest?: string): SpawnCall[] {
  const calls: SpawnCall[] = [];
  mocks.spawn.mockImplementation(((
    cmd: string,
    args?: string[],
    opts?: { cwd?: string; stdio?: unknown },
  ) => {
    const argList = args ?? [];
    if (cmd === "npm" && argList[0] === "view") {
      if (registryLatest == null) throw new Error("E404 not found");
      return { stdout: `${registryLatest}\n`, stderr: "", exitCode: 0 };
    }
    calls.push({ cmd, args: argList, opts: opts ?? {} });
    return { stdout: "", stderr: "", exitCode: 0 };
  }) as never);
  return calls;
}

describe("publishNpm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mkdir.mockResolvedValue(undefined);
    mocks.rm.mockResolvedValue(undefined);
    mocks.readdir.mockResolvedValue([TARBALL]);
    mocks.readJson.mockResolvedValue({ name: "@simplysm/pkg-a" });
  });

  it("packs with pnpm and publishes the tarball with npm", async () => {
    const calls = captureSpawns();

    const logger = createMockLogger();
    await publishNpm("/tmp/pkg-a", "pkg-a", "14.0.1", logger, false);

    expect(calls).toHaveLength(2);
    // workspace: 치환과 publishConfig 머지는 pnpm pack 이 해준다
    expect(calls[0].cmd).toBe("pnpm");
    expect(calls[0].args[0]).toBe("pack");
    // 2FA 인증은 npm 이 처리하므로 tarball 을 npm 으로 올린다
    expect(calls[1].cmd).toBe("npm");
    expect(calls[1].args[0]).toBe("publish");
    expect(calls[1].args.join(" ")).toContain(TARBALL);
    expect(calls[1].args[calls[1].args.indexOf("--access") + 1]).toBe("public");
  });

  it("looks up the registry latest by the npm package name, not the directory name", async () => {
    const viewed: string[] = [];
    mocks.spawn.mockImplementation(((cmd: string, args?: string[]) => {
      const argList = args ?? [];
      if (cmd === "npm" && argList[0] === "view") {
        viewed.push(argList[1]);
        return { stdout: "14.2.14\n", stderr: "", exitCode: 0 };
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    }) as never);
    mocks.readJson.mockResolvedValue({ name: "@simplysm/core-common" });

    const logger = createMockLogger();
    await publishNpm("/tmp/core-common", "core-common", "14.2.15", logger, false);

    expect(viewed).toEqual(['"@simplysm/core-common"']);
  });

  it("hands the terminal over to npm so it can run its own auth flow", async () => {
    const calls = captureSpawns();

    const logger = createMockLogger();
    await publishNpm("/tmp/pkg-a", "pkg-a", "14.0.1", logger, false);

    // pack 은 로그를 캡처하고, publish 는 TTY 를 그대로 물려준다
    expect(calls[0].opts.stdio).toBeUndefined();
    expect(calls[1].opts.stdio).toBe("inherit");
  });

  it("cleans up the temporary tarball directory when pack fails", async () => {
    mocks.spawn.mockImplementation(() => {
      throw new Error("pack failed");
    });

    const logger = createMockLogger();
    await expect(
      publishNpm("/tmp/pkg-a", "pkg-a", "14.0.1", logger, false),
    ).rejects.toThrow("pack failed");

    expect(mocks.rm).toHaveBeenCalledTimes(1);
    expect(String(mocks.rm.mock.calls[0][0])).toContain("sd-cli-pack-pkg-a");
  });

  it("cleans up the temporary tarball directory when publish fails", async () => {
    mocks.spawn.mockImplementation(((cmd: string, args?: string[]) => {
      if (cmd === "npm" && args?.[0] === "publish") throw new Error("publish failed");
      return { stdout: "", stderr: "", exitCode: 0 };
    }) as never);

    const logger = createMockLogger();
    await expect(
      publishNpm("/tmp/pkg-a", "pkg-a", "14.0.1", logger, false),
    ).rejects.toThrow("publish failed");

    expect(mocks.rm).toHaveBeenCalledTimes(1);
  });

  it("points to the npm output because stdio was handed over", async () => {
    mocks.spawn.mockImplementation(((cmd: string, args?: string[]) => {
      if (cmd === "npm" && args?.[0] === "publish") throw new Error("Command failed (exit 1)");
      return { stdout: "", stderr: "", exitCode: 0 };
    }) as never);

    const logger = createMockLogger();
    await expect(
      publishNpm("/tmp/pkg-a", "pkg-a", "14.0.1", logger, false),
    ).rejects.toThrow("위 npm 출력을 확인하세요");
  });

  it("does not let a cleanup failure hide the publish failure", async () => {
    mocks.spawn.mockImplementation(((cmd: string, args?: string[]) => {
      if (cmd === "npm" && args?.[0] === "publish") throw new Error("publish failed");
      return { stdout: "", stderr: "", exitCode: 0 };
    }) as never);
    mocks.rm.mockRejectedValue(new Error("EBUSY"));

    const logger = createMockLogger();
    await expect(
      publishNpm("/tmp/pkg-a", "pkg-a", "14.0.1", logger, false),
    ).rejects.toThrow("publish failed");
  });

  it("fails when pack produced no tarball", async () => {
    captureSpawns();
    mocks.readdir.mockResolvedValue([]);

    const logger = createMockLogger();
    await expect(
      publishNpm("/tmp/pkg-a", "pkg-a", "14.0.1", logger, false),
    ).rejects.toThrow("tarball 을 찾을 수 없습니다");
  });

  it("adds a prerelease tag from the version", async () => {
    const calls = captureSpawns();

    const logger = createMockLogger();
    await publishNpm("/tmp/pkg-a", "pkg-a", "14.0.1-beta.3", logger, false);

    const args = calls[1].args;
    expect(args[args.indexOf("--tag") + 1]).toBe("beta");
  });

  it("never lets a prerelease become latest, even with a numeric identifier", async () => {
    const calls = captureSpawns("14.0.0");

    const logger = createMockLogger();
    // semver.inc(v, "prerelease") 는 `14.3.0-1` 같은 숫자 식별자를 만든다
    await publishNpm("/tmp/pkg-a", "pkg-a", "14.3.0-1", logger, false);

    const args = calls[1].args;
    const tag = args[args.indexOf("--tag") + 1];
    expect(args).toContain("--tag");
    expect(semver.validRange(tag)).toBeNull();
  });

  it("adds a major tag when the registry latest is higher", async () => {
    const calls = captureSpawns("15.1.15");

    const logger = createMockLogger();
    await publishNpm("/tmp/pkg-a", "pkg-a", "14.2.15", logger, false);

    // latest 를 15.1.15 에서 끌어내리지 않으려면 별도 태그가 필요하다
    const args = calls[1].args;
    expect(args[args.indexOf("--tag") + 1]).toBe("latest-14");
  });

  it("never uses a tag name npm would read as a semver range", async () => {
    const calls = captureSpawns("15.1.15");

    const logger = createMockLogger();
    await publishNpm("/tmp/pkg-a", "pkg-a", "14.2.15", logger, false);

    // npm 은 `v14`, `14.x` 처럼 범위로 해석되는 이름을 dist-tag 로 거부한다
    const args = calls[1].args;
    expect(semver.validRange(args[args.indexOf("--tag") + 1])).toBeNull();
  });

  it("does not tag when the version becomes the new latest", async () => {
    const calls = captureSpawns("14.2.14");

    const logger = createMockLogger();
    await publishNpm("/tmp/pkg-a", "pkg-a", "14.2.15", logger, false);

    expect(calls[1].args).not.toContain("--tag");
  });

  it("does not tag a package that was never published", async () => {
    const calls = captureSpawns();

    const logger = createMockLogger();
    await publishNpm("/tmp/pkg-a", "pkg-a", "14.2.15", logger, false);

    expect(calls[1].args).not.toContain("--tag");
  });

  it("keeps the original stack when publish fails", async () => {
    mocks.spawn.mockImplementation(((cmd: string) => {
      if (cmd === "pnpm") return { stdout: "", stderr: "", exitCode: 0 };
      const err = new Error("Command failed (exit 1)");
      err.stack = "Error: publish failed\n    at spawnedByNpmPublish (cp.ts:1:1)";
      throw err;
    }) as never);

    const logger = createMockLogger();
    const err = await publishNpm("/tmp/pkg-a", "pkg-a", "14.0.1", logger, false).then(
      () => null,
      (e: unknown) => e,
    );

    expect((err as Error).stack ?? "").toContain("spawnedByNpmPublish");
  });

  it("adds --dry-run instead of publishing for real", async () => {
    const calls = captureSpawns();

    const logger = createMockLogger();
    await publishNpm("/tmp/pkg-a", "pkg-a", "14.0.1", logger, true);

    expect(calls[1].args).toContain("--dry-run");
  });

  it("quotes paths so spaces cannot split the shell command", async () => {
    const calls = captureSpawns();

    const logger = createMockLogger();
    await publishNpm("/tmp/pkg-a", "pkg-a", "14.0.1", logger, false);

    const packDest = calls[0].args[calls[0].args.indexOf("--pack-destination") + 1];
    expect(packDest.startsWith('"')).toBe(true);
    expect(packDest.endsWith('"')).toBe(true);
    expect(calls[1].args[1]).toBe(`"${path.join(packDest.slice(1, -1), TARBALL)}"`);
  });
});
