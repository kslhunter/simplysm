export interface IBroadcastResult {
  /** Broadcast action */
  action?: string;
  /** Extra data */
  extras?: Record<string, unknown>;
}

export interface IBroadcastPlugin {
  /**
   * Broadcast 수신기 등록
   */
  subscribe(
    options: { filters: string[] },
    callback: (result: IBroadcastResult) => void,
  ): Promise<{ id: string }>;

  /**
   * 특정 Broadcast 수신기 해제
   */
  unsubscribe(options: { id: string }): Promise<void>;

  /**
   * 모든 Broadcast 수신기 해제
   */
  unsubscribeAll(): Promise<void>;

  /**
   * Broadcast 전송
   */
  send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>;

  /**
   * 앱 시작 Intent 가져오기
   */
  getLaunchIntent(): Promise<IBroadcastResult>;
}
