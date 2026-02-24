import { consola } from "consola";
import { WorkerManager } from "../infra/WorkerManager";
import type { BuildResult, ResultCollector } from "../infra/ResultCollector";
import type { RebuildManager } from "../utils/rebuild-manager";
import type { BuildEventData, ErrorEventData } from "../utils/worker-events";
import { formatBuildMessages } from "../utils/output-utils";
import type { IBuilder, PackageInfo } from "./types";

const baseBuilderLogger = consola.withTag("sd:cli:build");

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
   * 공통 Worker 이벤트 핸들러 등록 (buildStart, build, error)
   *
   * LibraryBuilder와 DtsBuilder에서 동일한 패턴의 이벤트 핸들러를
   * 중복 없이 등록할 수 있도록 공통 로직을 제공한다.
   *
   * @param workerKey Worker 식별자 (예: "core-common:build")
   * @param resultType BuildResult의 type 필드 값
   * @param listrTitle 리빌드 시 표시할 제목
   */
  protected registerEventHandlersForWorker(
    pkg: PackageInfo,
    workerKey: string,
    resultType: BuildResult["type"],
    listrTitle: string,
  ): void {
    const worker = this.workerManager.get(workerKey)!;

    // 초기 빌드 여부 추적
    let isInitialBuild = true;

    // 빌드 시작 (리빌드 시)
    worker.on("buildStart", () => {
      if (!isInitialBuild && this.rebuildManager != null) {
        const resolver = this.rebuildManager.registerBuild(workerKey, listrTitle);
        this.buildResolvers.set(workerKey, resolver);
      }
    });

    // 빌드 완료
    worker.on("build", (data) => {
      const event = data as BuildEventData;

      // warnings 출력
      if (event.warnings != null && event.warnings.length > 0) {
        baseBuilderLogger.warn(formatBuildMessages(pkg.name, pkg.config.target, event.warnings));
      }

      const result: BuildResult = {
        name: pkg.name,
        target: pkg.config.target,
        type: resultType,
        status: event.success ? "success" : "error",
        message: event.errors?.join("\n"),
      };
      this.resultCollector.add(result);

      if (isInitialBuild) {
        isInitialBuild = false;
      }
      this.completeBuild(pkg);
    });

    // 에러
    worker.on("error", (data) => {
      const event = data as ErrorEventData;
      const result: BuildResult = {
        name: pkg.name,
        target: pkg.config.target,
        type: resultType,
        status: "error",
        message: event.message,
      };
      this.resultCollector.add(result);

      if (isInitialBuild) {
        isInitialBuild = false;
      }
      this.completeBuild(pkg);
    });
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
