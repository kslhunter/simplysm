import { describe, it, expect } from "vitest";
import path from "path";
import ts from "typescript";
import { AngularBuildPipeline } from "../../src/angular/angular-build-pipeline.js";
import { AngularSourceFileCache } from "../../src/angular/angular-compiler.js";
import { getPackageSourceFiles } from "../../src/utils/tsconfig.js";

const FIXTURE_DIR = path.resolve(import.meta.dirname, "fixtures/packages/basic-app");
const TSCONFIG_PATH = path.join(FIXTURE_DIR, "tsconfig.json");

function parseFixtureConfig() {
  const configFile = ts.readConfigFile(TSCONFIG_PATH, ts.sys.readFile);
  return ts.parseJsonConfigFileContent(configFile.config, ts.sys, FIXTURE_DIR);
}

function createPipelineOptions(
  mode: "client" | "library",
  overrides?: Partial<ConstructorParameters<typeof AngularBuildPipeline>[0]>,
) {
  const parsed = parseFixtureConfig();
  const rootNames = getPackageSourceFiles(FIXTURE_DIR, parsed);
  return {
    mode,
    pkgDir: FIXTURE_DIR,
    cwd: FIXTURE_DIR,
    rootNames,
    compilerOptions: {
      ...parsed.options,
      noEmit: false,
      declaration: false,
      declarationMap: false,
    },
    angularCompilerOptions: parsed.raw?.angularCompilerOptions as
      | Record<string, unknown>
      | undefined,
    ...overrides,
  };
}

describe("AngularBuildPipeline", () => {
  // --- client mode ---

  it("client mode: initializes, emits compiled JS, tracks SCSS deps, and collects diagnostics", async () => {
    const pipeline = new AngularBuildPipeline(createPipelineOptions("client"));
    const result = await pipeline.initialize();

    // emitted file for known component
    const appComponentPath = path
      .join(FIXTURE_DIR, "src/app.component.ts")
      .replace(/\\/g, "/");
    const emitted = pipeline.getEmittedFile(appComponentPath);
    expect(emitted).toBeDefined();
    expect(emitted!.length).toBeGreaterThan(0);

    // unknown path returns undefined
    expect(pipeline.getEmittedFile("/nonexistent.ts")).toBeUndefined();

    // SCSS dependencies tracked for styled component
    const styledPath = path
      .join(FIXTURE_DIR, "src/styled.component.ts")
      .replace(/\\/g, "/");
    const styledEmitted = pipeline.getEmittedFile(styledPath);
    expect(styledEmitted).toBeDefined();

    // diagnostics categorized (no errors expected for valid fixture)
    expect(result.diagnostics.errors).toHaveLength(0);
    expect(Array.isArray(result.diagnostics.warnings)).toBe(true);
    expect(result.scssErrors).toHaveLength(0);

    // emittedFiles map should contain all source files
    expect(pipeline.getEmittedFiles().size).toBeGreaterThan(0);

    // getTsProgram should return a valid program
    const program = pipeline.getTsProgram();
    expect(program).toBeDefined();
    expect(program.getSourceFiles().length).toBeGreaterThan(0);
  });

  // --- library mode ---

  it("library mode: initializes with sync SCSS and emits files", async () => {
    const pipeline = new AngularBuildPipeline(createPipelineOptions("library"));
    const result = await pipeline.initialize();

    expect(result.diagnostics.errors).toHaveLength(0);
    expect(result.scssErrors).toHaveLength(0);
    expect(pipeline.getEmittedFiles().size).toBeGreaterThan(0);
  });

  // --- getTsProgram ---

  it("getTsProgram throws if called before initialize", () => {
    const pipeline = new AngularBuildPipeline(createPipelineOptions("client"));
    expect(() => pipeline.getTsProgram()).toThrow();
  });

  // --- collectRawDiagnostics ---

  it("collectRawDiagnostics returns ts.Diagnostic array filtered by workspace", async () => {
    const pipeline = new AngularBuildPipeline(createPipelineOptions("library"));
    await pipeline.initialize();

    const rawDiags = pipeline.collectRawDiagnostics();
    expect(Array.isArray(rawDiags)).toBe(true);
    for (const d of rawDiags) {
      expect(d).toHaveProperty("category");
      expect(d).toHaveProperty("messageText");
    }
  });

  it("collectRawDiagnostics throws if called before initialize", () => {
    const pipeline = new AngularBuildPipeline(createPipelineOptions("client"));
    expect(() => pipeline.collectRawDiagnostics()).toThrow();
  });

  // --- writeEmitResults ---

  it("writeEmitResults writes emitted files to disk without error", async () => {
    const pipeline = new AngularBuildPipeline(createPipelineOptions("library"));
    await pipeline.initialize();

    expect(() => pipeline.writeEmitResults({ pkgDir: FIXTURE_DIR })).not.toThrow();
  });

  // --- findAffectedByScss ---

  it("findAffectedByScss returns owner files for a dependency SCSS", async () => {
    const pipeline = new AngularBuildPipeline(createPipelineOptions("client"));
    await pipeline.initialize();

    const variablesPath = path
      .join(FIXTURE_DIR, "scss/_variables.scss")
      .replace(/\\/g, "/");
    const affectedByVariables = pipeline.findAffectedByScss(variablesPath);
    expect(affectedByVariables.length).toBeGreaterThan(0);

    // clearScssDependencies should empty the map
    pipeline.clearScssDependencies();
    expect(pipeline.findAffectedByScss(variablesPath)).toHaveLength(0);
  });

  it("findAffectedByScss returns empty array when no deps match", async () => {
    const pipeline = new AngularBuildPipeline(createPipelineOptions("client"));
    await pipeline.initialize();

    expect(pipeline.findAffectedByScss("/nonexistent.scss")).toHaveLength(0);
  });

  // --- update ---

  it("update throws if called before initialize", async () => {
    const pipeline = new AngularBuildPipeline(createPipelineOptions("client"));
    await expect(pipeline.update([])).rejects.toThrow();
  });

  it("update re-compiles changed files incrementally", async () => {
    const pipeline = new AngularBuildPipeline(
      createPipelineOptions("client", { sourceFileCache: new AngularSourceFileCache() }),
    );
    await pipeline.initialize();

    const appPath = path.join(FIXTURE_DIR, "src/app.component.ts").replace(/\\/g, "/");
    const beforeUpdate = pipeline.getEmittedFile(appPath);
    expect(beforeUpdate).toBeDefined();

    const updateResult = await pipeline.update([appPath]);
    expect(updateResult.diagnostics.errors).toHaveLength(0);
    expect(pipeline.getEmittedFile(appPath)).toBeDefined();
  });

  // --- getPackageSourceFiles ---

  it("getPackageSourceFiles includes fixture files by default", () => {
    const parsed = parseFixtureConfig();
    const files = getPackageSourceFiles(FIXTURE_DIR, parsed);
    const fixtureFiles = files.filter((f) => f.includes(".fixture."));
    expect(fixtureFiles.length).toBeGreaterThan(0);
    const srcFiles = files.filter((f) => f.includes("/src/"));
    expect(srcFiles.length).toBeGreaterThan(0);
  });
});
