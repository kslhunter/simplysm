import type { SdPackageConfig } from "../sd-config.types";
import type { ResultCollector } from "../infra/ResultCollector";
import type { RebuildManager } from "../utils/listr-manager";

/**
 * 패키지 정보
 */
export interface PackageInfo {
  name: string;
  dir: string;
  config: SdPackageConfig;
}

/**
 * Builder 공통 옵션
 */
export interface BuilderOptions {
  cwd: string;
  packages: PackageInfo[];
  resultCollector: ResultCollector;
  rebuildManager?: RebuildManager;
}

/**
 * Builder 인터페이스
 *
 * 모든 Builder가 구현해야 하는 공통 인터페이스
 */
export interface IBuilder {
  /**
   * Builder 초기화 (Worker 생성, 이벤트 핸들러 등록)
   */
  initialize(): Promise<void>;

  /**
   * 일회성 빌드 (프로덕션 빌드용)
   */
  build(): Promise<void>;

  /**
   * Watch 모드 시작
   * Promise는 초기 빌드 완료 시 resolve됨
   */
  startWatch(): Promise<void>;

  /**
   * Builder 종료 (Worker 정리)
   */
  shutdown(): Promise<void>;

  /**
   * 초기 빌드 Promise 맵 반환 (Listr 태스크용)
   */
  getInitialBuildPromises(): Map<string, Promise<void>>;
}
