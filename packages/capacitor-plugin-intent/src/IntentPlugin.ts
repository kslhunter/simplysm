import type { PluginListenerHandle } from "@capacitor/core";

export interface IntentResult {
  /** 브로드캐스트 액션 */
  action?: string;
  /** 추가 데이터 */
  extras?: Record<string, unknown>;
}

export interface StartActivityForResultOptions {
  action?: string;
  uri?: string;
  extras?: Record<string, unknown>;
  /** MIME type */
  type?: string;
  /** 특정 앱 지정 */
  packageName?: string;
  /** 특정 Activity 지정 */
  className?: string;
  /** Intent flags */
  flags?: number;
}

export interface StartActivityForResultResult {
  resultCode: number;
  data?: {
    action?: string;
    uri?: string;
    extras?: Record<string, unknown>;
  };
}

export interface IntentPlugin {
  /**
   * 브로드캐스트 수신기 등록
   */
  subscribe(
    options: { filters: string[] },
    callback: (result: IntentResult) => void,
  ): Promise<{ id: string }>;

  /**
   * 특정 브로드캐스트 수신기 구독 해제
   */
  unsubscribe(options: { id: string }): Promise<void>;

  /**
   * 모든 브로드캐스트 수신기 구독 해제
   */
  unsubscribeAll(): Promise<void>;

  /**
   * 브로드캐스트 전송
   */
  send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>;

  /**
   * 실행 인텐트 조회
   */
  getLaunchIntent(): Promise<IntentResult>;

  /**
   * 앱 실행 중 수신되는 새 인텐트에 대한 리스너 등록
   */
  addListener(
    eventName: "newIntent",
    listenerFunc: (data: IntentResult) => void,
  ): Promise<PluginListenerHandle>;

  /**
   * 모든 이벤트 리스너 제거
   */
  removeAllListeners(): Promise<void>;

  /**
   * startActivityForResult로 외부 Activity를 실행하고 결과를 수신한다
   */
  startActivityForResult(
    options: StartActivityForResultOptions,
  ): Promise<StartActivityForResultResult>;
}
