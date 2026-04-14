import { describe, it, expect, vi, beforeEach } from "vitest";
import { consola } from "consola";
import { formatBuildMessages, formatEsbuildMessage, printErrors, printServers } from "../../src/utils/output-utils";
import type { BuildResult } from "../../src/runtime/ResultCollector";

vi.spyOn(consola, "error").mockImplementation(() => {});
vi.spyOn(consola, "info").mockImplementation(() => {});

describe("formatBuildMessages", () => {
  it("formats name, label, and messages into indented lines", () => {
    const result = formatBuildMessages("core", "node", ["error in file.ts"]);
    expect(result).toBe("core (node)\n  → error in file.ts");
  });

  it("splits multiline messages into separate indented lines", () => {
    const result = formatBuildMessages("core", "node", ["line1\nline2"]);
    expect(result).toContain("→ line1");
    expect(result).toContain("→ line2");
  });

  it("handles multiple messages", () => {
    const result = formatBuildMessages("core", "node", ["err1", "err2"]);
    expect(result).toContain("core (node)");
    expect(result).toContain("→ err1");
    expect(result).toContain("→ err2");
  });
});

describe("formatEsbuildMessage", () => {
  it("notes가 없으면 text만 반환한다", () => {
    const msg = { text: "Type error", notes: [] };
    expect(formatEsbuildMessage(msg)).toBe("Type error");
  });

  it("notes가 1개면 text 뒤에 들여쓰기된 note를 포함한다", () => {
    const msg = {
      text: "Angular compilation initialization failed",
      notes: [{ text: "Component X has error" }],
    };
    expect(formatEsbuildMessage(msg)).toBe(
      "Angular compilation initialization failed\n  Component X has error",
    );
  });

  it("notes가 여러 개면 각 note를 줄바꿈으로 연결한다", () => {
    const msg = {
      text: "Build failed",
      notes: [{ text: "Error in file A" }, { text: "Error in file B" }],
    };
    expect(formatEsbuildMessage(msg)).toBe(
      "Build failed\n  Error in file A\n  Error in file B",
    );
  });

  it("esbuild Message의 추가 프로퍼티(location 등)가 있어도 무시한다", () => {
    const msg = {
      text: "Error",
      notes: [{ text: "detail", location: { file: "a.ts", line: 1 } }],
    };
    expect(formatEsbuildMessage(msg)).toBe("Error\n  detail");
  });
});

describe("printErrors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prints error results with message", () => {
    const results = new Map<string, BuildResult>([
      ["core:build", { name: "core", target: "node", type: "build", status: "error", message: "failed" }],
    ]);
    printErrors(results);
    expect(consola.error).toHaveBeenCalledOnce();
  });

  it("prints error results without message", () => {
    const results = new Map<string, BuildResult>([
      ["core:build", { name: "core", target: "node", type: "build", status: "error" }],
    ]);
    printErrors(results);
    expect(consola.error).toHaveBeenCalledOnce();
  });

  it("skips non-error results", () => {
    const results = new Map<string, BuildResult>([
      ["core:build", { name: "core", target: "node", type: "build", status: "success" }],
    ]);
    printErrors(results);
    expect(consola.error).not.toHaveBeenCalled();
  });

  //#region Feature 2.1 Slice 3: typeLabel에 lint 분기 추가

  it("uses 'lint' as label for lint type errors (watch/dev)", () => {
    const results = new Map<string, BuildResult>([
      ["my-server:lint", { name: "my-server", target: "server", type: "lint", status: "error", message: "no-unused-vars" }],
    ]);
    printErrors(results);
    const callArg = vi.mocked(consola.error).mock.calls[0][0] as string;
    expect(callArg).toContain("my-server (lint)");
  });

  it("uses target as label for build type errors", () => {
    const results = new Map<string, BuildResult>([
      ["core:build", { name: "core-common", target: "node", type: "build", status: "error", message: "build err" }],
    ]);
    printErrors(results);
    const callArg = vi.mocked(consola.error).mock.calls[0][0] as string;
    expect(callArg).toContain("core-common (node)");
  });

  it("does not print lint errors when lint status is success", () => {
    const results = new Map<string, BuildResult>([
      ["core:lint", { name: "core-common", target: "node", type: "lint", status: "success" }],
    ]);
    printErrors(results);
    expect(consola.error).not.toHaveBeenCalled();
  });

  //#endregion
});

describe("printServers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  it("prints server URL with port", () => {
    const results = new Map<string, BuildResult>([
      ["app:server", { name: "app", target: "server", type: "server", status: "running", port: 3000 }],
    ]);
    printServers(results);
    expect(consola.info).toHaveBeenCalledWith(expect.stringContaining("http://localhost:3000/"));
  });

  it("prints client URLs when server has connected clients", () => {
    const results = new Map<string, BuildResult>([
      ["app:server", { name: "app", target: "server", type: "server", status: "running", port: 3000 }],
    ]);
    const clientsMap = new Map([["app", ["client-a"]]]);
    printServers(results, clientsMap);
    expect(consola.info).toHaveBeenCalledWith(expect.stringContaining("http://localhost:3000/client-a/"));
  });

  it("does not print when no running servers", () => {
    const results = new Map<string, BuildResult>([
      ["core:build", { name: "core", target: "node", type: "build", status: "success" }],
    ]);
    printServers(results);
    expect(consola.info).not.toHaveBeenCalled();
  });
});
