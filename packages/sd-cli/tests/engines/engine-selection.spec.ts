import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("consola", () => ({
  consola: {
    withTag: vi.fn(() => ({
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock("@simplysm/core-node", () => ({
  Worker: {
    create: vi.fn(() => ({
      build: vi.fn(),
      startWatch: vi.fn(),
      stopWatch: vi.fn(),
      terminate: vi.fn(),
      on: vi.fn(),
    })),
  },
}));

const mockHasAngularCoreDependency = vi.fn<(pkgDir: string) => boolean>();
vi.mock("../../src/utils/package-utils", () => ({
  hasAngularCoreDependency: (...args: [string]) => mockHasAngularCoreDependency(...args),
}));

const { createBuildEngine } = await import("../../src/engines/index");
const { TscEngine } = await import("../../src/engines/TscEngine");
const { NgtscEngine } = await import("../../src/engines/NgtscEngine");
const { ServerEsbuildEngine } = await import("../../src/engines/ServerEsbuildEngine");
const { ViteEngine } = await import("../../src/engines/ViteEngine");

import type { BuildPackageInfo, ClientPackageInfo, ServerPackageInfo } from "../../src/engines/types";

describe("createBuildEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Acceptance: Scenario "비-Angular Library 패키지"
  it("returns TscEngine for node target package", () => {
    mockHasAngularCoreDependency.mockReturnValue(false);
    const pkg: BuildPackageInfo = {
      name: "test",
      dir: "/packages/test",
      config: { target: "node" } as any,
    };

    const engine = createBuildEngine(pkg, { cwd: "/root" });

    expect(engine).toBeInstanceOf(TscEngine);
  });

  it("returns TscEngine for browser target package", () => {
    mockHasAngularCoreDependency.mockReturnValue(false);
    const pkg: BuildPackageInfo = {
      name: "test",
      dir: "/packages/test",
      config: { target: "browser" } as any,
    };

    const engine = createBuildEngine(pkg, { cwd: "/root" });

    expect(engine).toBeInstanceOf(TscEngine);
  });

  it("returns TscEngine for neutral target package", () => {
    mockHasAngularCoreDependency.mockReturnValue(false);
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
    mockHasAngularCoreDependency.mockReturnValue(false);
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
    mockHasAngularCoreDependency.mockReturnValue(true);
    const pkg: BuildPackageInfo = {
      name: "angular",
      dir: "/packages/angular",
      config: { target: "browser" } as any,
    };

    const engine = createBuildEngine(pkg, { cwd: "/root" });

    expect(engine).toBeInstanceOf(NgtscEngine);
  });

  it("returns TscEngine when package.json has no @angular/core dependency", () => {
    mockHasAngularCoreDependency.mockReturnValue(false);
    const pkg: BuildPackageInfo = {
      name: "core-browser",
      dir: "/packages/core-browser",
      config: { target: "browser" } as any,
    };

    const engine = createBuildEngine(pkg, { cwd: "/root" });

    expect(engine).toBeInstanceOf(TscEngine);
  });

  // Unit: hasAngularCoreDependency is called with the package directory
  it("calls hasAngularCoreDependency with the package dir for library targets", () => {
    mockHasAngularCoreDependency.mockReturnValue(false);
    const pkg: BuildPackageInfo = {
      name: "test",
      dir: "/packages/test",
      config: { target: "browser" } as any,
    };

    createBuildEngine(pkg, { cwd: "/root" });

    expect(mockHasAngularCoreDependency).toHaveBeenCalledWith("/packages/test");
  });

  // Unit: does not call hasAngularCoreDependency for server targets
  it("does not check @angular/core dependency for server target", () => {
    const pkg: ServerPackageInfo = {
      name: "test-server",
      dir: "/packages/test-server",
      config: { target: "server" } as any,
    };

    createBuildEngine(pkg, { cwd: "/root" });

    expect(mockHasAngularCoreDependency).not.toHaveBeenCalled();
  });

  // Acceptance: Scenario "client target에 ViteEngine 생성"
  it("returns ViteEngine for client target package", () => {
    const pkg: ClientPackageInfo = {
      name: "my-client",
      dir: "/packages/my-client",
      config: { target: "client", server: "my-server" } as any,
    };

    const engine = createBuildEngine(pkg, { cwd: "/root" });

    expect(engine).toBeInstanceOf(ViteEngine);
  });

  // Unit: does not call hasAngularCoreDependency for client targets
  it("does not check @angular/core dependency for client target", () => {
    const pkg: ClientPackageInfo = {
      name: "my-client",
      dir: "/packages/my-client",
      config: { target: "client", server: "my-server" } as any,
    };

    createBuildEngine(pkg, { cwd: "/root" });

    expect(mockHasAngularCoreDependency).not.toHaveBeenCalled();
  });
});

// Acceptance: Scenario "ViteEngine이 어댑터 격리를 준수한다"
describe("ViteEngine adapter isolation", () => {
  it("ViteEngine과 그 워커가 @angular/* 패키지를 직접 import하지 않음", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const sdCliSrc = path.resolve(import.meta.dirname, "../../src");

    const filesToCheck = [
      path.join(sdCliSrc, "engines", "ViteEngine.ts"),
      path.join(sdCliSrc, "workers", "client.worker.ts"),
      path.join(sdCliSrc, "utils", "vite-config.ts"),
    ];

    const angularImportPattern = /from\s+["']@angular\/(build|compiler-cli)/;

    for (const filePath of filesToCheck) {
      const content = fs.readFileSync(filePath, "utf-8");
      const hasDirectImport = angularImportPattern.test(content);
      expect(hasDirectImport, `${path.basename(filePath)} should not directly import @angular/*`).toBe(false);
    }
  });

  it("vite-angular-plugin.ts imports only JavaScriptTransformer from @angular/build/private", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const pluginFile = path.resolve(import.meta.dirname, "../../src/angular/vite-angular-plugin.ts");
    const content = fs.readFileSync(pluginFile, "utf-8");

    expect(content).toContain("@angular/build/private");
    expect(content).toContain("JavaScriptTransformer");
    expect(content).not.toContain("createAngularCompilation");
    expect(content).not.toMatch(/\bSourceFileCache\b(?<!AngularSourceFileCache)/);
    expect(content).not.toContain("ComponentStylesheetBundler");
  });
});

// Acceptance: Scenario "NgtscEngine이 어댑터 격리를 준수한다"
describe("NgtscEngine adapter isolation", () => {
  it("NgtscEngine과 그 의존성이 @angular/* 패키지를 직접 import하지 않음", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const sdCliSrc = path.resolve(import.meta.dirname, "../../src");

    const filesToCheck = [
      path.join(sdCliSrc, "engines", "NgtscEngine.ts"),
      path.join(sdCliSrc, "workers", "ngtsc-build.worker.ts"),
      path.join(sdCliSrc, "utils", "ngtsc-build-core.ts"),
      path.join(sdCliSrc, "utils", "output-path-rewriter.ts"),
    ];

    const angularImportPattern = /from\s+["']@angular\/(build|compiler-cli)/;

    for (const filePath of filesToCheck) {
      const content = fs.readFileSync(filePath, "utf-8");
      const hasDirectImport = angularImportPattern.test(content);
      expect(hasDirectImport, `${path.basename(filePath)} should not directly import @angular/*`).toBe(false);
    }
  });

  it("all Angular API access goes through angular-compiler.ts adapter", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const ngtscBuildCore = path.resolve(import.meta.dirname, "../../src/utils/ngtsc-build-core.ts");
    const content = fs.readFileSync(ngtscBuildCore, "utf-8");

    expect(content).toContain("./angular-compiler");
  });
});
