import path from "path";
import ts from "typescript";
import { err as errNs } from "@simplysm/core-common";
import { consola } from "consola";

const logger = consola.withTag("sd:cli:tsc-build");
import { pathx } from "@simplysm/core-node";
import {
  parseTsconfig,
  getPackageSourceFiles,
  getPackageFiles,
  getCompilerOptionsForEnv,
  type TypecheckEnv,
} from "./tsconfig";
import { serializeDiagnostic, type SerializedDiagnostic } from "./typecheck-serialization";
import { createOutputPathRewriter, addJsExtensionToImports } from "./output-path-rewriter";
import { isWorkspaceDiagnostic, formatDiagnosticError } from "./diagnostic-utils";

/**
 * 패키지 모드 tsc 빌드 옵션
 */
export interface TscPackageBuildOptions {
  pkgDir: string;
  cwd: string;
  /** 출력 제어 플래그: emit할 파일 종류 */
  output: { js: boolean; dts: boolean };
  /** 미리 파싱된 tsconfig. 제공 시 parseTsconfig() 호출을 스킵한다. */
  parsedConfig?: ts.ParsedCommandLine;
  /** 타입체크 환경. 설정 시 getCompilerOptionsForEnv()로 compilerOptions를 조정한다. */
  env?: TypecheckEnv;
  /** 타입체크 전용 모드에서 tests/ 파일 포함 여부. 기본값 false. */
  includeTests?: boolean;
}

/**
 * 패키지 모드 tsc 빌드 결과
 */
export interface TscPackageBuildResult {
  success: boolean;
  errors?: string[];
  diagnostics: SerializedDiagnostic[];
  errorCount: number;
  warningCount: number;
  /** lint-with-program 통합을 위해 노출된 ts.Program */
  program?: ts.Program;
  /** 이 빌드에서 영향받은 파일 (정규화된 순방향 슬래시 경로).
   *  watch 모드에서 증분 lint에 사용한다. */
  affectedFiles?: ReadonlySet<string>;
}

/**
 * 패키지에 대해 TypeScript 증분 빌드를 실행한다.
 *
 * - output.js || output.dts: emit 모드 (src 파일만, 출력 파일 생성)
 * - 둘 다 아님: 타입체크만 (기본 src 파일만, includeTests=true이면 src + test 파일)
 *
 * 실행 간 증분 컴파일을 위해 tsBuildInfoFile을 사용한다.
 */
export function runTscPackageBuild(options: TscPackageBuildOptions): TscPackageBuildResult {
  try {
    const { pkgDir, output, env } = options;
    const needsEmit = output.js || output.dts;
    const pkgName = path.basename(pkgDir);
    logger.debug(`[${pkgName}] tsc 빌드 시작 (env: ${env ?? "none"}, js: ${output.js}, dts: ${output.dts})`);

    const parsedConfig = options.parsedConfig ?? parseTsconfig(pkgDir);
    const baseOptions =
      env != null
        ? getCompilerOptionsForEnv(parsedConfig.options, env, pkgDir)
        : parsedConfig.options;

    let rootFiles: string[];

    if (needsEmit || !options.includeTests) {
      rootFiles = getPackageSourceFiles(pkgDir, parsedConfig);
    } else {
      rootFiles = getPackageFiles(pkgDir, parsedConfig);
    }
    logger.debug(`[${pkgName}] rootFiles: ${rootFiles.length}개`);

    const envSuffix = env != null ? `-${env}` : "";
    const tsBuildInfoFile = path.join(
      pkgDir,
      ".cache",
      needsEmit
        ? `build${output.dts ? "" : "-no-dts"}${envSuffix}.tsbuildinfo`
        : `typecheck${envSuffix}.tsbuildinfo`,
    );

    const compilerOptions: ts.CompilerOptions = {
      ...baseOptions,
      sourceMap: output.js,
      incremental: true,
      tsBuildInfoFile,
    };

    if (output.js && output.dts) {
      compilerOptions.noEmit = false;
      compilerOptions.emitDeclarationOnly = false;
      compilerOptions.declaration = true;
      compilerOptions.declarationMap = true;
      compilerOptions.outDir = path.join(pkgDir, "dist");
      compilerOptions.declarationDir = path.join(pkgDir, "dist");
    } else if (output.js) {
      compilerOptions.noEmit = false;
      compilerOptions.emitDeclarationOnly = false;
      compilerOptions.declaration = false;
      compilerOptions.declarationMap = false;
      compilerOptions.outDir = path.join(pkgDir, "dist");
    } else if (output.dts) {
      compilerOptions.noEmit = false;
      compilerOptions.emitDeclarationOnly = true;
      compilerOptions.declaration = true;
      compilerOptions.declarationMap = true;
      compilerOptions.outDir = path.join(pkgDir, "dist");
      compilerOptions.declarationDir = path.join(pkgDir, "dist");
    } else {
      compilerOptions.noEmit = true;
      compilerOptions.emitDeclarationOnly = false;
      compilerOptions.declaration = false;
      compilerOptions.declarationMap = false;
    }

    const host = ts.createIncrementalCompilerHost(compilerOptions);

    if (needsEmit) {
      const rewritePath = createOutputPathRewriter(pkgDir);
      const originalWriteFile = host.writeFile;
      host.writeFile = (fileName, content, writeByteOrderMark, onError, sourceFiles, data) => {
        const result = rewritePath(fileName, content);
        if (result != null) {
          let [newPath, newContent] = result;
          if (newPath.endsWith(".js")) {
            newContent = addJsExtensionToImports(newContent);
          }
          originalWriteFile(newPath, newContent, writeByteOrderMark, onError, sourceFiles, data);
        }
      };
    }

    const builderProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
      rootFiles,
      compilerOptions,
      host,
    );

    // builder program의 증분 분석을 통해 affected 파일을 추적한다.
    // getSemanticDiagnosticsOfNextAffectedFile은 마지막 빌드 이후 변경된 파일을 순회한다.
    // affected는 ts.SourceFile 또는 ts.Program(전역 스코프 변경 시)일 수 있다.
    let affectedFiles: Set<string> | undefined = new Set<string>();

    while (true) {
      const result = builderProgram.getSemanticDiagnosticsOfNextAffectedFile();
      if (result == null) break;
      if ("fileName" in result.affected) {
        affectedFiles?.add(pathx.posix(result.affected.fileName));
      } else {
        // ts.Program 반환 — 전역 변경, 전체 재빌드로 처리
        affectedFiles = undefined;
      }
    }
    logger.debug(`[${pkgName}] affected files: ${affectedFiles != null ? `${affectedFiles.size}개` : "전체 (global change)"}`);

    const emitResult = builderProgram.emit();

    const allDiagnostics = [
      ...builderProgram.getConfigFileParsingDiagnostics(),
      ...builderProgram.getSyntacticDiagnostics(),
      ...builderProgram.getOptionsDiagnostics(),
      ...builderProgram.getGlobalDiagnostics(),
      ...builderProgram.getSemanticDiagnostics(),
      ...(!output.dts ? builderProgram.getProgram().getDeclarationDiagnostics() : []),
      ...emitResult.diagnostics,
    ];

    // 워크스페이스 범위: node_modules 제외, 모든 워크스페이스 진단 유지
    const filteredDiagnostics = allDiagnostics.filter(
      (d) => isWorkspaceDiagnostic(d, options.cwd),
    );

    const serializedDiagnostics = filteredDiagnostics.map(serializeDiagnostic);
    const errorCount = filteredDiagnostics.filter(
      (d) => d.category === ts.DiagnosticCategory.Error,
    ).length;
    const warningCount = filteredDiagnostics.filter(
      (d) => d.category === ts.DiagnosticCategory.Warning,
    ).length;

    const errors = filteredDiagnostics
      .filter((d) => d.category === ts.DiagnosticCategory.Error)
      .map(formatDiagnosticError);

    logger.debug(`[${pkgName}] tsc 빌드 완료 (에러: ${errorCount}, 경고: ${warningCount})`);
    return {
      success: errorCount === 0,
      errors: errors.length > 0 ? errors : undefined,
      diagnostics: serializedDiagnostics,
      errorCount,
      warningCount,
      program: builderProgram.getProgram(),
      affectedFiles,
    };
  } catch (err) {
    const message = errNs.message(err);
    const stack = err instanceof Error ? err.stack : undefined;
    const pkgName = path.basename(options.pkgDir);
    logger.debug(`[${pkgName}] tsc 빌드 예외 발생: ${message}`);
    if (stack != null) {
      logger.debug(`[${pkgName}] 스택 트레이스:\n${stack}`);
    }
    return {
      success: false,
      errors: [message],
      diagnostics: [],
      errorCount: 1,
      warningCount: 0,
    };
  }
}
