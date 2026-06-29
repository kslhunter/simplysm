import type esbuild from "esbuild";
import type ts from "typescript";
import { createLogger, err as errNs } from "@simplysm/core-common";
import { SdTsCompiler } from "../ts-compiler/SdTsCompiler";
import type { ISdTsCompilerResult } from "../ts-compiler/sd-ts-compiler-result";
import type { SerializedDiagnostic } from "../typecheck/typecheck-serialization";
import type { LintWithProgramResult } from "../lint/lint-with-program";
import type { TypecheckEnv } from "../utils/tsconfig";

const logger = createLogger("sd:cli:esbuild-tsc-plugin");

export interface TscPluginOptions {
  pkgDir: string;
  cwd: string;
  output: { dts: boolean };
  env?: TypecheckEnv;
  includeTests?: boolean;
  lint?: boolean;
}

export interface TscPluginResult {
  plugin: esbuild.Plugin;
  getProgram(): ts.Program | undefined;
  getAffectedFiles(): ReadonlySet<string> | undefined;
  getDiagnostics(): SerializedDiagnostic[];
  getErrors(): string[] | undefined;
  getLintResult(): LintWithProgramResult | undefined;
  resetBuilderProgram(): void;
}

export function createTscPlugin(options: TscPluginOptions): TscPluginResult {
  // 내부 상태
  let lastProgram: ts.Program | undefined;
  let lastAffectedFiles: ReadonlySet<string> | undefined;
  let lastDiagnostics: SerializedDiagnostic[] = [];
  let lastErrors: string[] | undefined;
  let lastLintResult: LintWithProgramResult | undefined;

  // SdTsCompiler 인스턴스 (lazy 생성, resetBuilderProgram 시 재생성)
  let compiler: SdTsCompiler | undefined;

  // onStart에서 생성한 compile Promise (onEnd에서 await)
  let compilePromise: Promise<ISdTsCompilerResult> | undefined;

  const plugin: esbuild.Plugin = {
    name: "sd-tsc",
    setup(build) {
      build.onStart(() => {
        // microtask로 tsc 스케줄링 (await하지 않음)
        compilePromise = Promise.resolve().then(() => {
          if (compiler == null) {
            compiler = new SdTsCompiler({
              pkgDir: options.pkgDir,
              cwd: options.cwd,
              output: { js: false, dts: options.output.dts },
              env: options.env,
              includeTests: options.includeTests,
              lint: options.lint,
            });
          }
          return compiler.compileAsync();
        });
      });

      build.onEnd(async () => {
        try {
          const result = await compilePromise!;
          lastProgram = result.program;
          lastAffectedFiles = result.affectedFiles;
          lastDiagnostics = result.diagnostics;
          lastErrors = result.errors;
          lastLintResult = result.lint;
        } catch (err) {
          logger.debug(`tsc plugin 예외 스택:\n${errNs.stack(err)}`);
          lastProgram = undefined;
          lastAffectedFiles = undefined;
          lastDiagnostics = [];
          lastErrors = [errNs.message(err)];
          lastLintResult = undefined;
        }
      });
    },
  };

  return {
    plugin,
    getProgram: () => lastProgram,
    getAffectedFiles: () => lastAffectedFiles,
    getDiagnostics: () => lastDiagnostics,
    getErrors: () => lastErrors,
    getLintResult: () => lastLintResult,
    resetBuilderProgram: () => {
      compiler = undefined;
    },
  };
}
