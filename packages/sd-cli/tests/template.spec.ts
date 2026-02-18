import { describe, test, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import os from "os";
import fs from "fs";
import { renderTemplateDir } from "../src/utils/template";

describe("renderTemplateDir", () => {
  let tmpDir: string;
  let srcDir: string;
  let destDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-template-test-"));
    srcDir = path.join(tmpDir, "src");
    destDir = path.join(tmpDir, "dest");
    fs.mkdirSync(srcDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  test("renders .hbs files with context and removes .hbs extension", async () => {
    fs.writeFileSync(path.join(srcDir, "hello.txt.hbs"), "Hello, {{name}}!");
    await renderTemplateDir(srcDir, destDir, { name: "World" });
    expect(fs.readFileSync(path.join(destDir, "hello.txt"), "utf-8")).toBe("Hello, World!");
  });

  test("copies non-.hbs files as-is (binary safe)", async () => {
    const binaryData = Uint8Array.from([0x00, 0x01, 0xff, 0xfe]);
    fs.writeFileSync(path.join(srcDir, "icon.bin"), binaryData);
    await renderTemplateDir(srcDir, destDir, {});
    const copied = fs.readFileSync(path.join(destDir, "icon.bin"));
    expect(new Uint8Array(copied)).toEqual(binaryData);
  });

  test("replaces directory name placeholders", async () => {
    const subDir = path.join(srcDir, "__CLIENT__");
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(subDir, "file.txt.hbs"), "pkg: {{clientName}}");
    await renderTemplateDir(
      srcDir,
      destDir,
      { clientName: "client-admin" },
      { __CLIENT__: "client-admin" },
    );
    expect(fs.readFileSync(path.join(destDir, "client-admin", "file.txt"), "utf-8")).toBe(
      "pkg: client-admin",
    );
  });

  test("skips file when .hbs renders to empty/whitespace", async () => {
    fs.writeFileSync(path.join(srcDir, "optional.ts.hbs"), "{{#if enabled}}content{{/if}}");
    await renderTemplateDir(srcDir, destDir, { enabled: false });
    expect(fs.existsSync(path.join(destDir, "optional.ts"))).toBe(false);
  });

  test("handles nested directories", async () => {
    fs.mkdirSync(path.join(srcDir, "a", "b"), { recursive: true });
    fs.writeFileSync(path.join(srcDir, "a", "b", "deep.txt.hbs"), "{{value}}");
    await renderTemplateDir(srcDir, destDir, { value: "nested" });
    expect(fs.readFileSync(path.join(destDir, "a", "b", "deep.txt"), "utf-8")).toBe("nested");
  });

  test("preserves Handlebars {{#if}} conditional blocks", async () => {
    fs.writeFileSync(path.join(srcDir, "test.txt.hbs"), "start\n{{#if flag}}included\n{{/if}}end");
    await renderTemplateDir(srcDir, destDir, { flag: true });
    expect(fs.readFileSync(path.join(destDir, "test.txt"), "utf-8")).toBe("start\nincluded\nend");
  });
});
