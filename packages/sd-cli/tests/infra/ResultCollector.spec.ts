import { describe, it, expect } from "vitest";
import { ResultCollector, type BuildResult } from "../../src/infra/ResultCollector";

describe("ResultCollector", () => {
  it("결과를 추가하고 조회할 수 있다", () => {
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

  it("같은 키로 결과를 추가하면 덮어쓴다", () => {
    const collector = new ResultCollector();
    collector.add({ name: "pkg1", target: "node", type: "build", status: "pending" });
    collector.add({ name: "pkg1", target: "node", type: "build", status: "success" });

    const result = collector.get("pkg1:build");

    expect(result?.status).toBe("success");
    expect(collector.toMap().size).toBe(1);
  });

  it("내부 Map을 반환할 수 있다", () => {
    const collector = new ResultCollector();
    collector.add({ name: "pkg1", target: "node", type: "build", status: "success" });

    const map = collector.toMap();

    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(1);
  });
});
