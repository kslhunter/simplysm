import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// runLint와 runTypecheck를 모킹
vi.mock("../src/commands/lint", () => ({
  runLint: vi.fn(),
}));

vi.mock("../src/commands/typecheck", () => ({
  runTypecheck: vi.fn(),
}));

import { createCliParser } from "../src/sd-cli";
import { runLint } from "../src/commands/lint";
import { runTypecheck } from "../src/commands/typecheck";

describe("sd-cli", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(runLint).mockResolvedValue(undefined);
    vi.mocked(runTypecheck).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("lint 명령어", () => {
    it("lint 명령어가 올바른 옵션으로 runLint를 호출", async () => {
      await createCliParser(["lint", "packages/core-common", "--fix"]).parse();

      expect(runLint).toHaveBeenCalledWith({
        targets: ["packages/core-common"],
        fix: true,
        timing: false,
        debug: false,
      });
    });

    it("lint 명령어의 --timing 옵션이 올바르게 전달됨", async () => {
      await createCliParser(["lint", "--timing"]).parse();

      expect(runLint).toHaveBeenCalledWith({
        targets: [],
        fix: false,
        timing: true,
        debug: false,
      });
    });

    it("lint 명령어에 targets 없이 실행 가능", async () => {
      await createCliParser(["lint"]).parse();

      expect(runLint).toHaveBeenCalledWith({
        targets: [],
        fix: false,
        timing: false,
        debug: false,
      });
    });

    it("lint 명령어의 --debug 옵션이 올바르게 전달됨", async () => {
      await createCliParser(["lint", "--debug"]).parse();

      expect(runLint).toHaveBeenCalledWith({
        targets: [],
        fix: false,
        timing: false,
        debug: true,
      });
    });
  });

  describe("typecheck 명령어", () => {
    it("typecheck 명령어가 올바른 옵션으로 runTypecheck를 호출", async () => {
      await createCliParser(["typecheck", "packages/cli", "--debug"]).parse();

      expect(runTypecheck).toHaveBeenCalledWith({
        targets: ["packages/cli"],
        debug: true,
      });
    });

    it("typecheck 명령어에 여러 targets 전달 가능", async () => {
      await createCliParser(["typecheck", "packages/core-common", "packages/core-node"]).parse();

      expect(runTypecheck).toHaveBeenCalledWith({
        targets: ["packages/core-common", "packages/core-node"],
        debug: false,
      });
    });
  });

  describe("에러 처리", () => {
    it("알 수 없는 명령어 입력 시 에러", async () => {
      let errorMessage: string | undefined;
      const parser = createCliParser(["unknown"]).fail((msg) => {
        errorMessage = msg;
      });

      await parser.parse();

      expect(errorMessage).toContain("Unknown argument");
    });

    it("명령어 없이 실행 시 에러", async () => {
      let errorMessage: string | undefined;
      const parser = createCliParser([]).fail((msg) => {
        errorMessage = msg;
      });

      await parser.parse();

      expect(errorMessage).toBe("명령어를 지정해주세요.");
    });
  });
});
