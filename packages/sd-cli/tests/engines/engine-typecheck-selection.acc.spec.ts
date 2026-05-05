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

import { createTypecheckEngine } from "../../src/engines/engine-factory";
import { TscEngine } from "../../src/engines/TscEngine";
import { NgtscEngine } from "../../src/engines/NgtscEngine";
import { ServerEsbuildEngine } from "../../src/engines/ServerEsbuildEngine";

import type {
  BuildPackageInfo,
  ClientPackageInfo,
  ServerPackageInfo,
} from "../../src/engines/types";

describe("createTypecheckEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(packageUtils, "hasAngularCoreDependency").mockReturnValue(false);
  });

  // Acceptance: Scenario "client target + typecheck + Angular 의존성 있음"
  it("returns NgtscEngine for client target when @angular/core dependency exists", () => {
    vi.mocked(packageUtils.hasAngularCoreDependency).mockReturnValue(true);
    const pkg: ClientPackageInfo = {
      name: "my-client",
      dir: "/packages/my-client",
      config: { target: "client", server: "my-server" } as any,
    };

    const engine = createTypecheckEngine(pkg, { cwd: "/root" });

    expect(engine).toBeInstanceOf(NgtscEngine);
  });

  // Acceptance: Scenario "client target + typecheck + Angular 의존성 없음"
  it("returns TscEngine for client target when no @angular/core dependency", () => {
    const pkg: ClientPackageInfo = {
      name: "my-client",
      dir: "/packages/my-client",
      config: { target: "client", server: "my-server" } as any,
    };

    const engine = createTypecheckEngine(pkg, { cwd: "/root" });

    expect(engine).toBeInstanceOf(TscEngine);
  });

  // Acceptance: Scenario "server target은 변경 없음"
  it("returns ServerEsbuildEngine for server target (delegates to createBuildEngine)", () => {
    const pkg: ServerPackageInfo = {
      name: "test-server",
      dir: "/packages/test-server",
      config: { target: "server" } as any,
    };

    const engine = createTypecheckEngine(pkg, { cwd: "/root" });

    expect(engine).toBeInstanceOf(ServerEsbuildEngine);
  });

  // Acceptance: Scenario "browser target은 변경 없음"
  it("returns TscEngine for browser target (delegates to createBuildEngine)", () => {
    const pkg: BuildPackageInfo = {
      name: "core-browser",
      dir: "/packages/core-browser",
      config: { target: "browser" } as any,
    };

    const engine = createTypecheckEngine(pkg, { cwd: "/root" });

    expect(engine).toBeInstanceOf(TscEngine);
  });
});
