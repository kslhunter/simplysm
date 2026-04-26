import fs from "fs";
import os from "os";
import path from "path";
// eslint-disable-next-line import/no-extraneous-dependencies -- root test runner dependency
import { afterEach, describe, expect, it } from "vitest";
import { collectCodexEntries, shouldCopyCodexAsset } from "../../scripts/sd-entries.mjs";

const tempDirs = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("collectCodexEntries", () => {
  it("collects root and one-level sd-* codex assets without AGENTS.md", () => {
    const dir = createTempCodexDir();
    writeFile(dir, "AGENTS.md", "# Project agents");
    writeFile(dir, "sd-root.md", "# root rule");
    writeFile(dir, "rules/sd-codex-rules.md", "# rules");
    writeFile(dir, "rules/local-rule.md", "# local");
    writeFile(dir, "skills/sd-check/SKILL.md", "# skill");
    writeFile(dir, "skills/demo-review/SKILL.md", "# demo");
    writeFile(dir, "references/sd-frontend-design.md", "# design");

    expect(collectCodexEntries(dir).sort()).toEqual([
      "references/sd-frontend-design.md",
      "rules/sd-codex-rules.md",
      "sd-root.md",
      "skills/sd-check",
    ]);
  });
});

describe("shouldCopyCodexAsset", () => {
  it("excludes eval-only files from package snapshots", () => {
    expect(shouldCopyCodexAsset("SKILL.md")).toBe(true);
    expect(shouldCopyCodexAsset("README.md")).toBe(true);
    expect(shouldCopyCodexAsset("SKILL.eval.md")).toBe(false);
    expect(shouldCopyCodexAsset("eval_runner.py")).toBe(false);
    expect(shouldCopyCodexAsset("prompt.eval.json")).toBe(false);
  });
});

function createTempCodexDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-codex-"));
  tempDirs.push(dir);
  return dir;
}

function writeFile(root, relPath, content) {
  const filePath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
