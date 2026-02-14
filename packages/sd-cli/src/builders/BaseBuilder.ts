import { WorkerManager } from "../infra/WorkerManager";
import type { ResultCollector } from "../infra/ResultCollector";
import type { RebuildManager } from "../utils/rebuild-manager";
import type { IBuilder, PackageInfo } from "./types";

/**
 * Builder 추상 베이스 클래스
 *
 * 모든 Builder의 공통 로직을 제공하고,
 * 서브클래스에서 구현해야 할 추상 메서드를 정의한다.
 */
export abstract class BaseBuilder implements IBuilder {
  protected readonly workerManager: WorkerManager;
  protected readonly resultCollector: ResultCollector;
  protected readonly rebuildManager: RebuildManager | undefined;
  protected readonly packages: PackageInfo[];
  protected readonly cwd: string;
  protected isWatchMode = false;

  /** 초기 빌드 Promise (패키지별) */
  protected readonly initialBuildPromises = new Map<string, Promise<void>>();
  /** 초기 빌드 resolver (패키지별) */
  protected readonly buildResolvers = new Map<string, () => void>();

  constructor(options: {
    cwd: string;
    packages: PackageInfo[];
    resultCollector: ResultCollector;
    rebuildManager?: RebuildManager;
  }) {
    this.cwd = options.cwd;
    this.packages = options.packages;
    this.resultCollector = options.resultCollector;
    this.rebuildManager = options.rebuildManager;
    this.workerManager = new WorkerManager();
  }

  /**
   * Builder 초기화
   */
  initialize(): Promise<void> {
    // 초기 빌드 Promise 생성
    for (const pkg of this.packages) {
      const key = this.getPackageKey(pkg);
      this.initialBuildPromises.set(
        key,
        new Promise<void>((resolve) => {
          this.buildResolvers.set(key, resolve);
        }),
      );
    }

    // Worker 생성
    this.createWorkers();

    // 이벤트 핸들러 등록
    this.registerEventHandlers();

    return Promise.resolve();
  }

  /**
   * 일회성 빌드 (프로덕션)
   */
  async build(): Promise<void> {
    await Promise.all(this.packages.map((pkg) => this.buildPackage(pkg)));
  }

  /**
   * Watch 모드 시작
   */
  async startWatch(): Promise<void> {
    this.isWatchMode = true;

    // 모든 패키지의 watch 시작 (await 없이 - 백그라운드 실행)
    for (const pkg of this.packages) {
      this.startWatchPackage(pkg);
    }

    // 초기 빌드 완료까지 대기
    await Promise.all(this.initialBuildPromises.values());
  }

  /**
   * Builder 종료
   */
  async shutdown(): Promise<void> {
    await this.workerManager.terminateAll();
  }

  /**
   * 초기 빌드 Promise 맵 반환
   */
  getInitialBuildPromises(): Map<string, Promise<void>> {
    return this.initialBuildPromises;
  }

  /**
   * 패키지 키 생성 (결과 저장용)
   */
  protected getPackageKey(pkg: PackageInfo): string {
    return `${pkg.name}:${this.getBuilderType()}`;
  }

  /**
   * 빌드 완료 처리
   */
  protected completeBuild(pkg: PackageInfo): void {
    const key = this.getPackageKey(pkg);
    const resolver = this.buildResolvers.get(key);
    if (resolver != null) {
      resolver();
      this.buildResolvers.delete(key);
    }
  }

  /**
   * Builder 타입 (결과 키 생성용)
   */
  protected abstract getBuilderType(): string;

  /**
   * Worker 생성
   */
  protected abstract createWorkers(): void;

  /**
   * 이벤트 핸들러 등록
   */
  protected abstract registerEventHandlers(): void;

  /**
   * 단일 패키지 빌드 (프로덕션)
   */
  protected abstract buildPackage(pkg: PackageInfo): Promise<void>;

  /**
   * 단일 패키지 watch 시작
   */
  protected abstract startWatchPackage(pkg: PackageInfo): void;
}
