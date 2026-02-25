import { describe, it, expect } from "vitest";
import { ResultCollector, type BuildResult } from "../../src/infra/ResultCollector";

describe("ResultCollector", () => {
  it("adds and retrieves result", () => {
    const collector = new ResultCollector();
    const result: BuildResult = {
      name: "core-common",
      target: "neutral",
      type: "build",
      status: "success",
    };

    collector.add(result);

    expect(collector.get("core-common:build")).toEqual(result);
  });

  it("overwrites result when added with same key", () => {
    const collector = new ResultCollector();
    collector.add({ name: "pkg1", target: "node", type: "build", status: "pending" });
    collector.add({ name: "pkg1", target: "node", type: "build", status: "success" });

    const result = collector.get("pkg1:build");

    expect(result?.status).toBe("success");
    expect(collector.toMap().size).toBe(1);
  });

  it("returns internal Map", () => {
    const collector = new ResultCollector();
    collector.add({ name: "pkg1", target: "node", type: "build", status: "success" });

    const map = collector.toMap();

    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(1);
  });
});
