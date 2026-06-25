import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "fs/promises";
import os from "os";

import {
  createServerEsbuildOptions,
  createEnvBanner,
  writeChangedOutputFiles,
} from "../../src/esbuild/esbuild-config";

describe("createServerEsbuildOptions", () => {
  const baseOptions = {
    pkgDir: "/pkg",
    entryPoints: ["/pkg/src/index.ts"],
  };

  it("produces ESM bundle with platform=node and target=node24", () => {
    const result = createServerEsbuildOptions(baseOptions);
    expect(result.format).toBe("esm");
    expect(result.bundle).toBe(true);
    expect(result.platform).toBe("node");
    expect(result.target).toBe("node24");
  });

  it("minifies by default (production build)", () => {
    const result = createServerEsbuildOptions(baseOptions);
    expect(result.minify).toBe(true);
  });

  it("skips minification when dev=true (watch mode)", () => {
    const result = createServerEsbuildOptions({ ...baseOptions, dev: true });
    expect(result.minify).toBe(false);
  });

  it("includes createRequire shim banner for CJS compatibility", () => {
    const result = createServerEsbuildOptions(baseOptions);
    expect(result.banner).toBeDefined();
    expect((result.banner as Record<string, string>)["js"]).toContain("createRequire");
    expect((result.banner as Record<string, string>)["js"]).toContain("import.meta.url");
  });

  it("injects env vars via banner (process.env merge) instead of define", () => {
    const result = createServerEsbuildOptions({
      ...baseOptions,
      env: { API_URL: "https://api.example.com", NODE_ENV: "production" },
    });
    const banner = (result.banner as Record<string, string>)["js"];
    expect(banner).toContain("process.env");
    expect(banner).toContain("??=");
    expect(banner).toContain("API_URL");
    expect(banner).toContain("https://api.example.com");
    expect(result.define).toBeUndefined();
  });

  it("does not include env code in banner when env is not provided", () => {
    const result = createServerEsbuildOptions(baseOptions);
    const banner = (result.banner as Record<string, string>)["js"];
    expect(banner).toContain("createRequire");
    expect(banner).not.toContain("??=");
    expect(result.define).toBeUndefined();
  });

  it("passes external modules to esbuild", () => {
    const result = createServerEsbuildOptions({
      ...baseOptions,
      external: ["bcrypt", "sharp"],
    });
    expect(result.external).toEqual(["bcrypt", "sharp"]);
  });

  it("sets outdir to pkgDir/dist", () => {
    const result = createServerEsbuildOptions(baseOptions);
    expect(result.outdir).toBe(path.join("/pkg", "dist"));
  });

  it("sets tsconfig to pkgDir/tsconfig.json", () => {
    const result = createServerEsbuildOptions(baseOptions);
    expect(result.tsconfig).toBe(path.join("/pkg", "tsconfig.json"));
  });

  it("enables linked sourcemap in dev mode", () => {
    const result = createServerEsbuildOptions({ ...baseOptions, dev: true });
    expect(result.sourcemap).toBe("linked");
  });

  it("does not enable sourcemap in production mode", () => {
    const result = createServerEsbuildOptions(baseOptions);
    expect(result.sourcemap).toBeUndefined();
  });
});

describe("createEnvBanner", () => {
  it("generates process.env merge code with ??= for runtime override", () => {
    const banner = createEnvBanner({ API_URL: "https://api.example.com", NODE_ENV: "production" });
    expect(banner).toContain("process.env");
    expect(banner).toContain("??=");
    expect(banner).toContain('"API_URL"');
    expect(banner).toContain('"https://api.example.com"');
    expect(banner).toContain('"NODE_ENV"');
    expect(banner).toContain('"production"');
  });

  it("returns empty string when env is undefined", () => {
    expect(createEnvBanner()).toBe("");
  });

  it("returns empty string when env is empty object", () => {
    expect(createEnvBanner({})).toBe("");
  });

  it("JSON-encodes special characters in values", () => {
    const banner = createEnvBanner({ MSG: 'hello "world"' });
    expect(banner).toContain('\\"world\\"');
  });
});

describe("writeChangedOutputFiles", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sd-esbuild-config-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("adds .js extension to relative import paths in .js files", async () => {
    const distDir = path.join(tmpDir, "dist");
    const filePath = path.join(distDir, "foo.js");

    await writeChangedOutputFiles([
      {
        path: filePath,
        text: 'import { bar } from "./bar";\nexport { baz } from "../utils/baz";',
      },
    ] as any);

    const written = await fs.readFile(filePath, "utf8");
    expect(written).toBe(
      'import { bar } from "./bar.js";\nexport { baz } from "../utils/baz.js";',
    );
  });

  it("preserves imports that already have extensions", async () => {
    const filePath = path.join(tmpDir, "dist", "foo.js");

    await writeChangedOutputFiles([
      {
        path: filePath,
        text: 'import data from "./data.json";\nimport styles from "./styles.css";\nimport mod from "./native.node";',
      },
    ] as any);

    const written = await fs.readFile(filePath, "utf8");
    expect(written).toBe(
      'import data from "./data.json";\nimport styles from "./styles.css";\nimport mod from "./native.node";',
    );
  });

  it("skips writing when transformed content matches existing file", async () => {
    const filePath = path.join(tmpDir, "dist", "foo.js");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const existing = 'import { bar } from "./bar.js";';
    await fs.writeFile(filePath, existing);
    const statBefore = await fs.stat(filePath);

    await new Promise((r) => setTimeout(r, 10));
    await writeChangedOutputFiles([
      {
        path: filePath,
        text: 'import { bar } from "./bar";',
      },
    ] as any);

    const statAfter = await fs.stat(filePath);
    expect(statAfter.mtimeMs).toBe(statBefore.mtimeMs);
    const written = await fs.readFile(filePath, "utf8");
    expect(written).toBe(existing);
  });

  it("writes file when content changed", async () => {
    const filePath = path.join(tmpDir, "dist", "foo.js");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, 'import { old } from "./old.js";');

    await writeChangedOutputFiles([
      {
        path: filePath,
        text: 'import { bar } from "./bar";',
      },
    ] as any);

    const written = await fs.readFile(filePath, "utf8");
    expect(written).toBe('import { bar } from "./bar.js";');
  });

  it("writes new file when existing file does not exist", async () => {
    const filePath = path.join(tmpDir, "dist", "foo.js");

    await writeChangedOutputFiles([
      { path: filePath, text: "const x = 1;" },
    ] as any);

    const written = await fs.readFile(filePath, "utf8");
    expect(written).toBe("const x = 1;");
  });

  it("does not transform non-.js files", async () => {
    const filePath = path.join(tmpDir, "dist", "foo.js.map");
    const mapContent = '{"version":3,"sources":["./bar"]}';

    await writeChangedOutputFiles([
      { path: filePath, text: mapContent },
    ] as any);

    const written = await fs.readFile(filePath, "utf8");
    expect(written).toBe(mapContent);
  });
});

