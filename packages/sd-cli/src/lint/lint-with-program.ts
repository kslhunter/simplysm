import path from "path";
import type ts from "typescript";
import { ESLint } from "eslint";
import { pathx } from "@simplysm/core-node";
import { consola } from "consola";

const logger = consola.withTag("sd:cli:lint-with-program");

/**
 * LintWithProgramRunner.lint()가 반환하는 lint 결과
 */
export interface LintWithProgramResult {
  success: boolean;
  errorCount: number;
  warningCount: number;
  formattedOutput: string;
}

/**
 * LintWithProgramRunner 생성자 옵션
 */
export interface LintWithProgramRunnerOptions {
  cwd: string;
  pkgName: string;
}

/**
 * LintWithProgramRunner.lint() 옵션
 */
export interface LintRunOptions {
  program: ts.Program;
  /** 제공 시 이 집합의 파일만 lint한다 (추출된 파일과의 교집합).
   *  watch 재빌드에서 affected 파일 기반 증분 lint에 사용한다. */
  affectedFiles?: ReadonlySet<string>;
}

/**
 * 기존 ts.Program을 사용하여 ESLint를 실행한다 (중복 Program 생성을 방지).
 *
 * - program.getSourceFiles()에서 pkgDir로 필터링하여 소스 파일을 추출한다
 * - .d.ts 파일과 node_modules 경로를 제외한다
 * - parserOptions.programs를 통해 ts.Program을 주입한다 (typescript-eslint)
 * - 호출 간 ESLint 인스턴스를 재사용한다 (watch 모드 최적화)
 */
export class LintWithProgramRunner {
  private readonly _cwd: string;
  private readonly _pkgName: string;
  private _eslint: ESLint | undefined;
  private _lastUseCache: boolean | undefined;
  private readonly _programsRef: ts.Program[] = [];

  constructor(options: LintWithProgramRunnerOptions) {
    this._cwd = options.cwd;
    this._pkgName = options.pkgName;
  }

  /**
   * ts.Program에서 lint 대상 파일을 추출한다.
   * 모든 워크스페이스 소스 파일(cwd 범위)을 포함하고 .d.ts, node_modules, Angular shim을 제외한다.
   */
  private _extractFiles(program: ts.Program): string[] {
    logger.debug(`[${this._pkgName}] 린트 대상 파일 추출 시작`);
    const normalizedCwd = pathx.posix(this._cwd);
    const files: string[] = [];

    for (const sf of program.getSourceFiles()) {
      const fileName = pathx.posix(sf.fileName);

      // 워크스페이스 루트 내에 있어야 함
      if (!fileName.startsWith(normalizedCwd + "/")) {
        continue;
      }

      // 선언 파일 제외
      if (sf.isDeclarationFile) {
        continue;
      }

      // node_modules 제외
      if (fileName.includes("/node_modules/")) {
        continue;
      }

      // Angular 타입체크 shim 파일 제외 (가상 파일, 디스크에 없음)
      if (fileName.endsWith(".ngtypecheck.ts")) {
        continue;
      }

      files.push(sf.fileName);
    }

    logger.debug(`[${this._pkgName}] 린트 대상 파일 추출 완료 (${files.length}개)`);
    return files;
  }

  /**
   * 주어진 ts.Program의 파일에 대해 ESLint를 실행한다.
   * affectedFiles가 제공되면 교집합만 lint한다 (watch 재빌드).
   * 첫 호출 시 ESLint 인스턴스를 생성하고, 이후 호출에서 재사용한다.
   */
  async lint(options: LintRunOptions): Promise<LintWithProgramResult> {
    const { program, affectedFiles } = options;

    // 대상 파일 추출 (워크스페이스 범위)
    let files = this._extractFiles(program);

    // affectedFiles가 제공되면 추출된 파일과 교집합
    if (affectedFiles != null) {
      files = files.filter((f) => affectedFiles.has(pathx.posix(f)));
    }

    if (files.length === 0) {
      return {
        success: true,
        errorCount: 0,
        warningCount: 0,
        formattedOutput: "",
      };
    }

    // programs 참조 업데이트 (가변 배열 — ESLint가 lintFiles 시 읽음)
    this._programsRef.length = 0;
    this._programsRef.push(program);

    // 캐시 정책: affected 파일 기반 증분 lint가 ESLint의
    // 파일 내용 기반 캐시(의존성 변경을 놓침)보다 정확하다.
    // affectedFiles가 제공되면 (watch 재빌드) 캐시를 비활성화한다.
    // 제공되지 않으면 (일회성 빌드) 성능을 위해 캐시를 활성화한다.
    const useCache = affectedFiles == null;

    // 캐시 정책이 변경되거나 첫 호출 시 새 ESLint 인스턴스 생성
    if (this._eslint == null || this._lastUseCache !== useCache) {
      logger.debug(`[${this._pkgName}] ESLint 인스턴스 생성 (cache: ${String(useCache)})`);
      // ESLint Flat Config는 languageOptionsToJSON()을 통해 languageOptions를 직렬화하는데,
      // parserOptions를 재귀 탐색하면서 ts.Program 메서드에서 예외가 발생한다.
      // parserOptions에 toJSON()을 추가하여 직렬화 가능한 표현을 반환하면서
      // typescript-eslint가 실제 programs 배열에 접근할 수 있도록 한다.
      const parserOptions = {
        programs: this._programsRef,
        project: null,
        projectService: false,
        toJSON() {
          return { programs: "[ts.Program]", project: null, projectService: false };
        },
      };

      this._eslint = new ESLint({
        cwd: this._cwd,
        cache: useCache,
        cacheLocation: path.join(this._cwd, ".cache", `eslint-${this._pkgName.replace(/\//g, "-")}.cache`),
        overrideConfig: {
          languageOptions: {
            parserOptions,
          },
        },
      });
      this._lastUseCache = useCache;
    }

    // lint 실행
    logger.debug(`[${this._pkgName}] 린트 시작 (${files.length}개 파일, affected: ${affectedFiles != null})`);
    const results = await this._eslint.lintFiles(files);

    // 결과 집계
    let errorCount = 0;
    let warningCount = 0;
    for (const r of results) {
      errorCount += r.errorCount;
      warningCount += r.warningCount;
    }

    // 출력 포맷팅
    const formatter = await this._eslint.loadFormatter("stylish");
    const formattedOutput = await formatter.format(results);

    logger.debug(`[${this._pkgName}] 린트 완료 (에러: ${errorCount}, 경고: ${warningCount})`);

    return {
      success: errorCount === 0,
      errorCount,
      warningCount,
      formattedOutput,
    };
  }
}
