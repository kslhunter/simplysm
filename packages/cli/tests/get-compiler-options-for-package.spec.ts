import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type ts from "typescript";

// core-node 함수 모킹
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

  it("node 타겟: DOM lib 제거, types에 node 포함", async () => {
    const packageDir = "/project/packages/core-node";
    vi.mocked(fsExists).mockResolvedValue(true);
    vi.mocked(fsReadJson).mockResolvedValue({
      devDependencies: {
        "@types/express": "^4.17.0",
      },
    });

    const result = await getCompilerOptionsForPackage(baseOptions, "node", packageDir);

    // DOM, WebWorker lib 제거됨
    expect(result.lib).toEqual(["ES2024"]);
    // types에 node와 express 포함
    expect(result.types).toContain("node");
    expect(result.types).toContain("express");
  });

  it("browser 타겟: lib 유지, types에서 node 제거", async () => {
    const packageDir = "/project/packages/core-browser";
    vi.mocked(fsExists).mockResolvedValue(true);
    vi.mocked(fsReadJson).mockResolvedValue({
      devDependencies: {
        "@types/node": "^20.0.0",
        "@types/react": "^18.0.0",
      },
    });

    const result = await getCompilerOptionsForPackage(baseOptions, "browser", packageDir);

    // lib는 그대로 유지
    expect(result.lib).toEqual(["ES2024", "DOM", "DOM.Iterable", "WebWorker"]);
    // types에서 node 제거, react만 포함
    expect(result.types).not.toContain("node");
    expect(result.types).toContain("react");
  });

  it("neutral 타겟: lib 유지, types에 node 포함", async () => {
    const packageDir = "/project/packages/core-common";
    vi.mocked(fsExists).mockResolvedValue(true);
    vi.mocked(fsReadJson).mockResolvedValue({
      devDependencies: {
        "@types/lodash": "^4.0.0",
      },
    });

    const result = await getCompilerOptionsForPackage(baseOptions, "neutral", packageDir);

    // lib는 그대로 유지 (DOM 포함)
    expect(result.lib).toEqual(["ES2024", "DOM", "DOM.Iterable", "WebWorker"]);
    // types에 node와 lodash 포함
    expect(result.types).toContain("node");
    expect(result.types).toContain("lodash");
  });

  it("node 타겟: 중복된 node 타입 제거", async () => {
    const packageDir = "/project/packages/core-node";
    vi.mocked(fsExists).mockResolvedValue(true);
    vi.mocked(fsReadJson).mockResolvedValue({
      devDependencies: {
        "@types/node": "^20.0.0",
      },
    });

    const result = await getCompilerOptionsForPackage(baseOptions, "node", packageDir);

    // node 타입이 중복 없이 한 번만 포함
    expect(result.types?.filter((t) => t === "node")).toHaveLength(1);
  });

  it("package.json이 없는 경우 빈 types로 처리", async () => {
    const packageDir = "/project/packages/unknown";
    vi.mocked(fsExists).mockResolvedValue(false);

    const result = await getCompilerOptionsForPackage(baseOptions, "node", packageDir);

    // node만 포함 (패키지에서 읽은 types는 빈 배열)
    expect(result.types).toEqual(["node"]);
  });

  it("lib가 undefined인 경우 처리", async () => {
    const optionsWithoutLib: ts.CompilerOptions = {
      strict: true,
    };
    const packageDir = "/project/packages/core-node";
    vi.mocked(fsExists).mockResolvedValue(false);

    const result = await getCompilerOptionsForPackage(optionsWithoutLib, "node", packageDir);

    // lib가 undefined여도 에러 없이 처리
    expect(result.lib).toBeUndefined();
    expect(result.types).toEqual(["node"]);
  });

  it("원본 baseOptions가 변경되지 않음 (immutability)", async () => {
    const originalOptions: ts.CompilerOptions = {
      lib: ["ES2024", "DOM"],
      types: ["original"],
      strict: true,
    };
    const packageDir = "/project/packages/core-node";
    vi.mocked(fsExists).mockResolvedValue(false);

    await getCompilerOptionsForPackage(originalOptions, "node", packageDir);

    // 원본 옵션이 변경되지 않음
    expect(originalOptions.lib).toEqual(["ES2024", "DOM"]);
    expect(originalOptions.types).toEqual(["original"]);
    expect(originalOptions.noEmit).toBeUndefined();
  });
});
