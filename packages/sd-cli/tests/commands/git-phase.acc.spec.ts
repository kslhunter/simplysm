import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  execa: vi.fn(),
}));

vi.mock("@simplysm/core-node", () => ({
  cpx: {
    spawn: mocks.execa,
  },
}));

const { ensureCleanWorkingTree, commitTagAndPush } = await import(
  "../../src/commands/publish/git-phase"
);

function createLogger() {
  return {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    withTag: vi.fn(),
  } as unknown as ReturnType<typeof import("consola").consola.withTag>;
}

describe("ensureCleanWorkingTree", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("auto-commits with codex when uncommitted changes detected", async () => {
    const logger = createLogger();
    mocks.execa.mockImplementation((cmd: string, args?: string[]) => {
      if (cmd === "git" && args?.[0] === "diff") {
        return { stdout: "file.txt", stderr: "", exitCode: 0 };
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    });

    await ensureCleanWorkingTree(true, logger);

    const codexCalls = mocks.execa.mock.calls.filter(
      (c: unknown[]) => c[0] === "codex",
    );
    expect(codexCalls).toHaveLength(1);
    expect((codexCalls[0][1] as string[])).toContain("exec");
    expect((codexCalls[0][1] as string[])).toContain("gpt-5.3-codex-spark");
    expect((codexCalls[0][1] as string[])).toContain('model_reasoning_effort="low"');
    expect((codexCalls[0][1] as string[])).toContain("$sd-commit");
  });

  it("skips auto-commit when no uncommitted changes", async () => {
    const logger = createLogger();
    mocks.execa.mockImplementation(() => {
      return { stdout: "", stderr: "", exitCode: 0 };
    });

    await ensureCleanWorkingTree(true, logger);

    const codexCalls = mocks.execa.mock.calls.filter(
      (c: unknown[]) => c[0] === "codex",
    );
    expect(codexCalls).toHaveLength(0);
  });

  it("throws when codex auto-commit fails", async () => {
    const logger = createLogger();
    mocks.execa.mockImplementation((cmd: string, args?: string[]) => {
      if (cmd === "git" && args?.[0] === "diff") {
        return { stdout: "file.txt", stderr: "", exitCode: 0 };
      }
      if (cmd === "codex") {
        throw new Error("codex commit failed");
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    });

    await expect(ensureCleanWorkingTree(true, logger)).rejects.toThrow(
      "자동 커밋에 실패했습니다",
    );
  });

  it("does nothing when hasGit is false", async () => {
    const logger = createLogger();

    await ensureCleanWorkingTree(false, logger);

    expect(mocks.execa).not.toHaveBeenCalled();
  });
});

describe("commitTagAndPush", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("commits, tags, and pushes version changes", async () => {
    const logger = createLogger();
    mocks.execa.mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });

    await commitTagAndPush(true, "14.0.1", ["package.json"], logger, false);

    const gitCalls = mocks.execa.mock.calls.filter(
      (c: unknown[]) => c[0] === "git",
    );

    // git add
    const addCall = gitCalls.find((c: unknown[]) => (c[1] as string[])[0] === "add");
    expect(addCall).toBeDefined();
    expect((addCall![1] as string[])).toContain("package.json");

    // git commit
    const commitCall = gitCalls.find((c: unknown[]) => (c[1] as string[])[0] === "commit");
    expect(commitCall).toBeDefined();
    expect((commitCall![1] as string[])).toContain("v14.0.1");

    // git tag
    const tagCall = gitCalls.find((c: unknown[]) => (c[1] as string[])[0] === "tag");
    expect(tagCall).toBeDefined();
    expect((tagCall![1] as string[])).toContain("-a");
    expect((tagCall![1] as string[])).toContain("v14.0.1");

    // git push (2 calls: push + push --tags)
    const pushCalls = gitCalls.filter((c: unknown[]) => (c[1] as string[])[0] === "push");
    expect(pushCalls).toHaveLength(2);
  });

  it("outputs simulation logs in dry-run mode without executing git", async () => {
    const logger = createLogger();

    await commitTagAndPush(true, "14.0.1", ["package.json"], logger, true);

    // No actual git commands
    expect(mocks.execa).not.toHaveBeenCalled();
    // Simulation logs
    expect(logger.info).toHaveBeenCalled();
  });

  it("throws with recovery guide when git commit fails", async () => {
    const logger = createLogger();
    mocks.execa.mockImplementation((_cmd: string, args?: string[]) => {
      if (args?.[0] === "commit") {
        throw new Error("git commit failed");
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    });

    await expect(
      commitTagAndPush(true, "14.0.1", ["package.json"], logger, false),
    ).rejects.toThrow("Git 작업 실패");
  });

  it("does nothing when hasGit is false", async () => {
    const logger = createLogger();

    await commitTagAndPush(false, "14.0.1", ["package.json"], logger, false);

    expect(mocks.execa).not.toHaveBeenCalled();
  });
});
