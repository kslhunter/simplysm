import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";

vi.mock("fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

const { createServerEsbuildOptions, createEnvBanner, writeChangedOutputFiles } =
  await import("../../src/esbuild/esbuild-config");

const { default: mockFs } = await import("fs/promises");

describe("createServerEsbuildOptions", () => {
  const baseOptions = {
    pkgDir: "/pkg",
    entryPoints: ["/pkg/src/index.ts"],
  };

  it("produces ESM bundle with platform=node and target=node20", () => {
    const result = createServerEsbuildOptions(baseOptions);
    expect(result.format).toBe("esm");
    expect(result.bundle).toBe(true);
    expect(result.platform).toBe("node");
    expect(result.target).toBe("node20");
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockFs.mkdir).mockResolvedValue(undefined);
    vi.mocked(mockFs.writeFile).mockResolvedValue();
  });

  it("adds .js extension to relative import paths in .js files", async () => {
    vi.mocked(mockFs.readFile).mockRejectedValue(new Error("not found"));

    await writeChangedOutputFiles([
      {
        path: "/pkg/dist/foo.js",
        text: 'import { bar } from "./bar";\nexport { baz } from "../utils/baz";',
      },
    ] as any);

    expect(mockFs.writeFile).toHaveBeenCalledWith(
      "/pkg/dist/foo.js",
      'import { bar } from "./bar.js";\nexport { baz } from "../utils/baz.js";',
    );
  });

  it("preserves imports that already have extensions", async () => {
    vi.mocked(mockFs.readFile).mockRejectedValue(new Error("not found"));

    await writeChangedOutputFiles([
      {
        path: "/pkg/dist/foo.js",
        text: 'import data from "./data.json";\nimport styles from "./styles.css";\nimport mod from "./native.node";',
      },
    ] as any);

    expect(mockFs.writeFile).toHaveBeenCalledWith(
      "/pkg/dist/foo.js",
      'import data from "./data.json";\nimport styles from "./styles.css";\nimport mod from "./native.node";',
    );
  });

  it("skips writing when transformed content matches existing file", async () => {
    vi.mocked(mockFs.readFile).mockResolvedValue('import { bar } from "./bar.js";');

    await writeChangedOutputFiles([
      {
        path: "/pkg/dist/foo.js",
        text: 'import { bar } from "./bar";',
      },
    ] as any);

    expect(mockFs.writeFile).not.toHaveBeenCalled();
  });

  it("writes file when content changed", async () => {
    vi.mocked(mockFs.readFile).mockResolvedValue('import { old } from "./old.js";');

    await writeChangedOutputFiles([
      {
        path: "/pkg/dist/foo.js",
        text: 'import { bar } from "./bar";',
      },
    ] as any);

    expect(mockFs.writeFile).toHaveBeenCalled();
  });

  it("writes new file when existing file does not exist", async () => {
    vi.mocked(mockFs.readFile).mockRejectedValue(new Error("ENOENT"));

    await writeChangedOutputFiles([
      {
        path: "/pkg/dist/foo.js",
        text: 'const x = 1;',
      },
    ] as any);

    expect(mockFs.mkdir).toHaveBeenCalledWith(path.dirname("/pkg/dist/foo.js"), { recursive: true });
    expect(mockFs.writeFile).toHaveBeenCalledWith("/pkg/dist/foo.js", "const x = 1;");
  });

  it("does not transform non-.js files", async () => {
    vi.mocked(mockFs.readFile).mockRejectedValue(new Error("not found"));

    const mapContent = '{"version":3,"sources":["./bar"]}';
    await writeChangedOutputFiles([
      { path: "/pkg/dist/foo.js.map", text: mapContent },
    ] as any);

    expect(mockFs.writeFile).toHaveBeenCalledWith("/pkg/dist/foo.js.map", mapContent);
  });
});

