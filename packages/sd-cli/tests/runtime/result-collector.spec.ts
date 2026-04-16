import { describe, it, expect } from "vitest";
import { ResultCollector } from "../../src/runtime/ResultCollector";

describe("ResultCollector", () => {
  it("adds and retrieves a build result by key", () => {
    const collector = new ResultCollector();
    collector.add({ name: "core", target: "node", type: "build", status: "success" });

    const result = collector.get("core:build");
    expect(result).toBeDefined();
    expect(result!.name).toBe("core");
    expect(result!.status).toBe("success");
  });

  it("overwrites result with same key on re-add", () => {
    const collector = new ResultCollector();
    collector.add({ name: "core", target: "node", type: "build", status: "building" });
    collector.add({ name: "core", target: "node", type: "build", status: "success" });

    expect(collector.get("core:build")!.status).toBe("success");
  });

  it("returns all results via toMap", () => {
    const collector = new ResultCollector();
    collector.add({ name: "core", target: "node", type: "build", status: "success" });
    collector.add({ name: "core", target: "node", type: "lint", status: "building" });

    const map = collector.toMap();
    expect(map.size).toBe(2);
    expect(map.has("core:build")).toBe(true);
    expect(map.has("core:lint")).toBe(true);
  });

  it("returns undefined for non-existent key", () => {
    const collector = new ResultCollector();
    expect(collector.get("nonexistent")).toBeUndefined();
  });

  it("uses name:type as key format", () => {
    const collector = new ResultCollector();
    collector.add({ name: "storage", target: "node", type: "server", status: "running", port: 3000 });

    expect(collector.get("storage:server")).toBeDefined();
    expect(collector.get("storage:build")).toBeUndefined();
  });

  it("toMap returns ReadonlyMap type (compile-time mutation prevention)", () => {
    const collector = new ResultCollector();
    collector.add({ name: "core", target: "node", type: "build", status: "success" });

    const map = collector.toMap();
    expect(map.size).toBe(1);
    expect(map.get("core:build")!.status).toBe("success");
  });

  //#region Feature 1.1 Slice 1: BuildResult warnings 필드

  it("stores warnings alongside error message", () => {
    const collector = new ResultCollector();
    collector.add({
      name: "client-pda",
      target: "client",
      type: "build",
      status: "error",
      message: "타입 에러",
      warnings: "사용되지 않는 변수",
    });

    const result = collector.get("client-pda:build");
    expect(result!.status).toBe("error");
    expect(result!.message).toBe("타입 에러");
    expect(result!.warnings).toBe("사용되지 않는 변수");
  });

  it("stores warnings on success result", () => {
    const collector = new ResultCollector();
    collector.add({
      name: "core",
      target: "node",
      type: "build",
      status: "success",
      warnings: "경고1\n경고2",
    });

    const result = collector.get("core:build");
    expect(result!.status).toBe("success");
    expect(result!.warnings).toBe("경고1\n경고2");
  });

  it("warnings is undefined when not provided", () => {
    const collector = new ResultCollector();
    collector.add({ name: "core", target: "node", type: "build", status: "success" });

    const result = collector.get("core:build");
    expect(result!.warnings).toBeUndefined();
  });

  it("overwrites warnings on re-add", () => {
    const collector = new ResultCollector();
    collector.add({
      name: "core",
      target: "node",
      type: "build",
      status: "success",
      warnings: "old warning",
    });
    collector.add({
      name: "core",
      target: "node",
      type: "build",
      status: "success",
    });

    // 새 결과에 warnings가 없으면 이전 값은 덮어씌워짐
    expect(collector.get("core:build")!.warnings).toBeUndefined();
  });

  //#endregion
});
