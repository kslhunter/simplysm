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

  it("에러 상태인 결과만 필터링할 수 있다", () => {
    const collector = new ResultCollector();
    collector.add({ name: "pkg1", target: "node", type: "build", status: "success" });
    collector.add({ name: "pkg2", target: "node", type: "build", status: "error", message: "fail" });

    const errors = collector.getErrors();

    expect(errors).toHaveLength(1);
    expect(errors[0].name).toBe("pkg2");
  });

  it("서버 상태인 결과만 필터링할 수 있다", () => {
    const collector = new ResultCollector();
    collector.add({ name: "pkg1", target: "node", type: "build", status: "success" });
    collector.add({ name: "pkg2", target: "server", type: "server", status: "running", port: 3000 });

    const servers = collector.getServers();

    expect(servers).toHaveLength(1);
    expect(servers[0].port).toBe(3000);
  });

  it("모든 결과를 조회할 수 있다", () => {
    const collector = new ResultCollector();
    collector.add({ name: "pkg1", target: "node", type: "build", status: "success" });
    collector.add({ name: "pkg2", target: "node", type: "dts", status: "success" });

    const all = collector.getAll();

    expect(all).toHaveLength(2);
  });

  it("특정 타입의 결과만 필터링할 수 있다", () => {
    const collector = new ResultCollector();
    collector.add({ name: "pkg1", target: "node", type: "build", status: "success" });
    collector.add({ name: "pkg2", target: "node", type: "dts", status: "success" });
    collector.add({ name: "pkg3", target: "node", type: "build", status: "error", message: "fail" });

    const builds = collector.getByType("build");

    expect(builds).toHaveLength(2);
    expect(builds.every((r) => r.type === "build")).toBe(true);
  });

  it("결과를 초기화할 수 있다", () => {
    const collector = new ResultCollector();
    collector.add({ name: "pkg1", target: "node", type: "build", status: "success" });

    collector.clear();

    expect(collector.getAll()).toHaveLength(0);
  });

  it("같은 키로 결과를 추가하면 덮어쓴다", () => {
    const collector = new ResultCollector();
    collector.add({ name: "pkg1", target: "node", type: "build", status: "pending" });
    collector.add({ name: "pkg1", target: "node", type: "build", status: "success" });

    const result = collector.get("pkg1:build");

    expect(result?.status).toBe("success");
    expect(collector.getAll()).toHaveLength(1);
  });

  it("내부 Map을 반환할 수 있다 (하위 호환성)", () => {
    const collector = new ResultCollector();
    collector.add({ name: "pkg1", target: "node", type: "build", status: "success" });

    const map = collector.toMap();

    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(1);
  });
});
