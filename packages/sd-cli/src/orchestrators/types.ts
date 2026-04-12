/**
 * Orchestrator 공통 생명주기 인터페이스
 *
 * 모든 Orchestrator(Build, Watch, Dev, Typecheck)가 따르는 계약.
 * initialize() → start() → shutdown() 순서로 호출한다.
 *
 * @typeParam TStartResult start()의 반환 타입. 기본값 void.
 */
export interface OrchestratorLifecycle<TStartResult = void> {
  /** 초기화: config 로드, 패키지 분류, 엔진 생성 등 */
  initialize(): Promise<void>;

  /** 실행: 빌드/타입체크/watch 시작 */
  start(): Promise<TStartResult>;

  /** 종료: 리소스 정리 */
  shutdown(): Promise<void>;
}
