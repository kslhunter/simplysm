import path from "path";
import esbuild from "esbuild";
import { createWorker } from "@simplysm/core-node";
import type { SdBuildPackageConfig } from "../sd-config.types";
import {
  parseRootTsconfig,
  getPackageSourceFiles,
  getCompilerOptionsForPackage,
  type TypecheckEnv,
} from "../utils/tsconfig";

//#region Types

/**
 * 빌드 정보
 */
export interface BuildInfo {
  name: string;
  config: SdBuildPackageConfig;
  cwd: string;
  pkgDir: string;
}

/**
 * 빌드 결과
 */
export interface BuildResult {
  success: boolean;
  errors?: string[];
}

//#endregion

//#region Worker

/**
 * esbuild 일회성 JS 빌드
 */
async function build(info: BuildInfo): Promise<BuildResult> {
  try {
    // tsconfig 파싱
    const parsedConfig = parseRootTsconfig(info.cwd);
    const entryPoints = getPackageSourceFiles(info.pkgDir, parsedConfig);

    // 타겟별 compilerOptions 생성 (빌드용이므로 neutral은 browser로 처리)
    const env: TypecheckEnv = info.config.target === "node" ? "node" : "browser";
    const compilerOptions = await getCompilerOptionsForPackage(parsedConfig.options, env, info.pkgDir);

    // esbuild 일회성 빌드
    const result = await esbuild.build({
      entryPoints,
      outdir: path.join(info.pkgDir, "dist"),
      format: "esm",
      sourcemap: true,
      platform: info.config.target === "node" ? "node" : "browser",
      target: info.config.target === "node" ? "node20" : "chrome84",
      bundle: false,
      tsconfigRaw: { compilerOptions: compilerOptions as esbuild.TsconfigRaw["compilerOptions"] },
    });

    const errors = result.errors.map((e) => e.text);
    return {
      success: result.errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err) {
    return {
      success: false,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}

const sender = createWorker<{ build: typeof build }>({
  build,
});

export default sender;

//#endregion
