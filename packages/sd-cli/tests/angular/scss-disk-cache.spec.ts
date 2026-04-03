import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { createClientTransformStylesheet } from "../../src/angular/client-transform-stylesheet.js";

const TMP_DIR = path.join(os.tmpdir(), "sd-cli-scss-cache-test");
const CACHE_DIR = path.join(TMP_DIR, "scss-cache");

function ensureTmpDir(): void {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

describe("SCSS disk cache", () => {
  beforeEach(() => {
    ensureTmpDir();
  });

  afterEach(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  // Acceptance: cache miss → compile + store, cache hit → load from disk
  it("caches SCSS compile result on miss and returns cached on hit", async () => {
    const scssPath = path.join(TMP_DIR, "component.scss");
    fs.writeFileSync(scssPath, "$color: blue;\n.host { color: $color; }");

    const deps = new Map<string, Set<string>>();
    const transform = createClientTransformStylesheet({
      loadPaths: [],
      scssErrors: [],
      scssDependencies: deps,
      cacheDir: CACHE_DIR,
    });

    // First call: compile (cache miss)
    const result1 = await transform("", path.join(TMP_DIR, "component.ts"), scssPath);
    expect(result1).toContain("color: blue");

    // Cache file should exist
    const cacheFiles = fs.readdirSync(CACHE_DIR);
    expect(cacheFiles.length).toBe(1);

    // Second call: cache hit (same file)
    deps.clear();
    const result2 = await transform("", path.join(TMP_DIR, "component.ts"), scssPath);
    expect(result2).toBe(result1);
  });

  // Acceptance: dependency change → cache miss
  it("invalidates cache when dependency file changes", async () => {
    const partialPath = path.join(TMP_DIR, "_vars.scss");
    fs.writeFileSync(partialPath, "$color: green;");
    const scssPath = path.join(TMP_DIR, "with-dep.scss");
    fs.writeFileSync(scssPath, '@use "vars";\n.host { color: vars.$color; }');

    const deps = new Map<string, Set<string>>();
    const transform = createClientTransformStylesheet({
      loadPaths: [TMP_DIR],
      scssErrors: [],
      scssDependencies: deps,
      cacheDir: CACHE_DIR,
    });

    // First call
    const result1 = await transform("", path.join(TMP_DIR, "comp.ts"), scssPath);
    expect(result1).toContain("color: green");

    // Change dependency content
    fs.writeFileSync(partialPath, "$color: red;");

    const result2 = await transform("", path.join(TMP_DIR, "comp.ts"), scssPath);
    expect(result2).toContain("color: red");
    expect(result2).not.toContain("color: green");
  });

  // Acceptance: scssDependencies populated on cache hit
  it("populates scssDependencies from cache on hit", async () => {
    const partialPath = path.join(TMP_DIR, "_shared.scss");
    fs.writeFileSync(partialPath, "$size: 14px;");
    const scssPath = path.join(TMP_DIR, "deptest.scss");
    fs.writeFileSync(scssPath, '@use "shared";\n.text { font-size: shared.$size; }');

    const deps = new Map<string, Set<string>>();
    const transform = createClientTransformStylesheet({
      loadPaths: [TMP_DIR],
      scssErrors: [],
      scssDependencies: deps,
      cacheDir: CACHE_DIR,
    });

    // First call: populate deps from compilation
    await transform("", path.join(TMP_DIR, "comp.ts"), scssPath);
    expect(deps.size).toBeGreaterThan(0);

    // Clear deps and call again (cache hit)
    deps.clear();
    await transform("", path.join(TMP_DIR, "comp.ts"), scssPath);

    // deps should be re-populated from cache
    expect(deps.size).toBeGreaterThan(0);
    const depSet = deps.get(scssPath);
    expect(depSet).toBeDefined();
    expect(depSet!.size).toBeGreaterThan(0);
  });

  // Unit: inline SCSS is NOT cached
  it("does not cache inline SCSS", async () => {
    const deps = new Map<string, Set<string>>();
    const transform = createClientTransformStylesheet({
      loadPaths: [],
      scssErrors: [],
      scssDependencies: deps,
      cacheDir: CACHE_DIR,
    });

    await transform(
      "$size: 14px;\n.text { font-size: $size; }",
      path.join(TMP_DIR, "component.ts"),
    );

    // No cache files should be created for inline SCSS
    expect(fs.existsSync(CACHE_DIR)).toBe(false);
  });

  // Unit: file content change → cache miss
  it("invalidates cache when SCSS file content changes", async () => {
    const scssPath = path.join(TMP_DIR, "changing.scss");
    fs.writeFileSync(scssPath, ".host { color: blue; }");

    const transform = createClientTransformStylesheet({
      loadPaths: [],
      scssErrors: [],
      scssDependencies: new Map(),
      cacheDir: CACHE_DIR,
    });

    const result1 = await transform("", path.join(TMP_DIR, "comp.ts"), scssPath);
    expect(result1).toContain("color: blue");

    fs.writeFileSync(scssPath, ".host { color: red; }");

    const result2 = await transform("", path.join(TMP_DIR, "comp.ts"), scssPath);
    expect(result2).toContain("color: red");
  });

  // Unit: no cacheDir → no caching (backward compatible)
  it("works without cacheDir (no caching)", async () => {
    const scssPath = path.join(TMP_DIR, "nodir.scss");
    fs.writeFileSync(scssPath, ".host { color: navy; }");

    const transform = createClientTransformStylesheet({
      loadPaths: [],
      scssErrors: [],
      scssDependencies: new Map(),
    });

    const result = await transform("", path.join(TMP_DIR, "comp.ts"), scssPath);
    expect(result).toContain("color: navy");
    expect(fs.existsSync(CACHE_DIR)).toBe(false);
  });
});
