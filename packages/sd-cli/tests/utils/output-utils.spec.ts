import { describe, it, expect, vi, beforeEach } from "vitest";
import { consola } from "consola";
import * as coreCommon from "@simplysm/core-common";
import type { BuildResult } from "../../src/runtime/ResultCollector";
import type { PartialMessage } from "esbuild";

// output-utils.ts가 모듈 로드 시 createLogger("sd:cli:output")로 로거를 생성하므로,
// 동적 import 전에 spy 등록하여 createLogger가 consola 자체를 반환하게 한다
vi.spyOn(coreCommon, "createLogger").mockReturnValue(consola as any);
vi.spyOn(consola, "error").mockImplementation(() => {});
vi.spyOn(consola, "warn").mockImplementation(() => {});
vi.spyOn(consola, "info").mockImplementation(() => {});

const { formatBuildMessages, formatEsbuildMessages, printDiagnostics, printServers } =
  await import("../../src/utils/output-utils");

describe("formatBuildMessages", () => {
  it("formats name, label, and messages into indented lines", () => {
    const result = formatBuildMessages("core", "node", ["error in file.ts"]);
    expect(result).toBe("core (node)\n  error in file.ts");
  });

  it("splits multiline messages into separate indented lines", () => {
    const result = formatBuildMessages("core", "node", ["line1\nline2"]);
    expect(result).toContain("  line1");
    expect(result).toContain("  line2");
  });

  it("handles multiple messages", () => {
    const result = formatBuildMessages("core", "node", ["err1", "err2"]);
    expect(result).toContain("core (node)");
    expect(result).toContain("  err1");
    expect(result).toContain("  err2");
  });

  it("preserves empty lines without arrow prefix", () => {
    const result = formatBuildMessages("core", "node", ["line1\n\nline3"]);
    const lines = result.split("\n");
    expect(lines[0]).toBe("core (node)");
    expect(lines[1]).toBe("  line1");
    expect(lines[2]).toBe("");
    expect(lines[3]).toBe("  line3");
  });
});

describe("formatEsbuildMessages", () => {
  it("빈 배열이면 빈 배열을 반환한다", () => {
    expect(formatEsbuildMessages([], "error")).toEqual([]);
  });

  it("location이 없는 에러 메시지를 포맷한다", () => {
    const msgs: PartialMessage[] = [{ text: "Some global error" }];
    const result = formatEsbuildMessages(msgs, "error");
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("Some global error");
    expect(result[0]).not.toContain("[ERROR]");
  });

  it("location이 있으면 파일 경로와 코드 컨텍스트를 포함한다", () => {
    const msgs: PartialMessage[] = [{
      text: "Property 'id' does not exist",
      location: {
        file: "src/app/page.ts",
        line: 10,
        column: 4,
        length: 2,
        lineText: "    item.id;",
      },
    }];
    const result = formatEsbuildMessages(msgs, "error");
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("src/app/page.ts");
    expect(result[0]).toContain("Property 'id' does not exist");
  });

  it("notes를 포함한다", () => {
    const msgs: PartialMessage[] = [{
      text: "Build failed",
      notes: [{ text: "hint message" }],
    }];
    const result = formatEsbuildMessages(msgs, "error");
    expect(result[0]).toContain("hint message");
  });

  it("warning kind에서 [WARNING] 접두사를 제거한다", () => {
    const msgs: PartialMessage[] = [{ text: "Unused variable" }];
    const result = formatEsbuildMessages(msgs, "warning");
    expect(result[0]).not.toContain("[WARNING]");
    expect(result[0]).toContain("Unused variable");
  });

  it("여러 메시지를 각각 포맷한다", () => {
    const msgs: PartialMessage[] = [
      { text: "Error A" },
      { text: "Error B" },
    ];
    const result = formatEsbuildMessages(msgs, "error");
    expect(result).toHaveLength(2);
    expect(result[0]).toContain("Error A");
    expect(result[1]).toContain("Error B");
  });
});

describe("printDiagnostics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prints error results with message", () => {
    const results = new Map<string, BuildResult>([
      ["core:build", { name: "core", target: "node", type: "build", status: "error", message: "failed" }],
    ]);
    printDiagnostics(results);
    expect(consola.error).toHaveBeenCalledOnce();
  });

  it("prints error results without message", () => {
    const results = new Map<string, BuildResult>([
      ["core:build", { name: "core", target: "node", type: "build", status: "error" }],
    ]);
    printDiagnostics(results);
    expect(consola.error).toHaveBeenCalledOnce();
  });

  it("skips non-error results", () => {
    const results = new Map<string, BuildResult>([
      ["core:build", { name: "core", target: "node", type: "build", status: "success" }],
    ]);
    printDiagnostics(results);
    expect(consola.error).not.toHaveBeenCalled();
  });

  //#region Feature 2.1 Slice 3: typeLabel에 lint 분기 추가

  it("uses 'lint' as label for lint type errors (watch/dev)", () => {
    const results = new Map<string, BuildResult>([
      ["my-server:lint", { name: "my-server", target: "server", type: "lint", status: "error", message: "no-unused-vars" }],
    ]);
    printDiagnostics(results);
    const callArg = vi.mocked(consola.error).mock.calls[0][0] as string;
    expect(callArg).toContain("my-server (lint)");
  });

  it("uses target as label for build type errors", () => {
    const results = new Map<string, BuildResult>([
      ["core:build", { name: "core-common", target: "node", type: "build", status: "error", message: "build err" }],
    ]);
    printDiagnostics(results);
    const callArg = vi.mocked(consola.error).mock.calls[0][0] as string;
    expect(callArg).toContain("core-common (node)");
  });

  it("does not print lint errors when lint status is success", () => {
    const results = new Map<string, BuildResult>([
      ["core:lint", { name: "core-common", target: "node", type: "lint", status: "success" }],
    ]);
    printDiagnostics(results);
    expect(consola.error).not.toHaveBeenCalled();
  });

  //#endregion

  //#region Feature 1.1 Slice 2: printDiagnostics() 경고 출력 확장

  it("prints warnings with consola.warn", () => {
    const results = new Map<string, BuildResult>([
      ["core:build", { name: "core", target: "node", type: "build", status: "success", warnings: "unused var" }],
    ]);
    printDiagnostics(results);
    expect(consola.error).not.toHaveBeenCalled();
    expect(consola.warn).toHaveBeenCalledOnce();
    const callArg = vi.mocked(consola.warn).mock.calls[0][0] as string;
    expect(callArg).toContain("core (node)");
    expect(callArg).toContain("unused var");
  });

  it("prints errors before warnings", () => {
    const results = new Map<string, BuildResult>([
      ["core:build", { name: "core", target: "node", type: "build", status: "error", message: "type error" }],
      ["lib:build", { name: "lib", target: "browser", type: "build", status: "success", warnings: "deprecation" }],
    ]);
    printDiagnostics(results);
    expect(consola.error).toHaveBeenCalledOnce();
    expect(consola.warn).toHaveBeenCalledOnce();

    // error가 warn보다 먼저 호출되었는지 확인
    const errorOrder = vi.mocked(consola.error).mock.invocationCallOrder[0];
    const warnOrder = vi.mocked(consola.warn).mock.invocationCallOrder[0];
    expect(errorOrder).toBeLessThan(warnOrder);
  });

  it("does not print warnings when there are none", () => {
    const results = new Map<string, BuildResult>([
      ["core:build", { name: "core", target: "node", type: "build", status: "success" }],
    ]);
    printDiagnostics(results);
    expect(consola.error).not.toHaveBeenCalled();
    expect(consola.warn).not.toHaveBeenCalled();
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
