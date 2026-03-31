import { describe, it, expect } from "vitest";
import { ResultCollector } from "../../src/infra/ResultCollector";

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
});
