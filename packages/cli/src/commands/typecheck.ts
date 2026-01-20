import ts from "typescript";
import path from "path";
import { createJiti } from "jiti";
import { FsUtils, PathUtils } from "@simplysm/core-node";
import { SdError } from "@simplysm/core-common";
import type { SdConfig, Target } from "../sd-config.types";
import { createCliContext } from "../utils/cli-context";

//#region Types

/**
 * TypeScript 타입체크 옵션
 */
export interface TypecheckOptions {
  /** 타입체크할 경로 필터 (예: `packages/core-common`). 빈 배열이면 tsconfig.json에 정의된 모든 파일 대상 */
  targets: string[];
  /** debug 로그 출력 */
  debug: boolean;
}

// 패키지 정보 (packages/* 하위 파일 분류용)
interface PackageInfo {
  name: string;
  dir: string;
  target: Target;
}

// 테스트 정보 (tests/* 하위 파일 분류용)
interface TestInfo {
  name: string;
  dir: string;
}

// 파일 분류 결과
interface ClassifiedFiles {
  byPackage: Map<string, { info: PackageInfo; files: string[] }>; // packages/*
  byTests: Map<string, { info: TestInfo; files: string[] }>; // tests/*
  root: string[]; // 루트 파일 - 원본 tsconfig 설정 그대로
}

//#endregion

//#region Utilities

/**
 * 패키지의 package.json에서 @types/* devDependencies를 읽어 types 목록을 반환합니다.
 * @param packageDir - 패키지 디렉토리 경로
 * @internal 테스트용으로 export
 */
export async function getTypesFromPackageJson(packageDir: string): Promise<string[]> {
  const packageJsonPath = path.join(packageDir, "package.json");
  if (!FsUtils.exists(packageJsonPath)) {
    return [];
  }

  const packageJson = await FsUtils.readJsonAsync<{ devDependencies?: Record<string, string> }>(
    packageJsonPath,
  );
  const devDeps = packageJson.devDependencies ?? {};

  return Object.keys(devDeps)
    .filter((dep) => dep.startsWith("@types/"))
    .map((dep) => dep.replace("@types/", ""));
}

/**
 * 타겟과 패키지 정보를 기반으로 컴파일러 옵션을 생성합니다.
 * - lib: tsconfig.json 기반으로 타겟에 맞게 조정
 * - types: 패키지의 devDependencies @types/* 기반으로 구성
 * @internal 테스트용으로 export
 */
export async function getCompilerOptionsForPackage(
  baseOptions: ts.CompilerOptions,
  target: Target,
  packageDir: string,
): Promise<ts.CompilerOptions> {
  const options = { ...baseOptions, noEmit: true };

  // DOM 관련 lib 패턴 - 브라우저 API를 포함하는 lib들
  // (dom: Window/Document 등, webworker: DedicatedWorkerGlobalScope 등)
  const domLibPatterns = ["dom", "webworker"];

  // 패키지의 @types/* devDeps에서 types 목록 구성
  const packageTypes = await getTypesFromPackageJson(packageDir);

  switch (target) {
    case "node":
      // libs에서 DOM 관련 제거, types에 node 포함
      options.lib = options.lib?.filter(
        (lib) => !domLibPatterns.some((pattern) => lib.toLowerCase().includes(pattern)),
      );
      options.types = [...new Set([...packageTypes, "node"])];
      break;
    case "browser":
      // libs 그대로, types에서 node 제거
      options.types = packageTypes.filter((t) => t !== "node");
      break;
    case "neutral":
      // libs에서 DOM 관련 제거, types에서 node 제거
      options.lib = options.lib?.filter(
        (lib) => !domLibPatterns.some((pattern) => lib.toLowerCase().includes(pattern)),
      );
      options.types = packageTypes.filter((t) => t !== "node");
      break;
  }

  return options;
}

/**
 * 파일을 패키지/테스트/루트로 분류합니다.
 * @internal 테스트용으로 export
 */
export function classifyFiles(fileNames: string[], cwd: string, config: SdConfig): ClassifiedFiles {
  const result: ClassifiedFiles = {
    byPackage: new Map(),
    byTests: new Map(),
    root: [],
  };

  for (const fileName of fileNames) {
    const relativePath = PathUtils.posix(path.relative(cwd, fileName));

    // packages/{pkg}/...
    const packageMatch = relativePath.match(/^packages\/([^/]+)\//);
    if (packageMatch) {
      const pkgName = packageMatch[1];
      const info: PackageInfo = {
        name: pkgName,
        dir: path.resolve(cwd, "packages", pkgName),
        target: config.packages[pkgName]?.target ?? "neutral",
      };
      result.byPackage.getOrCreate(pkgName, { info, files: [] }).files.push(fileName);
      continue;
    }

    // tests/{name}/...
    const testsMatch = relativePath.match(/^tests\/([^/]+)\//);
    if (testsMatch) {
      const testName = testsMatch[1];
      const info: TestInfo = {
        name: testName,
        dir: path.resolve(cwd, "tests", testName),
      };
      result.byTests.getOrCreate(testName, { info, files: [] }).files.push(fileName);
      continue;
    }

    // 루트 파일
    result.root.push(fileName);
  }

  return result;
}

//#endregion

//#region Main

/**
 * TypeScript 타입체크를 실행합니다.
 *
 * - `tsconfig.json`을 로드하여 컴파일러 옵션 적용
 * - `sd.config.ts`를 로드하여 패키지별 타겟 정보 확인 (없으면 기본값 사용)
 * - 타겟별로 다른 lib/types 설정으로 타입체크 수행
 * - incremental 컴파일 사용 (`.cache/typecheck.tsbuildinfo`)
 * - 에러 발생 시 `process.exitCode = 1` 설정
 *
 * @param options - 타입체크 실행 옵션
 * @returns 완료 시 resolve. 에러 발견 시 `process.exitCode`를 1로 설정하고 resolve (throw하지 않음)
 */
export async function runTypecheck(options: TypecheckOptions): Promise<void> {
  const { targets, debug } = options;
  const cwd = process.cwd();

  // 로거/스피너 설정
  const { logger, spinner } = createCliContext("sd-cli:typecheck", debug, "타입체크 준비 중...");

  try {
    logger.debug({ targets }, "타입체크 시작");

    const formatHost: ts.FormatDiagnosticsHost = {
      getCanonicalFileName: (f) => f,
      getCurrentDirectory: () => cwd,
      getNewLine: () => ts.sys.newLine,
    };

    // tsconfig.json 로드
    if (spinner) spinner.text = "tsconfig.json 로드 중...";
    const configPath = path.resolve(cwd, "tsconfig.json");
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

    if (configFile.error) {
      spinner?.fail("tsconfig.json 로드 실패");
      logger.error({ err: configFile.error }, "tsconfig.json 로드 실패");
      const message = ts.formatDiagnosticsWithColorAndContext([configFile.error], formatHost);
      process.stderr.write(message);
      process.exitCode = 1;
      return;
    }

    // tsconfig 파싱
    if (spinner) spinner.text = "tsconfig.json 파싱 중...";
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      cwd,
      undefined,
      configPath,
    );

    if (parsedConfig.errors.length > 0) {
      spinner?.fail("tsconfig.json 파싱 실패");
      logger.error({ errorCount: parsedConfig.errors.length }, "tsconfig.json 파싱 실패");
      const message = ts.formatDiagnosticsWithColorAndContext(parsedConfig.errors, formatHost);
      process.stderr.write(message);
      process.exitCode = 1;
      return;
    }

    // sd.config.ts 로드
    if (spinner) spinner.text = "sd.config.ts 로드 중...";
    const sdConfigPath = path.resolve(cwd, "sd.config.ts");
    let sdConfig: SdConfig;
    try {
      // jiti: TypeScript 설정 파일(.ts)을 런타임에 import하기 위해 사용
      const jiti = createJiti(import.meta.url);
      const sdConfigModule = await jiti.import(sdConfigPath);

      let configFn: unknown;
      if (
        sdConfigModule != null &&
        typeof sdConfigModule === "object" &&
        "default" in sdConfigModule
      ) {
        configFn = sdConfigModule.default;
      } else {
        throw new SdError("sd.config.ts에 default export가 없습니다.");
      }

      if (typeof configFn !== "function") {
        throw new SdError("sd.config.ts의 default export는 함수여야 합니다.");
      }
      sdConfig = configFn() as SdConfig;
      logger.debug("sd.config.ts 로드 완료");
    } catch (err) {
      // sd.config.ts가 없거나 로드 실패 시 기본값 사용
      sdConfig = { packages: {} };
      logger.debug({ err }, "sd.config.ts 로드 실패, 기본값 사용");
    }

    // targets가 지정되면 fileNames 필터링
    if (spinner) spinner.text = "파일 목록 수집 중...";
    let fileNames = parsedConfig.fileNames;
    if (targets.length > 0) {
      fileNames = fileNames.filter((fileName) => {
        const relativePath = PathUtils.posix(path.relative(cwd, fileName));
        return targets.some(
          (target) => relativePath === target || PathUtils.isChildPath(relativePath, target),
        );
      });
    }

    if (fileNames.length === 0) {
      spinner?.succeed("타입체크할 파일이 없습니다.");
      logger.info("타입체크할 파일 없음");
      return;
    }

    // 파일 분류
    if (spinner) spinner.text = "파일 분류 중...";
    const classified = classifyFiles(fileNames, cwd, sdConfig);
    logger.debug(
      {
        packageCount: classified.byPackage.size,
        testCount: classified.byTests.size,
        rootCount: classified.root.length,
      },
      "파일 분류 완료",
    );

    let hasErrors = false;
    const allDiagnostics: ts.Diagnostic[] = [];

    // packages/* - 타겟별 lib/types 적용
    for (const { info, files } of classified.byPackage.values()) {
      if (spinner) spinner.text = `패키지 타입체크: ${info.name}`;
      logger.debug(
        { package: info.name, fileCount: files.length, target: info.target },
        "패키지 타입체크",
      );

      const packageOptions = await getCompilerOptionsForPackage(
        parsedConfig.options,
        info.target,
        info.dir,
      );
      const buildInfoPath = path.join(info.dir, ".cache", "typecheck.tsbuildinfo");
      const program = ts.createIncrementalProgram({
        rootNames: files,
        options: {
          ...packageOptions,
          incremental: true,
          tsBuildInfoFile: buildInfoPath,
        },
      });

      const diagnostics = ts.getPreEmitDiagnostics(program.getProgram());
      allDiagnostics.push(...diagnostics);
      program.emit();

      if (diagnostics.some((d) => d.category === ts.DiagnosticCategory.Error)) {
        hasErrors = true;
      }
    }

    // tests/* - lib 그대로, types만 해당 테스트의 devDeps 기반
    for (const { info, files } of classified.byTests.values()) {
      if (spinner) spinner.text = `테스트 타입체크: ${info.name}`;
      logger.debug({ test: info.name, fileCount: files.length }, "테스트 타입체크");

      const testTypes = await getTypesFromPackageJson(info.dir);
      const buildInfoPath = path.join(info.dir, ".cache", "typecheck.tsbuildinfo");
      const testOptions: ts.CompilerOptions = {
        ...parsedConfig.options,
        noEmit: true,
        types: [...new Set([...testTypes, "node"])],
        incremental: true,
        tsBuildInfoFile: buildInfoPath,
      };
      const program = ts.createIncrementalProgram({
        rootNames: files,
        options: testOptions,
      });

      const diagnostics = ts.getPreEmitDiagnostics(program.getProgram());
      allDiagnostics.push(...diagnostics);
      program.emit();

      if (diagnostics.some((d) => d.category === ts.DiagnosticCategory.Error)) {
        hasErrors = true;
      }
    }

    // 루트 파일들 (sd.config.ts 등) - 원본 tsconfig 설정 그대로
    if (classified.root.length > 0) {
      if (spinner) spinner.text = "루트 파일 타입체크...";
      logger.debug({ fileCount: classified.root.length }, "루트 파일 타입체크");

      const buildInfoPath = path.join(cwd, ".cache", "typecheck.tsbuildinfo");
      const program = ts.createIncrementalProgram({
        rootNames: classified.root,
        options: {
          ...parsedConfig.options,
          noEmit: true,
          incremental: true,
          tsBuildInfoFile: buildInfoPath,
        },
      });

      const diagnostics = ts.getPreEmitDiagnostics(program.getProgram());
      allDiagnostics.push(...diagnostics);
      program.emit();

      if (diagnostics.some((d) => d.category === ts.DiagnosticCategory.Error)) {
        hasErrors = true;
      }
    }

    // 결과 출력
    const errorCount = allDiagnostics.filter(
      (d) => d.category === ts.DiagnosticCategory.Error,
    ).length;
    const warningCount = allDiagnostics.filter(
      (d) => d.category === ts.DiagnosticCategory.Warning,
    ).length;

    if (hasErrors) {
      spinner?.fail(`타입체크 에러 발견 (${errorCount}개 에러, ${warningCount}개 경고)`);
      logger.error({ errorCount, warningCount }, "타입체크 에러 발생");
    } else if (warningCount > 0) {
      spinner?.warn(`타입체크 완료 (${warningCount}개 경고)`);
      logger.info({ errorCount, warningCount }, "타입체크 완료 (경고 있음)");
    } else {
      spinner?.succeed("타입체크 완료");
      logger.info({ errorCount, warningCount }, "타입체크 완료");
    }

    if (allDiagnostics.length > 0) {
      const uniqueDiagnostics = ts.sortAndDeduplicateDiagnostics(allDiagnostics);
      const message = ts.formatDiagnosticsWithColorAndContext(uniqueDiagnostics, formatHost);
      process.stdout.write(message);
    }

    if (hasErrors) {
      process.exitCode = 1;
    }
  } finally {
    spinner?.stop();
  }
}

//#endregion
