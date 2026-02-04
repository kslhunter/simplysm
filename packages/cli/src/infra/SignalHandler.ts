/**
 * 프로세스 종료 시그널을 처리하는 클래스
 *
 * SIGINT (Ctrl+C) 및 SIGTERM 시그널을 감지하고,
 * 종료 시점까지 대기하는 Promise를 제공한다.
 */
export class SignalHandler {
  private _terminateResolver: (() => void) | null = null;
  private readonly _terminatePromise: Promise<void>;
  private _terminated = false;

  constructor() {
    this._terminatePromise = new Promise((resolve) => {
      this._terminateResolver = resolve;
    });

    const handler = () => {
      process.off("SIGINT", handler);
      process.off("SIGTERM", handler);
      this._terminated = true;
      this._terminateResolver?.();
    };

    process.on("SIGINT", handler);
    process.on("SIGTERM", handler);
  }

  /**
   * 종료 시그널이 수신될 때까지 대기
   */
  waitForTermination(): Promise<void> {
    return this._terminatePromise;
  }

  /**
   * 종료 여부 확인
   */
  isTerminated(): boolean {
    return this._terminated;
  }

  /**
   * 프로그래밍 방식으로 종료 요청
   * (테스트 또는 외부에서 종료 트리거 시 사용)
   */
  requestTermination(): void {
    if (!this._terminated) {
      this._terminated = true;
      this._terminateResolver?.();
    }
  }
}
