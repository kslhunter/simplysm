import { describe, it, expect, vi, beforeEach } from "vitest";
import { cpx } from "@simplysm/core-node";

const mocks = {
  execa: vi.spyOn(cpx, "spawn"),
};

import { ensureCleanWorkingTree, commitTagAndPush } from "../../src/commands/publish/git-phase";

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

  it("throws when auto-commit fails", async () => {
    const logger = createLogger();
    mocks.execa.mockImplementation(((cmd: string, args?: string[]) => {
      if (cmd === "git" && args?.[0] === "diff") {
        return { stdout: "file.txt", stderr: "", exitCode: 0 };
      }
      // 자동 커밋 명령 실패 시뮬레이션
      if (cmd !== "git") {
        throw new Error("auto-commit failed");
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    }) as never);

    await expect(ensureCleanWorkingTree(true, logger)).rejects.toThrow(
      "자동 커밋에 실패했습니다",
    );
  });
});

describe("commitTagAndPush", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws with recovery guide when git commit fails", async () => {
    const logger = createLogger();
    mocks.execa.mockImplementation(((_cmd: string, args?: string[]) => {
      if (args?.[0] === "commit") {
        throw new Error("git commit failed");
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    }) as never);

    await expect(
      commitTagAndPush(true, "14.0.1", ["package.json"], logger, false),
    ).rejects.toThrow("Git 작업 실패");
  });
});
