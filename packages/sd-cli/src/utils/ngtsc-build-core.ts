import path from "path";
import fs from "fs";
import ts from "typescript";
import { err as errNs } from "@simplysm/core-common";
import { consola } from "consola";

const logger = consola.withTag("sd:cli:ngtsc-build");
import type { BuildOutput } from "../engines/types";
import type { SerializedDiagnostic } from "./typecheck-serialization";
import type { LintWithProgramResult } from "./lint-with-program";
import type { TypecheckEnv } from "./tsconfig";
import { compileScssFile } from "./scss-compiler";

//#region Types

export interface NgtscBuildInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  output: BuildOutput;
  /** 타입체크 환경. 설정 시 getCompilerOptionsForEnv()로 compilerOptions를 조정한다. */
  env?: TypecheckEnv;
  /** sd.config.ts의 replaceDeps 설정 */
  replaceDeps?: Record<string, string>;
}

export interface NgtscBuildResult {
  build: { success: boolean; errors?: string[]; warnings?: string[]; diagnostics: SerializedDiagnostic[] };
  lint?: LintWithProgramResult;
}

export interface NgtscCombinedBuildEvent {
  build: { success: boolean; errors?: string[]; warnings?: string[] };
  lint?: LintWithProgramResult;
}

//#endregion

//#region CompilerOptions helpers

export function buildCompilerOptions(
  baseOptions: ts.CompilerOptions,
  pkgDir: string,
  output: BuildOutput,
): ts.CompilerOptions {
  const needsEmit = output.js || output.dts;
  const options: ts.CompilerOptions = {
    ...baseOptions,
    sourceMap: false,
    outDir: path.join(pkgDir, "dist"),
    incremental: true,
    tsBuildInfoFile: path.join(
      pkgDir,
      ".cache",
      needsEmit ? "ngtsc-build.tsbuildinfo" : "ngtsc-typecheck.tsbuildinfo",
    ),
  };

  if (output.js && output.dts) {
    options.noEmit = false;
    options.declaration = true;
    options.declarationMap = true;
    options.emitDeclarationOnly = false;
    options.declarationDir = path.join(pkgDir, "dist");
  } else if (output.js && !output.dts) {
    options.noEmit = false;
    options.declaration = false;
    options.declarationMap = false;
    options.emitDeclarationOnly = false;
  } else if (!output.js && output.dts) {
    options.noEmit = false;
    options.declaration = true;
    options.declarationMap = true;
    options.emitDeclarationOnly = true;
    options.declarationDir = path.join(pkgDir, "dist");
  } else {
    // 둘 다 false — 타입체크만 수행
    options.noEmit = true;
    options.declaration = false;
    options.declarationMap = false;
    options.emitDeclarationOnly = false;
  }

  return options;
}

//#endregion

//#region SCSS loadPaths helper

export function buildScssLoadPaths(info: NgtscBuildInfo): string[] {
  return [
    path.join(info.pkgDir, "scss"),
    path.join(info.cwd, "node_modules"),
  ];
}

//#endregion

export function trackDeps(
  depsMap: Map<string, Set<string>>,
  containingFile: string,
  dependencies: string[],
): void {
  let deps = depsMap.get(containingFile);
  if (deps == null) {
    deps = new Set<string>();
    depsMap.set(containingFile, deps);
  }
  for (const dep of dependencies) {
    deps.add(dep);
  }
}

export function formatScssError(err: unknown, containingFile: string): string {
  const message = errNs.message(err);
  return `SCSS error in ${containingFile}: ${message}`;
}

export interface SideEffectScssEntry {
  scssAbsPath: string;
  cssAbsPath: string;
  sourceFileName: string;
}

export interface SideEffectScssOptions {
  loadPaths: string[];
  scssErrors: string[];
  scssDependencies: Map<string, Set<string>>;
  registry?: Map<string, SideEffectScssEntry>;
}

//#region Side-effect SCSS

/**
 * 레지스트리의 모든 side-effect SCSS 항목을 CSS로 컴파일한다.
 * compileGlobalScss와 동일한 패턴 — 항상 모든 항목을 재컴파일한다.
 * 에러 발생 시 scssErrors에 추가하고 기존 CSS 파일을 보존한다.
 */
export function compileSideEffectScss(
  registry: ReadonlyMap<string, SideEffectScssEntry>,
  loadPaths: string[],
  scssErrors: string[],
  scssDependencies: Map<string, Set<string>>,
): void {
  logger.debug(`side-effect SCSS 컴파일 시작 (${registry.size}개)`);
  for (const entry of registry.values()) {
    try {
      const result = compileScssFile(entry.scssAbsPath, loadPaths);
      fs.mkdirSync(path.dirname(entry.cssAbsPath), { recursive: true });
      fs.writeFileSync(entry.cssAbsPath, result.css, "utf-8");
      trackDeps(scssDependencies, entry.sourceFileName, result.dependencies);
    } catch (err) {
      scssErrors.push(formatScssError(err, entry.scssAbsPath));
    }
  }
  logger.debug("side-effect SCSS 컴파일 완료");
}

//#endregion

//#region Global SCSS

export function compileGlobalScss(
  pkgDir: string,
  loadPaths: string[],
): string[] {
  const stylesPath = path.join(pkgDir, "scss", "styles.scss");
  if (!fs.existsSync(stylesPath)) return [];
  logger.debug("global SCSS 컴파일 시작");

  const errors: string[] = [];
  try {
    const result = compileScssFile(stylesPath, loadPaths);
    const distDir = path.join(pkgDir, "dist");
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, "styles.css"), result.css, "utf-8");
  } catch (err) {
    errors.push(`Global SCSS error: ${errNs.message(err)}`);
  }
  logger.debug("global SCSS 컴파일 완료");
  return errors;
}

//#endregion

