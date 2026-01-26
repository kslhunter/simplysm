import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { consola, LogLevels } from "consola";

// runLint, runTypecheck, runWatch를 모킹
vi.mock("../src/commands/lint", () => ({
  runLint: vi.fn(),
}));

vi.mock("../src/commands/typecheck", () => ({
  runTypecheck: vi.fn(),
}));

vi.mock("../src/commands/watch", () => ({
  runWatch: vi.fn(),
}));

import { createCliParser } from "../src/sd-cli";
import { runLint } from "../src/commands/lint";
import { runTypecheck } from "../src/commands/typecheck";
import { runWatch } from "../src/commands/watch";

describe("sd-cli", () => {
  let originalConsolaLevel: number;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(runLint).mockResolvedValue(undefined);
    vi.mocked(runTypecheck).mockResolvedValue(undefined);
    vi.mocked(runWatch).mockResolvedValue(undefined);
    originalConsolaLevel = consola.level;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    consola.level = originalConsolaLevel;
  });

  describe("lint 명령어", () => {
    it("lint 명령어가 올바른 옵션으로 runLint를 호출", async () => {
      await createCliParser(["lint", "packages/core-common", "--fix"]).parse();

      expect(runLint).toHaveBeenCalledWith({
        targets: ["packages/core-common"],
        fix: true,
        timing: false,
      });
    });

    it("lint 명령어의 --timing 옵션이 올바르게 전달됨", async () => {
      await createCliParser(["lint", "--timing"]).parse();

      expect(runLint).toHaveBeenCalledWith({
        targets: [],
        fix: false,
        timing: true,
      });
    });

    it("lint 명령어에 targets 없이 실행 가능", async () => {
      await createCliParser(["lint"]).parse();

      expect(runLint).toHaveBeenCalledWith({
        targets: [],
        fix: false,
        timing: false,
      });
    });
  });

  describe("typecheck 명령어", () => {
    it("typecheck 명령어가 올바른 옵션으로 runTypecheck를 호출", async () => {
      await createCliParser(["typecheck", "packages/cli"]).parse();

      expect(runTypecheck).toHaveBeenCalledWith({
        targets: ["packages/cli"],
        options: [],
      });
    });

    it("typecheck 명령어에 여러 targets 전달 가능", async () => {
      await createCliParser(["typecheck", "packages/core-common", "packages/core-node"]).parse();

      expect(runTypecheck).toHaveBeenCalledWith({
        targets: ["packages/core-common", "packages/core-node"],
        options: [],
      });
    });

    it("typecheck 명령어의 --options 옵션이 올바르게 전달됨", async () => {
      await createCliParser(["typecheck", "-o", "dev", "-o", "test"]).parse();

      expect(runTypecheck).toHaveBeenCalledWith({
        targets: [],
        options: ["dev", "test"],
      });
    });
  });

  describe("watch 명령어", () => {
    it("watch 명령어가 올바른 옵션으로 runWatch를 호출", async () => {
      await createCliParser(["watch", "solid"]).parse();

      expect(runWatch).toHaveBeenCalledWith({
        targets: ["solid"],
        options: [],
      });
    });

    it("watch 명령어에 여러 targets 전달 가능", async () => {
      await createCliParser(["watch", "solid", "solid-demo"]).parse();

      expect(runWatch).toHaveBeenCalledWith({
        targets: ["solid", "solid-demo"],
        options: [],
      });
    });

    it("watch 명령어에 targets 없이 실행 가능", async () => {
      await createCliParser(["watch"]).parse();

      expect(runWatch).toHaveBeenCalledWith({
        targets: [],
        options: [],
      });
    });

    it("watch 명령어의 --options 옵션이 올바르게 전달됨", async () => {
      await createCliParser(["watch", "-o", "dev"]).parse();

      expect(runWatch).toHaveBeenCalledWith({
        targets: [],
        options: ["dev"],
      });
    });
  });

  describe("글로벌 --debug 옵션", () => {
    it("--debug 옵션이 consola.level을 debug로 설정", async () => {
      await createCliParser(["--debug", "lint"]).parse();

      expect(consola.level).toBe(LogLevels.debug);
    });

    it("--debug 없이 실행 시 consola.level 변경 안함", async () => {
      const levelBefore = consola.level;
      await createCliParser(["lint"]).parse();

      expect(consola.level).toBe(levelBefore);
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
