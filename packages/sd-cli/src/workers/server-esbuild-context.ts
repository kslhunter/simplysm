import type ts from "typescript";
import esbuild from "esbuild";
import { err as errNs } from "@simplysm/core-common";
import { formatEsbuildMessages } from "../utils/output-utils";
import {
  createServerEsbuildOptions,
  writeChangedOutputFiles,
} from "../esbuild/esbuild-config";
import { createTscPlugin, type TscPluginResult } from "../esbuild/esbuild-tsc-plugin";
import type { TypecheckEnv } from "../utils/tsconfig";
import type { SerializedDiagnostic } from "../typecheck/typecheck-serialization";
import type { LintWithProgramResult } from "../lint/lint-with-program";

/**
 * esbuild watch context 생성 옵션
 */
export interface EsbuildContextOptions {
  pkgDir: string;
  entryPoints: string[];
  env?: Record<string, string>;
  external: string[];
  /** tsc 플러그인 옵션. 제공 시 createTscPlugin으로 플러그인을 생성하여 esbuild context에 포함한다. */
  tsc?: {
    cwd: string;
    output: { dts: boolean };
    env?: TypecheckEnv;
    includeTests?: boolean;
    lint?: boolean;
  };
}

/** esbuild watch context (모듈 스코프 상태) */
let context: esbuild.BuildContext | undefined;

/** 마지막 빌드의 metafile (변경 필터링용) */
let lastMetafile: esbuild.Metafile | undefined;

/** tsc 플러그인 인스턴스 (모듈 스코프 상태) */
let tscPlugin: TscPluginResult | undefined;

/**
 * esbuild watch context를 생성한다.
 * dev 모드 전용 (metafile:true, write:false).
 */
export async function createContext(options: EsbuildContextOptions): Promise<void> {
  if (options.tsc != null) {
    tscPlugin = createTscPlugin({
      pkgDir: options.pkgDir,
      cwd: options.tsc.cwd,
      output: options.tsc.output,
      env: options.tsc.env,
      includeTests: options.tsc.includeTests,
      lint: options.tsc.lint,
    });
  }

  const baseOptions = createServerEsbuildOptions({
    pkgDir: options.pkgDir,
    entryPoints: options.entryPoints,
    env: options.env,
    external: options.external,
    dev: true,
  });

  context = await esbuild.context({
    ...baseOptions,
    plugins: tscPlugin != null ? [tscPlugin.plugin] : [],
    metafile: true,
    write: false,
  });
}

/**
 * esbuild rebuild를 실행하고 metafile을 갱신한다.
 * context가 없으면 null을 반환한다 (tsc-only 경로).
 */
export async function rebuild(): Promise<{
  success: boolean;
  errors?: string[];
  warnings?: string[];
} | null> {
  if (context == null) return null;

  let result: esbuild.BuildResult;
  try {
    result = await context.rebuild();
  } catch (err) {
    const tscErrors = tscPlugin?.getErrors() ?? [];
    const allErrors = [errNs.message(err), ...tscErrors];
    return {
      success: false,
      errors: allErrors.length > 0 ? allErrors : undefined,
      warnings: undefined,
    };
  }

  if (result.metafile != null) {
    lastMetafile = result.metafile;
  }

  if (result.outputFiles) {
    await writeChangedOutputFiles(result.outputFiles);
  }

  const esbuildErrors = formatEsbuildMessages(result.errors, "error");
  const tscErrors = tscPlugin?.getErrors() ?? [];
  const allErrors = [...esbuildErrors, ...tscErrors];
  const warnings = formatEsbuildMessages(result.warnings, "warning");

  return {
    success: allErrors.length === 0,
    errors: allErrors.length > 0 ? allErrors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * esbuild context를 재생성한다 (LOGIC-001).
 *
 * 선제 초기화 + try/finally 패턴으로 리소스 해제를 보장한다:
 * 1. old context를 로컬 변수에 보관
 * 2. 모듈 참조를 undefined로 선제 초기화 — 생성 실패 시 disposed 참조 방지
 * 3. 새 context 생성 시도
 * 4. finally에서 old context dispose — 생성 성공/실패와 무관하게 실행
 */
export async function recreateContext(options: EsbuildContextOptions): Promise<void> {
  const oldContext = context;
  context = undefined;
  lastMetafile = undefined;

  if (tscPlugin != null) {
    tscPlugin.resetBuilderProgram();
  }

  try {
    await createContext(options);
  } finally {
    if (oldContext != null) {
      await oldContext.dispose();
    }
  }
}

/**
 * esbuild context를 정리하고 상태를 초기화한다.
 */
export async function dispose(): Promise<void> {
  const contextToDispose = context;
  context = undefined;
  lastMetafile = undefined;
  tscPlugin = undefined;

  if (contextToDispose != null) {
    await contextToDispose.dispose();
  }
}

/**
 * 마지막 빌드의 metafile을 반환한다 (변경 필터링에 사용).
 */
export function getMetafile(): esbuild.Metafile | undefined {
  return lastMetafile;
}

/**
 * esbuild context 존재 여부를 반환한다.
 */
export function hasContext(): boolean {
  return context != null;
}

/**
 * tsc 플러그인의 ts.Program을 반환한다.
 * 플러그인이 없으면 undefined를 반환한다.
 */
export function getTscProgram(): ts.Program | undefined {
  return tscPlugin?.getProgram();
}

/**
 * tsc 플러그인의 affected files를 반환한다.
 * 플러그인이 없으면 undefined를 반환한다.
 */
export function getTscAffectedFiles(): ReadonlySet<string> | undefined {
  return tscPlugin?.getAffectedFiles();
}

/**
 * tsc 플러그인의 diagnostics를 반환한다.
 * 플러그인이 없으면 빈 배열을 반환한다.
 */
export function getTscDiagnostics(): SerializedDiagnostic[] {
  return tscPlugin?.getDiagnostics() ?? [];
}

/**
 * tsc 플러그인의 lint 결과를 반환한다.
 * 플러그인이 없거나 lint가 비활성이면 undefined를 반환한다.
 */
export function getTscLintResult(): LintWithProgramResult | undefined {
  return tscPlugin?.getLintResult();
}
