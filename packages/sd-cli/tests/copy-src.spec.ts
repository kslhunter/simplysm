import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { copySrcFiles } from "../src/utils/copy-src";

describe("copySrcFiles", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "copysrc-"));
    // Create src/ structure
    await fs.mkdir(path.join(tmpDir, "src", "components"), { recursive: true });
    await fs.mkdir(path.join(tmpDir, "dist"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "src", "base.css"), "body {}");
    await fs.writeFile(path.join(tmpDir, "src", "components", "Card.css"), ".card {}");
    await fs.writeFile(path.join(tmpDir, "src", "index.ts"), "export {}");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("copies files matching glob pattern from src/ to dist/", async () => {
    await copySrcFiles(tmpDir, ["**/*.css"]);

    const base = await fs.readFile(path.join(tmpDir, "dist", "base.css"), "utf-8");
    expect(base).toBe("body {}");

    const card = await fs.readFile(path.join(tmpDir, "dist", "components", "Card.css"), "utf-8");
    expect(card).toBe(".card {}");
  });

  it("does not copy files that don't match pattern", async () => {
    await copySrcFiles(tmpDir, ["**/*.css"]);

    const exists = await fs.access(path.join(tmpDir, "dist", "index.ts")).then(
      () => true,
      () => false,
    );
    expect(exists).toBe(false);
  });

  it("copies nothing if pattern is empty array", async () => {
    await copySrcFiles(tmpDir, []);

    const files = await fs.readdir(path.join(tmpDir, "dist"));
    expect(files).toHaveLength(0);
  });
});
