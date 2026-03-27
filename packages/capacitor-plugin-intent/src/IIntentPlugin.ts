export interface IIntentResult {
  /** Intent action */
  action?: string;
  /** Extra data */
  extras?: Record<string, unknown>;
}

export interface IStartActivityForResultOptions {
  /** Intent action */
  action: string;
  /** Data URI */
  uri?: string;
  /** Extra data */
  extras?: Record<string, unknown>;
  /** Target package name */
  package?: string;
  /** Target component class name */
  component?: string;
  /** MIME type */
  type?: string;
}

export interface IActivityResult {
  /** Activity result code (RESULT_OK = -1, RESULT_CANCELED = 0) */
  resultCode: number;
  /** Result data URI */
  data?: string;
  /** Result extras */
  extras?: Record<string, unknown>;
}

export interface IIntentPlugin {
  /**
   * Intent 수신기 등록
   */
  subscribe(
    options: { filters: string[] },
    callback: (result: IIntentResult) => void,
  ): Promise<{ id: string }>;

  /**
   * 특정 Intent 수신기 해제
   */
  unsubscribe(options: { id: string }): Promise<void>;

  /**
   * 모든 Intent 수신기 해제
   */
  unsubscribeAll(): Promise<void>;

  /**
   * Intent 전송
   */
  send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>;

  /**
   * 앱 시작 Intent 가져오기
   */
  getLaunchIntent(): Promise<IIntentResult>;

  /**
   * Activity 시작 후 결과 수신
   */
  startActivityForResult(options: IStartActivityForResultOptions): Promise<IActivityResult>;
}
