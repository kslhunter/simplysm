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

vi.mock("../src/commands/build", () => ({
  runBuild: vi.fn(),
}));

vi.mock("../src/commands/publish", () => ({
  runPublish: vi.fn(),
}));

import { createCliParser } from "../src/sd-cli";
import { runLint } from "../src/commands/lint";
import { runTypecheck } from "../src/commands/typecheck";
import { runWatch } from "../src/commands/watch";
import { runBuild } from "../src/commands/build";
import { runPublish } from "../src/commands/publish";

describe("sd-cli", () => {
  let originalConsolaLevel: number;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(runLint).mockResolvedValue(undefined);
    vi.mocked(runTypecheck).mockResolvedValue(undefined);
    vi.mocked(runWatch).mockResolvedValue(undefined);
    vi.mocked(runBuild).mockResolvedValue(undefined);
    vi.mocked(runPublish).mockResolvedValue(undefined);
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

  describe("build 명령어", () => {
    it("build 명령어가 올바른 옵션으로 runBuild를 호출", async () => {
      await createCliParser(["build", "solid", "core-common"]).parse();

      expect(runBuild).toHaveBeenCalledWith({
        targets: ["solid", "core-common"],
        options: [],
      });
    });

    it("build 명령어에 targets 없이 실행 가능", async () => {
      await createCliParser(["build"]).parse();

      expect(runBuild).toHaveBeenCalledWith({
        targets: [],
        options: [],
      });
    });

    it("build 명령어의 --options 옵션이 올바르게 전달됨", async () => {
      await createCliParser(["build", "-o", "prod"]).parse();

      expect(runBuild).toHaveBeenCalledWith({
        targets: [],
        options: ["prod"],
      });
    });
  });

  describe("publish 명령어", () => {
    it("publish 명령어가 올바른 옵션으로 runPublish를 호출", async () => {
      await createCliParser(["publish", "solid", "core-common"]).parse();

      expect(runPublish).toHaveBeenCalledWith({
        targets: ["solid", "core-common"],
        noBuild: false,
        dryRun: false,
        options: [],
      });
    });

    it("publish 명령어에 targets 없이 실행 가능", async () => {
      await createCliParser(["publish"]).parse();

      expect(runPublish).toHaveBeenCalledWith({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });
    });

    it("publish 명령어의 --no-build 옵션이 올바르게 전달됨", async () => {
      await createCliParser(["publish", "--no-build"]).parse();

      expect(runPublish).toHaveBeenCalledWith({
        targets: [],
        noBuild: true,
        dryRun: false,
        options: [],
      });
    });

    it("publish 명령어의 --options 옵션이 올바르게 전달됨", async () => {
      await createCliParser(["publish", "-o", "prod", "-o", "test"]).parse();

      expect(runPublish).toHaveBeenCalledWith({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: ["prod", "test"],
      });
    });

    it("publish 명령어에 모든 옵션을 함께 전달 가능", async () => {
      await createCliParser(["publish", "solid", "--no-build", "-o", "prod"]).parse();

      expect(runPublish).toHaveBeenCalledWith({
        targets: ["solid"],
        noBuild: true,
        dryRun: false,
        options: ["prod"],
      });
    });

    it("publish 명령어의 --dry-run 옵션이 올바르게 전달됨", async () => {
      await createCliParser(["publish", "--dry-run"]).parse();

      expect(runPublish).toHaveBeenCalledWith({
        targets: [],
        noBuild: false,
        dryRun: true,
        options: [],
      });
    });

    it("publish 명령어에 --dry-run과 다른 옵션을 함께 사용 가능", async () => {
      await createCliParser(["publish", "solid", "--dry-run", "-o", "prod"]).parse();

      expect(runPublish).toHaveBeenCalledWith({
        targets: ["solid"],
        noBuild: false,
        dryRun: true,
        options: ["prod"],
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
