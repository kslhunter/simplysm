import type { SdBuildPackageConfig, SdClientPackageConfig, SdPackageConfig, SdServerPackageConfig } from "../sd-config.types";
import type { SerializedDiagnostic } from "../utils/typecheck-serialization";
import type { TypecheckEnv } from "../utils/tsconfig";
import type { LintWithProgramResult } from "../utils/lint-with-program";

/**
 * 패키지 정보
 */
export interface PackageInfo {
  name: string;
  dir: string;
  config: SdPackageConfig;
}

/**
 * 빌드 패키지(node/browser/neutral)로 좁혀진 PackageInfo
 */
export type BuildPackageInfo = PackageInfo & { config: SdBuildPackageConfig };

/**
 * 서버 패키지로 좁혀진 PackageInfo
 */
export type ServerPackageInfo = PackageInfo & { config: SdServerPackageConfig };

/**
 * 클라이언트 패키지로 좁혀진 PackageInfo
 */
export type ClientPackageInfo = PackageInfo & { config: SdClientPackageConfig };

/**
 * 빌드 출력 제어 플래그
 */
export interface BuildOutput {
  js: boolean;
  dts: boolean;
  /** true일 때, 타입체크 중 생성된 ts.Program으로 ESLint를 실행한다. */
  lint?: boolean;
  /** 타입체크 환경. 설정 시 getCompilerOptionsForEnv()를 통해 compilerOptions를 조정한다. */
  env?: TypecheckEnv;
  /** 타입체크 범위에 tests/ 파일을 포함한다. check 커맨드에서만 사용된다. */
  includeTests?: boolean;
}

/**
 * BuildEngine.run() 반환값
 */
export interface EngineResult {
  success: boolean;
  build: {
    success: boolean;
    errors: string[];
    warnings: string[];
    diagnostics: SerializedDiagnostic[];
  };
  /** 린트 결과 (BuildOutput.lint가 true일 때 존재) */
  lint?: LintWithProgramResult;
}

/**
 * 빌드 엔진 인터페이스
 *
 * 모든 빌드 엔진의 공통 계약.
 * 타입체크(diagnostics)는 항상 포함되며 선택사항이 아니다.
 */
export interface BuildEngine {
  /**
   * 일회성 빌드 (프로덕션)
   * Worker를 생성하고, 빌드를 실행하고, 결합된 결과를 반환한다.
   * 호출 후 stop()으로 리소스를 정리한다.
   */
  run(output: BuildOutput): Promise<EngineResult>;

  /**
   * 워치 모드 시작
   * 초기 빌드가 완료되면 Promise가 resolve된다.
   * 이후 리빌드는 주입된 ResultCollector를 통해 보고된다.
   */
  startWatch(output: BuildOutput): Promise<void>;

  /**
   * 엔진을 중지하고 리소스(Worker, esbuild context 등)를 정리한다
   */
  stop(): Promise<void>;
}
