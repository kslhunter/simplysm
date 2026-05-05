import { describe, it, expect, vi, beforeEach } from "vitest";
import { Worker } from "@simplysm/core-node";
import * as packageUtils from "../../src/utils/package-utils";

vi.spyOn(Worker, "create").mockReturnValue({
  build: vi.fn(),
  startWatch: vi.fn(),
  stopWatch: vi.fn(),
  terminate: vi.fn(),
  on: vi.fn(),
} as any);

import { createBuildEngine, createTypecheckEngine } from "../../src/engines/engine-factory";
import { TscEngine } from "../../src/engines/TscEngine";
import { NgtscEngine } from "../../src/engines/NgtscEngine";
import { ServerEsbuildEngine } from "../../src/engines/ServerEsbuildEngine";
import { EsbuildClientEngine } from "../../src/engines/EsbuildClientEngine";

import type { BuildPackageInfo, ClientPackageInfo, ServerPackageInfo } from "../../src/engines/types";

describe("createBuildEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(packageUtils, "hasAngularCoreDependency").mockReturnValue(false);
  });

  // Acceptance: Scenario "비-Angular Library 패키지"
  it("returns TscEngine for node target package", () => {
    const pkg: BuildPackageInfo = {
      name: "test",
      dir: "/packages/test",
      config: { target: "node" } as any,
    };

    const engine = createBuildEngine(pkg, { cwd: "/root" });

    expect(engine).toBeInstanceOf(TscEngine);
  });

  it("returns TscEngine for browser target package", () => {
    const pkg: BuildPackageInfo = {
      name: "test",
      dir: "/packages/test",
      config: { target: "browser" } as any,
    };

    const engine = createBuildEngine(pkg, { cwd: "/root" });

    expect(engine).toBeInstanceOf(TscEngine);
  });

  it("returns TscEngine for neutral target package", () => {
    const pkg: BuildPackageInfo = {
      name: "test",
      dir: "/packages/test",
      config: { target: "neutral" } as any,
    };

    const engine = createBuildEngine(pkg, { cwd: "/root" });

    expect(engine).toBeInstanceOf(TscEngine);
  });

  // Acceptance: Scenario "Server 패키지는 변경 없음"
  it("returns ServerEsbuildEngine for server target package", () => {
    const pkg: ServerPackageInfo = {
      name: "test-server",
      dir: "/packages/test-server",
      config: { target: "server" } as any,
    };

    const engine = createBuildEngine(pkg, { cwd: "/root" });

    expect(engine).toBeInstanceOf(ServerEsbuildEngine);
  });

  // Acceptance: Scenario "dependencies에 @angular/core가 있으면 Angular 패키지"
  it("returns NgtscEngine when package.json has @angular/core dependency", () => {
    vi.mocked(packageUtils.hasAngularCoreDependency).mockReturnValue(true);
    const pkg: BuildPackageInfo = {
      name: "angular",
      dir: "/packages/angular",
      config: { target: "browser" } as any,
    };

    const engine = createBuildEngine(pkg, { cwd: "/root" });

    expect(engine).toBeInstanceOf(NgtscEngine);
  });

  it("returns TscEngine when package.json has no @angular/core dependency", () => {
    const pkg: BuildPackageInfo = {
      name: "core-browser",
      dir: "/packages/core-browser",
      config: { target: "browser" } as any,
    };

    const engine = createBuildEngine(pkg, { cwd: "/root" });

    expect(engine).toBeInstanceOf(TscEngine);
  });

  // Acceptance: Scenario "client target에 EsbuildClientEngine 생성"
  it("returns EsbuildClientEngine for client target package", () => {
    const pkg: ClientPackageInfo = {
      name: "my-client",
      dir: "/packages/my-client",
      config: { target: "client", server: "my-server" } as any,
    };

    const engine = createBuildEngine(pkg, { cwd: "/root" });

    expect(engine).toBeInstanceOf(EsbuildClientEngine);
  });

});

describe("createTypecheckEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(packageUtils, "hasAngularCoreDependency").mockReturnValue(false);
  });

  // Unit: client target은 EsbuildClientEngine이 아닌 엔진이 반환
  it("does not return EsbuildClientEngine for client target", () => {
    const pkg: ClientPackageInfo = {
      name: "my-client",
      dir: "/packages/my-client",
      config: { target: "client", server: "my-server" } as any,
    };

    const engine = createTypecheckEngine(pkg, { cwd: "/root" });

    expect(engine).not.toBeInstanceOf(EsbuildClientEngine);
  });

  // Unit: neutral target은 TscEngine으로 위임
  it("returns TscEngine for neutral target", () => {
    const pkg: BuildPackageInfo = {
      name: "core-common",
      dir: "/packages/core-common",
      config: { target: "neutral" } as any,
    };

    const engine = createTypecheckEngine(pkg, { cwd: "/root" });

    expect(engine).toBeInstanceOf(TscEngine);
  });
});
