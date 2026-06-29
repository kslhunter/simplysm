/** 워커 빌드 완료 이벤트 데이터 */
export interface BuildEventData {
  success: boolean;
  errors?: string[];
  warnings?: string[];
}

/** 워커 에러 이벤트 데이터 */
export interface ErrorEventData {
  message: string;
  stack?: string;
}

/** 워커 서버 준비 완료 이벤트 데이터 */
export interface ServerReadyEventData {
  port: number;
}

/** Server 빌드 완료 이벤트 데이터 */
export interface ServerBuildEventData {
  success: boolean;
  mainJsPath: string;
  errors?: string[];
  warnings?: string[];
}

