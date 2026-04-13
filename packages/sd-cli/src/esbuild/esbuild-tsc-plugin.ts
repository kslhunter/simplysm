import type esbuild from "esbuild";
import type ts from "typescript";
import { err as errNs } from "@simplysm/core-common";
import { parseTsconfig, type TypecheckEnv } from "../utils/tsconfig";
import { runTscPackageBuild, type TscPackageBuildResult } from "../utils/tsc-build";
import type { SerializedDiagnostic } from "../typecheck/typecheck-serialization";

export interface TscPluginOptions {
  pkgDir: string;
  cwd: string;
  output: { dts: boolean };
  env?: TypecheckEnv;
  includeTests?: boolean;
}

export interface TscPluginResult {
  plugin: esbuild.Plugin;
  getProgram(): ts.Program | undefined;
  getAffectedFiles(): ReadonlySet<string> | undefined;
  getDiagnostics(): SerializedDiagnostic[];
  getErrors(): string[] | undefined;
  resetBuilderProgram(): void;
}

export function createTscPlugin(options: TscPluginOptions): TscPluginResult {
  // 내부 상태
  let lastProgram: ts.Program | undefined;
  let lastAffectedFiles: ReadonlySet<string> | undefined;
  let lastDiagnostics: SerializedDiagnostic[] = [];
  let lastErrors: string[] | undefined;
  let lastBuilderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram | undefined;

  // onStart에서 생성한 tsc Promise (onEnd에서 await)
  let tscPromise: Promise<TscPackageBuildResult> | undefined;

  const plugin: esbuild.Plugin = {
    name: "sd-tsc",
    setup(build) {
      build.onStart(() => {
        // microtask로 tsc 스케줄링 (await하지 않음)
        tscPromise = Promise.resolve().then(() => {
          const parsedConfig = parseTsconfig(options.pkgDir);
          return runTscPackageBuild({
            pkgDir: options.pkgDir,
            cwd: options.cwd,
            output: { js: false, dts: options.output.dts },
            parsedConfig,
            env: options.env,
            includeTests: options.includeTests,
            oldBuilderProgram: lastBuilderProgram,
          });
        });
      });

      build.onEnd(async () => {
        try {
          const tscResult = await tscPromise!;
          lastProgram = tscResult.program;
          lastAffectedFiles = tscResult.affectedFiles;
          lastDiagnostics = tscResult.diagnostics;
          lastErrors = tscResult.errors;
          lastBuilderProgram = tscResult.builderProgram;
        } catch (err) {
          lastProgram = undefined;
          lastAffectedFiles = undefined;
          lastDiagnostics = [];
          lastErrors = [errNs.message(err)];
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
    resetBuilderProgram: () => {
      lastBuilderProgram = undefined;
    },
  };
}
