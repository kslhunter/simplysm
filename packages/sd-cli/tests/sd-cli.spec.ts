import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { consola, LogLevels } from "consola";

// runLint, runTypecheck, runWatch, runCheck를 모킹
vi.mock("../src/commands/lint", () => ({
  runLint: vi.fn(),
}));

vi.mock("../src/commands/typecheck", () => ({
  runTypecheck: vi.fn(),
}));

vi.mock("../src/commands/check", () => ({
  runCheck: vi.fn(),
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

import { createCliParser } from "../src/sd-cli-entry";
import { runLint } from "../src/commands/lint";
import { runTypecheck } from "../src/commands/typecheck";
import { runCheck } from "../src/commands/check";
import { runWatch } from "../src/commands/watch";
import { runBuild } from "../src/commands/build";
import { runPublish } from "../src/commands/publish";

describe("sd-cli", () => {
  let originalConsolaLevel: number;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(runLint).mockResolvedValue(undefined);
    vi.mocked(runTypecheck).mockResolvedValue(undefined);
    vi.mocked(runCheck).mockResolvedValue(undefined);
    vi.mocked(runWatch).mockResolvedValue(undefined);
    vi.mocked(runBuild).mockResolvedValue(undefined);
    vi.mocked(runPublish).mockResolvedValue(undefined);
    originalConsolaLevel = consola.level;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    consola.level = originalConsolaLevel;
  });

  describe("lint command", () => {
    it("calls runLint with correct options", async () => {
      await createCliParser(["lint", "packages/core-common", "--fix"]).parse();

      expect(runLint).toHaveBeenCalledWith({
        targets: ["packages/core-common"],
        fix: true,
        timing: false,
      });
    });

    it("passes --timing option correctly", async () => {
      await createCliParser(["lint", "--timing"]).parse();

      expect(runLint).toHaveBeenCalledWith({
        targets: [],
        fix: false,
        timing: true,
      });
    });

    it("runs lint command without targets", async () => {
      await createCliParser(["lint"]).parse();

      expect(runLint).toHaveBeenCalledWith({
        targets: [],
        fix: false,
        timing: false,
      });
    });
  });

  describe("typecheck command", () => {
    it("calls runTypecheck with correct options", async () => {
      await createCliParser(["typecheck", "packages/cli"]).parse();

      expect(runTypecheck).toHaveBeenCalledWith({
        targets: ["packages/cli"],
        options: [],
      });
    });

    it("passes multiple targets to typecheck command", async () => {
      await createCliParser(["typecheck", "packages/core-common", "packages/core-node"]).parse();

      expect(runTypecheck).toHaveBeenCalledWith({
        targets: ["packages/core-common", "packages/core-node"],
        options: [],
      });
    });

    it("passes --options option correctly", async () => {
      await createCliParser(["typecheck", "-o", "dev", "-o", "test"]).parse();

      expect(runTypecheck).toHaveBeenCalledWith({
        targets: [],
        options: ["dev", "test"],
      });
    });
  });

  describe("check command", () => {
    it("calls runCheck with correct options", async () => {
      await createCliParser(["check", "packages/core-common", "--type", "typecheck,lint"]).parse();

      expect(runCheck).toHaveBeenCalledWith({
        targets: ["packages/core-common"],
        types: ["typecheck", "lint"],
      });
    });

    it("runs check command without targets", async () => {
      await createCliParser(["check"]).parse();

      expect(runCheck).toHaveBeenCalledWith({
        targets: [],
        types: ["typecheck", "lint", "test"],
      });
    });

    it("specifies single type using --type option", async () => {
      await createCliParser(["check", "--type", "test"]).parse();

      expect(runCheck).toHaveBeenCalledWith({
        targets: [],
        types: ["test"],
      });
    });
  });

  describe("watch command", () => {
    it("calls runWatch with correct options", async () => {
      await createCliParser(["watch", "solid"]).parse();

      expect(runWatch).toHaveBeenCalledWith({
        targets: ["solid"],
        options: [],
      });
    });

    it("passes multiple targets to watch command", async () => {
      await createCliParser(["watch", "solid", "solid-demo"]).parse();

      expect(runWatch).toHaveBeenCalledWith({
        targets: ["solid", "solid-demo"],
        options: [],
      });
    });

    it("runs watch command without targets", async () => {
      await createCliParser(["watch"]).parse();

      expect(runWatch).toHaveBeenCalledWith({
        targets: [],
        options: [],
      });
    });

    it("passes --options option correctly", async () => {
      await createCliParser(["watch", "-o", "dev"]).parse();

      expect(runWatch).toHaveBeenCalledWith({
        targets: [],
        options: ["dev"],
      });
    });
  });

  describe("build command", () => {
    it("calls runBuild with correct options", async () => {
      await createCliParser(["build", "solid", "core-common"]).parse();

      expect(runBuild).toHaveBeenCalledWith({
        targets: ["solid", "core-common"],
        options: [],
      });
    });

    it("runs build command without targets", async () => {
      await createCliParser(["build"]).parse();

      expect(runBuild).toHaveBeenCalledWith({
        targets: [],
        options: [],
      });
    });

    it("passes --options option correctly", async () => {
      await createCliParser(["build", "-o", "prod"]).parse();

      expect(runBuild).toHaveBeenCalledWith({
        targets: [],
        options: ["prod"],
      });
    });
  });

  describe("publish command", () => {
    it("calls runPublish with correct options", async () => {
      await createCliParser(["publish", "solid", "core-common"]).parse();

      expect(runPublish).toHaveBeenCalledWith({
        targets: ["solid", "core-common"],
        noBuild: false,
        dryRun: false,
        options: [],
      });
    });

    it("runs publish command without targets", async () => {
      await createCliParser(["publish"]).parse();

      expect(runPublish).toHaveBeenCalledWith({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: [],
      });
    });

    it("passes --no-build option correctly", async () => {
      await createCliParser(["publish", "--no-build"]).parse();

      expect(runPublish).toHaveBeenCalledWith({
        targets: [],
        noBuild: true,
        dryRun: false,
        options: [],
      });
    });

    it("passes --options option correctly", async () => {
      await createCliParser(["publish", "-o", "prod", "-o", "test"]).parse();

      expect(runPublish).toHaveBeenCalledWith({
        targets: [],
        noBuild: false,
        dryRun: false,
        options: ["prod", "test"],
      });
    });

    it("passes all options together", async () => {
      await createCliParser(["publish", "solid", "--no-build", "-o", "prod"]).parse();

      expect(runPublish).toHaveBeenCalledWith({
        targets: ["solid"],
        noBuild: true,
        dryRun: false,
        options: ["prod"],
      });
    });

    it("passes --dry-run option correctly", async () => {
      await createCliParser(["publish", "--dry-run"]).parse();

      expect(runPublish).toHaveBeenCalledWith({
        targets: [],
        noBuild: false,
        dryRun: true,
        options: [],
      });
    });

    it("uses --dry-run with other options together", async () => {
      await createCliParser(["publish", "solid", "--dry-run", "-o", "prod"]).parse();

      expect(runPublish).toHaveBeenCalledWith({
        targets: ["solid"],
        noBuild: false,
        dryRun: true,
        options: ["prod"],
      });
    });
  });

  describe("global --debug option", () => {
    it("sets consola.level to debug with --debug option", async () => {
      await createCliParser(["--debug", "lint"]).parse();

      expect(consola.level).toBe(LogLevels.debug);
    });

    it("does not change consola.level without --debug", async () => {
      const levelBefore = consola.level;
      await createCliParser(["lint"]).parse();

      expect(consola.level).toBe(levelBefore);
    });
  });

  describe("error handling", () => {
    it("throws error on unknown command", async () => {
      let errorMessage: string | undefined;
      const parser = createCliParser(["unknown"]).fail((msg) => {
        errorMessage = msg;
      });

      await parser.parse();

      expect(errorMessage).toMatch(/Unknown argument|알 수 없는 인수/);
    });

    it("throws error when no command specified", async () => {
      let errorMessage: string | undefined;
      const parser = createCliParser([]).fail((msg) => {
        errorMessage = msg;
      });

      await parser.parse();

      expect(errorMessage).toBe("명령어를 지정해주세요.");
    });
  });
});
