import type { SdBuildPackageConfig, SdClientPackageConfig, SdPackageConfig, SdServerPackageConfig } from "../sd-config.types";
import type { SerializedDiagnostic } from "../utils/typecheck-serialization";
import type { TypecheckEnv } from "../utils/tsconfig";
import type { LintWithProgramResult } from "../utils/lint-with-program";

/**
 * Package information
 */
export interface PackageInfo {
  name: string;
  dir: string;
  config: SdPackageConfig;
}

/**
 * PackageInfo narrowed for build packages (node/browser/neutral)
 */
export type BuildPackageInfo = PackageInfo & { config: SdBuildPackageConfig };

/**
 * PackageInfo narrowed for server packages
 */
export type ServerPackageInfo = PackageInfo & { config: SdServerPackageConfig };

/**
 * PackageInfo narrowed for client packages
 */
export type ClientPackageInfo = PackageInfo & { config: SdClientPackageConfig };

/**
 * Build output control flags
 */
export interface BuildOutput {
  js: boolean;
  dts: boolean;
  /** When true, run ESLint using the ts.Program created during typecheck. */
  lint?: boolean;
  /** Typecheck environment. When set, adjusts compilerOptions via getCompilerOptionsForEnv(). */
  env?: TypecheckEnv;
}

/**
 * BuildEngine.run() return value
 */
export interface EngineResult {
  success: boolean;
  js: {
    success: boolean;
    errors: string[];
    warnings: string[];
  };
  dts: {
    success: boolean;
    errors: string[];
    warnings: string[];
    diagnostics: SerializedDiagnostic[];
  };
  /** Lint result (present when BuildOutput.lint is true) */
  lint?: LintWithProgramResult;
}

/**
 * Build engine interface
 *
 * Common contract for all build engines.
 * typecheck (diagnostics) is always included — not optional.
 */
export interface BuildEngine {
  /**
   * One-time build (for production builds)
   * Creates workers, runs build, returns combined result.
   * Call stop() after to clean up resources.
   */
  run(output: BuildOutput): Promise<EngineResult>;

  /**
   * Start watch mode
   * Promise resolves when initial build is complete.
   * Subsequent rebuilds are reported via injected ResultCollector.
   */
  startWatch(output: BuildOutput): Promise<void>;

  /**
   * Stop engine and clean up resources (workers, esbuild contexts)
   */
  stop(): Promise<void>;
}
