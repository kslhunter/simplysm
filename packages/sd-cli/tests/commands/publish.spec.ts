import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "path";

const mocks = vi.hoisted(() => ({
  loadSdConfig: vi.fn(),
  runBuild: vi.fn(),
  parseWorkspaceGlobs: vi.fn(),
  execa: vi.fn(),
  fsx: {
    readJson: vi.fn(),
    write: vi.fn(),
    read: vi.fn(),
    exists: vi.fn(),
    glob: vi.fn(),
    copy: vi.fn(),
  },
  storageConnect: vi.fn(),
  SshClientInstance: {
    on: vi.fn(),
    connect: vi.fn(),
    end: vi.fn(),
    exec: vi.fn(),
  },
  SshClient: vi.fn(),
  sshUtils: {
    generateKeyPairSync: vi.fn(),
    parseKey: vi.fn(),
  },
  passwordPrompt: vi.fn(),
  fsExistsSync: vi.fn(),
  fsReadFileSync: vi.fn(),
  fsWriteFileSync: vi.fn(),
  fsMkdirSync: vi.fn(),
  homedir: vi.fn(),
}));

vi.mock("../../src/utils/sd-config", () => ({
  loadSdConfig: mocks.loadSdConfig,
}));

vi.mock("../../src/commands/build", () => ({
  runBuild: mocks.runBuild,
}));

vi.mock("../../src/deps/replace-deps/replace-deps", () => ({
  parseWorkspaceGlobs: mocks.parseWorkspaceGlobs,
}));

vi.mock("@simplysm/core-node", () => ({
  fsx: mocks.fsx,
  cpx: {
    spawn: mocks.execa,
    spawnSync: vi.fn().mockReturnValue({ stdout: "", stderr: "", exitCode: 0 }),
  },
}));

vi.mock("@simplysm/storage", () => ({
  StorageFactory: { connect: mocks.storageConnect },
}));

vi.mock("ssh2", () => {
  const ClientCtor = mocks.SshClient;
  return {
    default: {
      Client: ClientCtor,
      utils: mocks.sshUtils,
    },
  };
});

vi.mock("@inquirer/prompts", () => ({
  password: mocks.passwordPrompt,
}));

vi.mock("fs", async (importOriginal: () => Promise<Record<string, unknown>>) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: {
      ...(actual["default"] as Record<string, unknown>),
      existsSync: mocks.fsExistsSync,
      readFileSync: mocks.fsReadFileSync,
      writeFileSync: mocks.fsWriteFileSync,
      mkdirSync: mocks.fsMkdirSync,
    },
  };
});

vi.mock("os", async (importOriginal: () => Promise<Record<string, unknown>>) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: {
      ...(actual["default"] as Record<string, unknown>),
      homedir: mocks.homedir,
    },
  };
});

const { runPublish } = await import("../../src/commands/publish/publish-command");

const CWD = process.cwd();

function pkgPath(name: string): string {
  return path.resolve(CWD, `packages/${name}`);
}

function createPkgJson(
  name: string,
  version: string,
  deps: Record<string, string> = {},
): { name: string; version: string; dependencies: Record<string, string> } {
  return { name: `@simplysm/${name}`, version, dependencies: deps };
}

/**
 * Set up a default happy-path mock environment for npm publish
 */
function setupHappyPath(opts: {
  version?: string;
  packages?: Record<string, { publish?: { type: string; [k: string]: unknown }; target?: string }>;
  packageDeps?: Record<string, Record<string, string>>;
  templateFiles?: string[];
  hasGit?: boolean;
} = {}) {
  const version = opts.version ?? "14.0.0";
  const packages = opts.packages ?? {
    "pkg-a": { target: "node", publish: { type: "npm" } },
    "pkg-b": { target: "node", publish: { type: "npm" } },
  };
  const packageDeps = opts.packageDeps ?? {};
  const templateFiles = opts.templateFiles ?? [];
  const hasGit = opts.hasGit ?? true;
  const pkgNames = Object.keys(packages);

  // loadSdConfig
  mocks.loadSdConfig.mockResolvedValue({ packages });

  // parseWorkspaceGlobs
  mocks.parseWorkspaceGlobs.mockReturnValue(["packages/*"]);

  // fsx.readJson — route by path
  mocks.fsx.readJson.mockImplementation((p: string) => {
    const basename = path.basename(path.dirname(p));
    // Root package.json
    if (p === path.resolve(CWD, "package.json")) {
      return createPkgJson("simplysm", version);
    }
    // Package package.json
    if (pkgNames.includes(basename)) {
      return createPkgJson(basename, version, packageDeps[basename] ?? {});
    }
    throw new Error(`Unexpected readJson path: ${p}`);
  });

  // fsx.write
  mocks.fsx.write.mockResolvedValue(undefined);

  // fsx.read
  mocks.fsx.read.mockImplementation((p: string) => {
    if (p.includes("pnpm-workspace.yaml")) {
      return "packages:\n  - packages/*";
    }
    if (p.endsWith(".hbs")) {
      return `"@simplysm/core-common": "~${version}"`;
    }
    return "";
  });

  // fsx.exists
  mocks.fsx.exists.mockImplementation((p: string) => {
    if (p.endsWith("pnpm-workspace.yaml")) return true;
    if (p.endsWith(".git")) return hasGit;
    return false;
  });

  // fsx.glob
  mocks.fsx.glob.mockImplementation((pattern: string) => {
    if (pattern.includes("templates")) {
      return templateFiles.map((f) => path.resolve(CWD, f));
    }
    // packages/*
    return pkgNames.map((n) => pkgPath(n));
  });

  // fsx.copy
  mocks.fsx.copy.mockResolvedValue(undefined);

  // runBuild
  mocks.runBuild.mockResolvedValue(undefined);

  // execa — default: all succeed
  mocks.execa.mockImplementation(
    (cmd: string, _args?: string[], _opts?: unknown) => {
      if (cmd === "npm") return { stdout: "testuser", stderr: "", exitCode: 0 };
      return { stdout: "", stderr: "", exitCode: 0 };
    },
  );

  // SSH-related: not needed for npm-only, but set defaults
  mocks.homedir.mockReturnValue("/mock/home");
  mocks.fsExistsSync.mockImplementation((p: string) => {
    // package.json existence check for workspace package filtering
    if (p.endsWith("package.json")) {
      return pkgNames.some((n) => p.includes(n));
    }
    return true;
  });
  mocks.fsReadFileSync.mockReturnValue(new TextEncoder().encode("fake-key"));
  mocks.sshUtils.parseKey.mockReturnValue({});
}

/**
 * Get all execa calls matching a command prefix
 */
function getExecaCalls(
  cmd: string,
  firstArg?: string,
): Array<{ cmd: string; args: string[] }> {
  return mocks.execa.mock.calls
    .filter(
      (c: unknown[]) =>
        c[0] === cmd && (firstArg == null || (c[1] as string[] | undefined)?.[0] === firstArg),
    )
    .map((c: unknown[]) => ({ cmd: c[0] as string, args: (c[1] as string[] | undefined) ?? [] }));
}

describe("runPublish", () => {
  let savedExitCode: typeof process.exitCode;

  beforeEach(() => {
    vi.clearAllMocks();
    savedExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = savedExitCode;
  });

  describe("package selection", () => {
    it("publishes only targeted packages when targets specified", async () => {
      setupHappyPath();

      await runPublish({
        targets: ["pkg-a"],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      const publishCalls = getExecaCalls("pnpm", "publish");
      expect(publishCalls).toHaveLength(1);
      // The publish call should be for pkg-a's directory
      const call = mocks.execa.mock.calls.find(
        (c: unknown[]) => c[0] === "pnpm" && (c[1] as string[] | undefined)?.[0] === "publish",
      );
      expect(call?.[2]).toHaveProperty("cwd", pkgPath("pkg-a"));
      expect(call?.[2]).toHaveProperty("shell", true);
    });

    it("publishes all packages with publish config when targets empty", async () => {
      setupHappyPath();

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      const publishCalls = getExecaCalls("pnpm", "publish");
      expect(publishCalls).toHaveLength(2);
    });

    it("ignores packages without publish config", async () => {
      setupHappyPath({
        packages: {
          "pkg-a": { target: "node", publish: { type: "npm" } },
          "pkg-b": { target: "node" }, // no publish
        },
      });

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      const publishCalls = getExecaCalls("pnpm", "publish");
      expect(publishCalls).toHaveLength(1);
    });

    it("outputs no-op message when no packages to deploy", async () => {
      setupHappyPath({
        packages: {
          "pkg-a": { target: "node" }, // no publish
        },
      });

      const { consola } = await import("consola");
      const infoSpy = vi.fn();
      const origWithTag = consola.withTag.bind(consola);
      const withTagSpy = vi.spyOn(consola, "withTag").mockImplementation((tag: string) => {
        const logger = origWithTag(tag);
        logger.info = infoSpy as any;
        return logger;
      });

      // Re-import to pick up the spy (module already loaded, but logger is created at call time)
      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      const infoArgs = infoSpy.mock.calls.map((c: unknown[]) => String(c[0]));
      expect(infoArgs.some((a: string) => a.includes("배포할 패키지가 없습니다"))).toBe(true);
      withTagSpy.mockRestore();
    });
  });

  describe("pre-validation", () => {
    it("passes when npm whoami returns valid username", async () => {
      setupHappyPath();

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      expect(process.exitCode).toBeUndefined();
      expect(getExecaCalls("npm", "whoami")).toHaveLength(1);
      expect(mocks.execa).toHaveBeenCalledWith(
        "npm",
        ["whoami"],
        expect.objectContaining({ shell: true }),
      );
    });

    it("aborts when npm whoami fails", async () => {
      setupHappyPath();
      mocks.execa.mockImplementation((cmd: string) => {
        if (cmd === "npm") throw new Error("npm not authenticated");
        return { stdout: "", stderr: "", exitCode: 0 };
      });

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      expect(process.exitCode).toBe(1);
      // Should not reach build phase
      expect(mocks.runBuild).not.toHaveBeenCalled();
    });

    it("skips npm auth check when no npm publish packages", async () => {
      setupHappyPath({
        packages: {
          "pkg-a": {
            target: "node",
            publish: {
              type: "local-directory",
              path: "/deploy/%VER%",
            },
          },
        },
        hasGit: false,
      });

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      expect(getExecaCalls("npm", "whoami")).toHaveLength(0);
    });

    it("auto-commits with codex when uncommitted changes detected", async () => {
      setupHappyPath();
      mocks.execa.mockImplementation(
        (cmd: string, args?: string[], _opts?: unknown) => {
          if (cmd === "npm") return { stdout: "testuser", stderr: "", exitCode: 0 };
          if (cmd === "git" && args?.[0] === "diff") {
            return { stdout: "file.txt", stderr: "", exitCode: 0 };
          }
          return { stdout: "", stderr: "", exitCode: 0 };
        },
      );

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      // codex CLI should have been called for auto-commit
      const codexCalls = mocks.execa.mock.calls.filter(
        (c: unknown[]) => c[0] === "codex",
      );
      expect(codexCalls).toHaveLength(1);
      expect((codexCalls[0][1] as string[])).toContain("exec");
      expect((codexCalls[0][1] as string[])).toContain("gpt-5.3-codex-spark");
      expect((codexCalls[0][1] as string[])).toContain('model_reasoning_effort="low"');
      expect((codexCalls[0][1] as string[]).some((arg) => arg.includes("$sd-commit"))).toBe(true);
    });

    it("aborts when auto-commit codex command fails", async () => {
      setupHappyPath();
      mocks.execa.mockImplementation((cmd: string, args?: string[]) => {
        if (cmd === "npm") return { stdout: "testuser", stderr: "", exitCode: 0 };
        if (cmd === "git" && args?.[0] === "diff") {
          return { stdout: "file.txt", stderr: "", exitCode: 0 };
        }
        if (cmd === "codex") {
          throw new Error("codex commit failed");
        }
        return { stdout: "", stderr: "", exitCode: 0 };
      });

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      expect(process.exitCode).toBe(1);
    });

    it("skips auto-commit when no uncommitted changes", async () => {
      setupHappyPath();

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      // No codex CLI calls
      const codexCalls = mocks.execa.mock.calls.filter(
        (c: unknown[]) => c[0] === "codex",
      );
      expect(codexCalls).toHaveLength(0);
    });
  });

  describe("version upgrade and git", () => {
    it("increments patch for stable version", async () => {
      setupHappyPath({ version: "14.0.0" });

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      // Check that fsx.write was called with new version
      const writeCalls = mocks.fsx.write.mock.calls;
      const rootPkgWrite = writeCalls.find((c: unknown[]) =>
        (c[0] as string).endsWith("package.json") &&
        !(c[0] as string).includes("packages/"),
      );
      expect(rootPkgWrite).toBeDefined();
      expect(rootPkgWrite![1]).toContain('"14.0.1"');
    });

    it("increments prerelease for prerelease version", async () => {
      setupHappyPath({ version: "14.0.0-beta.1" });

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      const writeCalls = mocks.fsx.write.mock.calls;
      const rootPkgWrite = writeCalls.find((c: unknown[]) =>
        (c[0] as string).endsWith("package.json") &&
        !(c[0] as string).includes("packages/"),
      );
      expect(rootPkgWrite).toBeDefined();
      expect(rootPkgWrite![1]).toContain('"14.0.0-beta.2"');
    });

    it("syncs version across all workspace packages", async () => {
      setupHappyPath({ version: "14.0.0" });

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      // Each package's package.json should be written with new version
      const writeCalls = mocks.fsx.write.mock.calls.filter((c: unknown[]) => {
        const p = (c[0] as string).replace(/\\/g, "/");
        return p.includes("packages/") && p.endsWith("package.json");
      });
      expect(writeCalls.length).toBeGreaterThanOrEqual(2);
      for (const call of writeCalls) {
        expect(call[1]).toContain('"14.0.1"');
      }
    });

    it("syncs @simplysm version in template files", async () => {
      setupHappyPath({
        version: "14.0.0",
        templateFiles: ["packages/sd-cli/templates/test.hbs"],
      });

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      // Template file should be written with updated version
      const templateWrite = mocks.fsx.write.mock.calls.find((c: unknown[]) =>
        (c[0] as string).endsWith(".hbs"),
      );
      expect(templateWrite).toBeDefined();
      expect(templateWrite![1]).toContain("~14.0.1");
    });

    it("commits version files and creates annotated tag", async () => {
      setupHappyPath({ version: "14.0.0" });

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      const commitCalls = getExecaCalls("git", "commit");
      expect(commitCalls).toHaveLength(1);
      expect(commitCalls[0].args).toContain("v14.0.1");

      const tagCalls = getExecaCalls("git", "tag");
      expect(tagCalls).toHaveLength(1);
      expect(tagCalls[0].args).toContain("v14.0.1");
      expect(tagCalls[0].args).toContain("-a");

      expect(getExecaCalls("git", "push")).toHaveLength(2); // push + push --tags
    });

    it("skips git operations when .git directory absent", async () => {
      setupHappyPath({ hasGit: false });

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      expect(getExecaCalls("git", "commit")).toHaveLength(0);
      expect(getExecaCalls("git", "tag")).toHaveLength(0);
      // Should still publish
      expect(getExecaCalls("pnpm", "publish").length).toBeGreaterThan(0);
    });

    it("aborts with recovery message when git operations fail", async () => {
      setupHappyPath();
      mocks.execa.mockImplementation((cmd: string, args?: string[]) => {
        if (cmd === "npm") return { stdout: "testuser", stderr: "", exitCode: 0 };
        if (cmd === "git" && args?.[0] === "commit") {
          throw new Error("git commit failed");
        }
        return { stdout: "", stderr: "", exitCode: 0 };
      });

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      expect(process.exitCode).toBe(1);
      expect(getExecaCalls("pnpm", "publish")).toHaveLength(0);
    });
  });

  describe("deployment", () => {
    it("publishes npm stable version without --tag", async () => {
      setupHappyPath({ version: "14.0.0" });

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      const publishCalls = getExecaCalls("pnpm", "publish");
      expect(publishCalls.length).toBeGreaterThan(0);
      for (const call of publishCalls) {
        expect(call.args).toContain("--access");
        expect(call.args).toContain("public");
        expect(call.args).toContain("--no-git-checks");
        expect(call.args).not.toContain("--tag");
      }
    });

    it("publishes npm prerelease version with --tag", async () => {
      setupHappyPath({ version: "14.0.0-beta.1" });

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      const publishCalls = getExecaCalls("pnpm", "publish");
      expect(publishCalls.length).toBeGreaterThan(0);
      for (const call of publishCalls) {
        expect(call.args).toContain("--tag");
        expect(call.args).toContain("beta");
      }
    });

    it("copies dist to local directory with env var substitution", async () => {
      setupHappyPath({
        version: "14.0.0",
        packages: {
          "pkg-a": {
            target: "node",
            publish: { type: "local-directory", path: "/deploy/%VER%" },
          },
        },
        hasGit: false,
      });

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      expect(mocks.fsx.copy).toHaveBeenCalledWith(
        path.resolve(pkgPath("pkg-a"), "dist"),
        "/deploy/14.0.1",
      );
    });

    it("uploads dist to SFTP server", async () => {
      setupHappyPath({
        version: "14.0.0",
        packages: {
          "pkg-a": {
            target: "node",
            publish: {
              type: "sftp",
              host: "example.com",
              port: 22,
              user: "deploy",
              password: "secret",
              path: "/app",
            },
          },
        },
        hasGit: false,
      });

      mocks.storageConnect.mockImplementation(
        async (
          _type: string,
          _opts: unknown,
          cb: (storage: { uploadDir: (...args: unknown[]) => Promise<void> }) => Promise<void>,
        ) => {
          await cb({ uploadDir: vi.fn() });
        },
      );

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      expect(mocks.storageConnect).toHaveBeenCalledWith(
        "sftp",
        expect.objectContaining({ host: "example.com" }),
        expect.any(Function),
      );
    });

    it("uploads to root path when remote path is not specified", async () => {
      setupHappyPath({
        version: "14.0.0",
        packages: {
          "pkg-a": {
            target: "node",
            publish: {
              type: "sftp",
              host: "example.com",
              user: "deploy",
              password: "secret",
            },
          },
        },
        hasGit: false,
      });

      let uploadedPath: string | undefined;
      mocks.storageConnect.mockImplementation(
        async (
          _type: string,
          _opts: unknown,
          cb: (storage: { uploadDir: (src: string, dest: string) => Promise<void> }) => Promise<void>,
        ) => {
          await cb({
            uploadDir: vi.fn((_src: string, dest: string) => {
              uploadedPath = dest;
              return Promise.resolve();
            }),
          });
        },
      );

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      expect(uploadedPath).toBe("/");
    });

    it("deploys packages in dependency order (Level 0 before Level 1)", async () => {
      setupHappyPath({
        packages: {
          "pkg-a": { target: "node", publish: { type: "npm" } },
          "pkg-b": { target: "node", publish: { type: "npm" } },
        },
        packageDeps: {
          "pkg-a": {},
          "pkg-b": { "@simplysm/pkg-a": "~14.0.0" },
        },
      });

      const publishOrder: string[] = [];
      mocks.execa.mockImplementation(
        (cmd: string, args?: string[], opts?: { cwd?: string }) => {
          if (cmd === "pnpm" && args?.[0] === "publish") {
            publishOrder.push(path.basename(opts?.cwd ?? ""));
          }
          if (cmd === "npm") return { stdout: "testuser", stderr: "", exitCode: 0 };
          return { stdout: "", stderr: "", exitCode: 0 };
        },
      );

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      const aIdx = publishOrder.indexOf("pkg-a");
      const bIdx = publishOrder.indexOf("pkg-b");
      expect(aIdx).toBeLessThan(bIdx);
    });

    it("only tracks @simplysm scoped dependencies for level computation", async () => {
      setupHappyPath({
        packages: {
          "pkg-a": { target: "node", publish: { type: "npm" } },
        },
        packageDeps: {
          // External dep should not affect level
          "pkg-a": { "lodash": "^4.0.0" },
        },
      });

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      // Should succeed without issues (lodash doesn't create level dependency)
      expect(process.exitCode).toBeUndefined();
      expect(getExecaCalls("pnpm", "publish")).toHaveLength(1);
    });

    it("retries failed publish up to 3 times then reports error", async () => {
      setupHappyPath({
        packages: {
          "pkg-a": { target: "node", publish: { type: "npm" } },
        },
      });

      let publishAttempts = 0;
      mocks.execa.mockImplementation(
        (cmd: string, args?: string[]) => {
          if (cmd === "pnpm" && args?.[0] === "publish") {
            publishAttempts++;
            throw new Error("publish failed");
          }
          if (cmd === "npm") return { stdout: "testuser", stderr: "", exitCode: 0 };
          return { stdout: "", stderr: "", exitCode: 0 };
        },
      );

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      expect(publishAttempts).toBe(3);
      expect(process.exitCode).toBe(1);
    });

    it("succeeds on retry after initial failure", async () => {
      setupHappyPath({
        packages: {
          "pkg-a": { target: "node", publish: { type: "npm" } },
        },
      });

      let publishAttempts = 0;
      mocks.execa.mockImplementation(
        (cmd: string, args?: string[]) => {
          if (cmd === "pnpm" && args?.[0] === "publish") {
            publishAttempts++;
            if (publishAttempts === 1) throw new Error("temporary failure");
            return { stdout: "", stderr: "", exitCode: 0 };
          }
          if (cmd === "npm") return { stdout: "testuser", stderr: "", exitCode: 0 };
          return { stdout: "", stderr: "", exitCode: 0 };
        },
      );

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      expect(publishAttempts).toBe(2);
      expect(process.exitCode).toBeUndefined();
    });
  });

  describe("noBuild, dry-run, postPublish", () => {
    it("skips version upgrade, build, and git when noBuild is true", async () => {
      setupHappyPath();

      await runPublish({
        targets: [],
        noBuild: true,
        dryRun: false,
        options: [],
      });

      // No version upgrade (fsx.write for package.json should not be called)
      const versionWrites = mocks.fsx.write.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).endsWith("package.json"),
      );
      expect(versionWrites).toHaveLength(0);

      // No build
      expect(mocks.runBuild).not.toHaveBeenCalled();

      // No git commit/tag
      expect(getExecaCalls("git", "commit")).toHaveLength(0);
      expect(getExecaCalls("git", "tag")).toHaveLength(0);

      // But still publishes
      expect(getExecaCalls("pnpm", "publish").length).toBeGreaterThan(0);
    });

    it("skips git uncommitted check when noBuild is true", async () => {
      setupHappyPath();
      mocks.execa.mockImplementation((cmd: string, args?: string[]) => {
        if (cmd === "npm") return { stdout: "testuser", stderr: "", exitCode: 0 };
        if (cmd === "git" && args?.[0] === "diff") {
          return { stdout: "changed-file.txt", stderr: "", exitCode: 0 };
        }
        return { stdout: "", stderr: "", exitCode: 0 };
      });

      await runPublish({
        targets: [],
        noBuild: true,
        dryRun: false,
        options: [],
      });

      // Should not auto-commit since noBuild skips the check
      const autoCommitCalls = mocks.execa.mock.calls.filter(
        (c: unknown[]) => c[0] === "git" && (c[1] as string[])[0] === "add",
      );
      expect(autoCommitCalls).toHaveLength(0);
      // Should succeed
      expect(process.exitCode).toBeUndefined();
    });

    it("builds only publish-configured packages", async () => {
      setupHappyPath({
        packages: {
          "pkg-a": { target: "node", publish: { type: "npm" } },
          "pkg-b": { target: "node", publish: { type: "npm" } },
          "pkg-c": { target: "node" }, // no publish
        },
      });

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      // publish 설정이 없는 pkg-c는 배포되지 않아야 한다
      const publishCalls = getExecaCalls("pnpm", "publish");
      expect(publishCalls).toHaveLength(2);
      const publishCwds = mocks.execa.mock.calls
        .filter((c: unknown[]) => {
          const args = c[1] as string[] | undefined;
          return c[0] === "pnpm" && args != null && args[0] === "publish";
        })
        .map((c: unknown[]) => {
          const opts = c[2] as { cwd?: string } | undefined;
          return opts != null ? (opts.cwd ?? "") : "";
        });
      for (const cwd of publishCwds) {
        expect(cwd).not.toContain("pkg-c");
      }
    });

    it("aborts with recovery message when build fails", async () => {
      setupHappyPath();
      mocks.runBuild.mockRejectedValue(new Error("build failed"));

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      expect(process.exitCode).toBe(1);
      expect(getExecaCalls("pnpm", "publish")).toHaveLength(0);
    });

    it("does not modify files in dry-run version upgrade", async () => {
      setupHappyPath({ version: "14.0.0" });

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: true,
        options: [],
      });

      // fsx.write should not be called for version changes
      const pkgJsonWrites = mocks.fsx.write.mock.calls.filter((c: unknown[]) =>
        (c[0] as string).endsWith("package.json"),
      );
      expect(pkgJsonWrites).toHaveLength(0);
    });

    it("adds --dry-run to pnpm publish in dry-run mode", async () => {
      setupHappyPath();

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: true,
        options: [],
      });

      const publishCalls = getExecaCalls("pnpm", "publish");
      expect(publishCalls.length).toBeGreaterThan(0);
      for (const call of publishCalls) {
        expect(call.args).toContain("--dry-run");
      }
    });

    it("executes postPublish scripts with env var substitution", async () => {
      setupHappyPath({ version: "14.0.0" });
      mocks.loadSdConfig.mockResolvedValue({
        packages: {
          "pkg-a": { target: "node", publish: { type: "npm" } },
        },
        postPublish: [
          { type: "script", cmd: "echo", args: ["v%VER%"] },
        ],
      });

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      const echoCalls = mocks.execa.mock.calls.filter(
        (c: unknown[]) => c[0] === "echo",
      );
      expect(echoCalls).toHaveLength(1);
      expect(echoCalls[0][1]).toEqual(["v14.0.1"]);
    });

    it("warns but does not fail when postPublish script fails", async () => {
      setupHappyPath({ version: "14.0.0" });
      mocks.loadSdConfig.mockResolvedValue({
        packages: {
          "pkg-a": { target: "node", publish: { type: "npm" } },
        },
        postPublish: [
          { type: "script", cmd: "failing-cmd", args: [] },
        ],
      });
      mocks.execa.mockImplementation((cmd: string) => {
        if (cmd === "failing-cmd") throw new Error("script failed");
        if (cmd === "npm") return { stdout: "testuser", stderr: "", exitCode: 0 };
        return { stdout: "", stderr: "", exitCode: 0 };
      });

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      // Should NOT set exit code to 1
      expect(process.exitCode).toBeUndefined();
    });

    it("passes options to loadSdConfig", async () => {
      setupHappyPath();

      await runPublish({
        targets: [],
        noBuild: true,
        dryRun: false,
        options: ["production"],
      });

      expect(mocks.loadSdConfig).toHaveBeenCalledWith(
        expect.objectContaining({ opt: ["production"] }),
      );
    });

    it("throws error for unresolved environment variables", async () => {
      setupHappyPath({
        version: "14.0.0",
        packages: {
          "pkg-a": {
            target: "node",
            publish: {
              type: "local-directory",
              path: "/deploy/%UNDEFINED_VAR%",
            },
          },
        },
        hasGit: false,
      });

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      // Should fail due to unresolved env var
      expect(process.exitCode).toBe(1);
    });
  });

  describe("publish security + stability", () => {
    it("dry-run does not execute git push (no network)", async () => {
      setupHappyPath({ version: "14.0.0" });

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: true,
        options: [],
      });

      // git push should NOT be called in dry-run mode
      const pushCalls = mocks.execa.mock.calls.filter(
        (c: unknown[]) =>
          c[0] === "git" && (c[1] as string[])[0] === "push",
      );
      expect(pushCalls).toHaveLength(0);
    });

    it("includes workspace packages whose directory name contains a dot", async () => {
      setupHappyPath({
        packages: {
          "pkg.v2": { target: "node", publish: { type: "npm" } },
        },
      });

      // fsx.glob returns a directory with a dot in its name
      mocks.fsx.glob.mockImplementation((pattern: string) => {
        if (pattern.includes("templates")) return [];
        return [pkgPath("pkg.v2")];
      });

      // fs.existsSync should report package.json exists in pkg.v2
      mocks.fsExistsSync.mockImplementation((p: string) => {
        if (typeof p === "string" && p.endsWith("package.json")) {
          return p.includes("pkg.v2");
        }
        return true;
      });

      // fsx.readJson for pkg.v2
      mocks.fsx.readJson.mockImplementation((p: string) => {
        if (p === path.resolve(CWD, "package.json")) {
          return createPkgJson("simplysm", "14.0.0");
        }
        return createPkgJson("pkg.v2", "14.0.0");
      });

      await runPublish({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });

      // pkg.v2 should have been published (not filtered out by the dot)
      const publishCalls = getExecaCalls("pnpm", "publish");
      expect(publishCalls).toHaveLength(1);
    });
  });

  describe("target validation", () => {
    it("throws error for unknown target", async () => {
      mocks.loadSdConfig.mockResolvedValue({
        packages: {
          "pkg-a": { target: "node", publish: { type: "npm" } },
        },
      });

      await expect(
        runPublish({ targets: ["nonexistent"], noBuild: false, dryRun: false, options: [] }),
      ).rejects.toThrow("Unknown target: nonexistent");
    });

    it("does not throw for valid target", async () => {
      setupHappyPath();

      // Should not throw for valid target
      await runPublish({ targets: ["pkg-a"], noBuild: false, dryRun: false, options: [] });
      // If it didn't throw, validation passed
    });
  });
});
