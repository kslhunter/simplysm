import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type ts from "typescript";

// Mock core-node functions
vi.mock("@simplysm/core-node", () => ({
  fsExists: vi.fn(),
  fsReadJson: vi.fn(),
  pathPosix: vi.fn((p: string) => p.replace(/\\/g, "/")),
}));

import { fsExists, fsReadJson } from "@simplysm/core-node";
import { getCompilerOptionsForPackage } from "../src/utils/tsconfig";

describe("getCompilerOptionsForPackage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const baseOptions: ts.CompilerOptions = {
    lib: ["ES2024", "DOM", "DOM.Iterable", "WebWorker"],
    types: [],
    strict: true,
  };

  it("node target: removes DOM lib, includes node in types", async () => {
    const packageDir = "/project/packages/core-node";
    vi.mocked(fsExists).mockResolvedValue(true);
    vi.mocked(fsReadJson).mockResolvedValue({
      devDependencies: {
        "@types/express": "^4.17.0",
      },
    });

    const result = await getCompilerOptionsForPackage(baseOptions, "node", packageDir);

    // DOM, WebWorker lib removed
    expect(result.lib).toEqual(["ES2024"]);
    // types includes node and express
    expect(result.types).toContain("node");
    expect(result.types).toContain("express");
  });

  it("browser target: keeps lib, removes node from types", async () => {
    const packageDir = "/project/packages/core-browser";
    vi.mocked(fsExists).mockResolvedValue(true);
    vi.mocked(fsReadJson).mockResolvedValue({
      devDependencies: {
        "@types/node": "^20.0.0",
        "@types/react": "^18.0.0",
      },
    });

    const result = await getCompilerOptionsForPackage(baseOptions, "browser", packageDir);

    // lib is preserved
    expect(result.lib).toEqual(["ES2024", "DOM", "DOM.Iterable", "WebWorker"]);
    // types removes node, includes react only
    expect(result.types).not.toContain("node");
    expect(result.types).toContain("react");
  });

  it("neutral target: keeps lib, includes node in types", async () => {
    const packageDir = "/project/packages/core-common";
    vi.mocked(fsExists).mockResolvedValue(true);
    vi.mocked(fsReadJson).mockResolvedValue({
      devDependencies: {
        "@types/lodash": "^4.0.0",
      },
    });

    const result = await getCompilerOptionsForPackage(baseOptions, "neutral", packageDir);

    // lib is preserved (includes DOM)
    expect(result.lib).toEqual(["ES2024", "DOM", "DOM.Iterable", "WebWorker"]);
    // types includes node and lodash
    expect(result.types).toContain("node");
    expect(result.types).toContain("lodash");
  });

  it("node target: removes duplicate node types", async () => {
    const packageDir = "/project/packages/core-node";
    vi.mocked(fsExists).mockResolvedValue(true);
    vi.mocked(fsReadJson).mockResolvedValue({
      devDependencies: {
        "@types/node": "^20.0.0",
      },
    });

    const result = await getCompilerOptionsForPackage(baseOptions, "node", packageDir);

    // node type is included only once without duplicates
    expect(result.types?.filter((t) => t === "node")).toHaveLength(1);
  });

  it("handles missing package.json with empty types", async () => {
    const packageDir = "/project/packages/unknown";
    vi.mocked(fsExists).mockResolvedValue(false);

    const result = await getCompilerOptionsForPackage(baseOptions, "node", packageDir);

    // includes only node (types from package are empty array)
    expect(result.types).toEqual(["node"]);
  });

  it("handles undefined lib correctly", async () => {
    const optionsWithoutLib: ts.CompilerOptions = {
      strict: true,
    };
    const packageDir = "/project/packages/core-node";
    vi.mocked(fsExists).mockResolvedValue(false);

    const result = await getCompilerOptionsForPackage(optionsWithoutLib, "node", packageDir);

    // handles undefined lib without error
    expect(result.lib).toBeUndefined();
    expect(result.types).toEqual(["node"]);
  });

  it("does not mutate original baseOptions (immutability)", async () => {
    const originalOptions: ts.CompilerOptions = {
      lib: ["ES2024", "DOM"],
      types: ["original"],
      strict: true,
    };
    const packageDir = "/project/packages/core-node";
    vi.mocked(fsExists).mockResolvedValue(false);

    await getCompilerOptionsForPackage(originalOptions, "node", packageDir);

    // original options are not changed
    expect(originalOptions.lib).toEqual(["ES2024", "DOM"]);
    expect(originalOptions.types).toEqual(["original"]);
    expect(originalOptions.noEmit).toBeUndefined();
  });
});
