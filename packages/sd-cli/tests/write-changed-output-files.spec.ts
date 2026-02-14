import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import os from "os";
import fs from "fs/promises";
import type esbuild from "esbuild";
import { writeChangedOutputFiles } from "../src/utils/esbuild-config";

function makeOutputFile(filePath: string, text: string): esbuild.OutputFile {
  const contents = new TextEncoder().encode(text);
  return { path: filePath, contents, text, hash: "" };
}

describe("writeChangedOutputFiles", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "esbuild-write-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("writes new files that don't exist on disk", async () => {
    const outFile = makeOutputFile(path.join(tmpDir, "index.js"), "const x = 1;\n");
    await writeChangedOutputFiles([outFile]);

    const result = await fs.readFile(path.join(tmpDir, "index.js"), "utf-8");
    expect(result).toBe("const x = 1;\n");
  });

  it("skips writing when content is identical", async () => {
    const filePath = path.join(tmpDir, "index.js");
    await fs.writeFile(filePath, "const x = 1;\n");
    const statBefore = await fs.stat(filePath);

    // Small delay to ensure mtime would differ if file were rewritten
    await new Promise((r) => setTimeout(r, 50));

    const outFile = makeOutputFile(filePath, "const x = 1;\n");
    await writeChangedOutputFiles([outFile]);

    const statAfter = await fs.stat(filePath);
    expect(statAfter.mtimeMs).toBe(statBefore.mtimeMs);
  });

  it("writes when content differs", async () => {
    const filePath = path.join(tmpDir, "index.js");
    await fs.writeFile(filePath, "const x = 1;\n");

    const outFile = makeOutputFile(filePath, "const x = 2;\n");
    await writeChangedOutputFiles([outFile]);

    const result = await fs.readFile(filePath, "utf-8");
    expect(result).toBe("const x = 2;\n");
  });

  it("adds .js extension to relative imports in .js files", async () => {
    const filePath = path.join(tmpDir, "index.js");
    const outFile = makeOutputFile(filePath, 'import { foo } from "./utils";\nexport { foo };\n');
    await writeChangedOutputFiles([outFile]);

    const result = await fs.readFile(filePath, "utf-8");
    expect(result).toBe('import { foo } from "./utils.js";\nexport { foo };\n');
  });

  it("does not add .js extension to imports that already have known extensions", async () => {
    const filePath = path.join(tmpDir, "index.js");
    const outFile = makeOutputFile(filePath, 'import "./styles.css";\nimport data from "./data.json";\n');
    await writeChangedOutputFiles([outFile]);

    const result = await fs.readFile(filePath, "utf-8");
    expect(result).toBe('import "./styles.css";\nimport data from "./data.json";\n');
  });

  it("does not rewrite imports in .js.map files", async () => {
    const filePath = path.join(tmpDir, "index.js.map");
    const content = '{"sources":["./utils"]}';
    const outFile = makeOutputFile(filePath, content);
    await writeChangedOutputFiles([outFile]);

    const result = await fs.readFile(filePath, "utf-8");
    expect(result).toBe(content);
  });

  it("creates parent directories if needed", async () => {
    const filePath = path.join(tmpDir, "sub", "deep", "index.js");
    const outFile = makeOutputFile(filePath, "export {};\n");
    await writeChangedOutputFiles([outFile]);

    const result = await fs.readFile(filePath, "utf-8");
    expect(result).toBe("export {};\n");
  });
});
