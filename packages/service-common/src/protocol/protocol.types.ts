// ----------------------------------------------------------------------
// Protocol Constants
// ----------------------------------------------------------------------

/** 서비스 프로토콜 설정 */
export const PROTOCOL_CONFIG = {
  /** 최대 메시지 크기 (100MB) */
  MAX_TOTAL_SIZE: 100 * 1024 * 1024,
  /** 청킹 임계값 (3MB) */
  SPLIT_MESSAGE_SIZE: 3 * 1024 * 1024,
  /** 청크 크기 (300KB) */
  CHUNK_SIZE: 300 * 1024,
  /** GC 주기 (10초) */
  GC_INTERVAL: 10 * 1000,
  /** 미완성 메시지 만료 시간 (60초) */
  EXPIRE_TIME: 60 * 1000,
} as const;

// ----------------------------------------------------------------------
// Message Types
// ----------------------------------------------------------------------

export type ServiceMessage =
  | ServiceReloadMessage
  | ServiceRequestMessage
  | ServiceAuthMessage
  | ServiceProgressMessage
  | ServiceResponseMessage
  | ServiceErrorMessage
  | ServiceAddEventListenerMessage
  | ServiceRemoveEventListenerMessage
  | ServiceGetEventListenerInfosMessage
  | ServiceEmitEventMessage
  | ServiceEventMessage;

export type ServiceServerMessage =
  | ServiceReloadMessage // 알림
  | ServiceResponseMessage
  | ServiceErrorMessage
  | ServiceEventMessage; // 알림

export type ServiceServerRawMessage = ServiceProgressMessage | ServiceServerMessage;

export type ServiceClientMessage =
  | ServiceRequestMessage
  | ServiceAuthMessage
  | ServiceAddEventListenerMessage
  | ServiceRemoveEventListenerMessage
  | ServiceGetEventListenerInfosMessage
  | ServiceEmitEventMessage;

// ----------------------------------------------------------------------
// System 공통
// ----------------------------------------------------------------------

/** 서버: 클라이언트에게 reload 명령 */
export interface ServiceReloadMessage {
  name: "reload";
  body: {
    clientName: string | undefined; // 클라이언트명
    changedFileSet: Set<string>; // 변경파일목록
  };
}

/** 서버: 받은 분할메시지에 대한 progress 알림 */
export interface ServiceProgressMessage {
  name: "progress";
  body: {
    totalSize: number; // 총 크기 (Bytes)
    completedSize: number; // 완료된 크기 (Bytes)
  };
}

/** 서버: 에러 발생 알림 */
export interface ServiceErrorMessage {
  name: "error";
  body: {
    name: string;
    message: string;
    code: string;
    stack?: string;
    detail?: unknown;
    cause?: unknown;
  };
}

/** 클라: 인증 메시지 */
export interface ServiceAuthMessage {
  name: "auth";
  body: string; // 토큰
}

// ----------------------------------------------------------------------
// Service.Method
// ----------------------------------------------------------------------

/** 클라: ServiceMethod 요청 */
export interface ServiceRequestMessage {
  name: `${string}.${string}`; // ${service}.${method}
  body: unknown[]; // params
}

/** 서버: ServiceMethod 응답 */
export interface ServiceResponseMessage {
  name: "response";
  body?: unknown; // result
}

// ----------------------------------------------------------------------
// 이벤트
// ----------------------------------------------------------------------

/** 클라: 이벤트 리스너 등록 */
export interface ServiceAddEventListenerMessage {
  name: "evt:add";
  body: {
    key: string; // 리스너키 (uuid) - 차후 removeEventListener를 위해서라도 필요함
    name: string; // 이벤트명 (Type.name)
    info: unknown; // 이벤트 발생시, 리스너 필터링이 가능하도록 하기 위한 "추가 리스너 정보"
  };
}

/** 클라: 이벤트 리스너 제거 */
export interface ServiceRemoveEventListenerMessage {
  name: "evt:remove";
  body: {
    key: string; // 리스너키 (uuid)
  };
}

/** 클라: 이벤트 리스너 정보 목록 요청 */
export interface ServiceGetEventListenerInfosMessage {
  name: "evt:gets";
  body: {
    name: string; // 이벤트명
  };
}

/** 클라: 이벤트 발생 */
export interface ServiceEmitEventMessage {
  name: "evt:emit";
  body: {
    keys: string[]; // 리스너키 목록
    data: unknown; // 데이터
  };
}

/** 서버: 이벤트 발생 알림 */
export interface ServiceEventMessage {
  name: "evt:on";
  body: {
    keys: string[]; // 리스너키 목록
    data: unknown; // 데이터
  };
}
