// ----------------------------------------------------------------------
// 프로토콜 상수
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
// 메시지 타입
// ----------------------------------------------------------------------

export type ServiceMessage =
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
// 시스템 (공통)
// ----------------------------------------------------------------------

/** 서버: 수신된 청크 메시지의 진행 상태 알림 */
export interface ServiceProgressMessage {
  name: "progress";
  body: {
    totalSize: number; // 전체 크기 (바이트)
    completedSize: number; // 완료된 크기 (바이트)
  };
}

/** 서버: 에러 알림 */
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

/** 클라이언트: 인증 메시지 */
export interface ServiceAuthMessage {
  name: "auth";
  body: string; // 토큰
}

// ----------------------------------------------------------------------
// Service.Method
// ----------------------------------------------------------------------

/** 클라이언트: 서비스 메서드 요청 */
export interface ServiceRequestMessage {
  name: `${string}.${string}`; // ${service}.${method}
  body: unknown[]; // 매개변수
}

/** 서버: 서비스 메서드 응답 */
export interface ServiceResponseMessage {
  name: "response";
  body?: unknown; // 결과
}

// ----------------------------------------------------------------------
// 이벤트
// ----------------------------------------------------------------------

/** 클라이언트: 이벤트 리스너 추가 */
export interface ServiceAddEventListenerMessage {
  name: "evt:add";
  body: {
    key: string; // 리스너 키 (uuid) - removeEventListener에 필요
    name: string; // 이벤트 이름 (Type.name)
    info: unknown; // 이벤트 발생 시 필터링을 위한 추가 리스너 정보
  };
}

/** 클라이언트: 이벤트 리스너 제거 */
export interface ServiceRemoveEventListenerMessage {
  name: "evt:remove";
  body: {
    key: string; // 리스너 키 (uuid)
  };
}

/** 클라이언트: 이벤트 리스너 정보 목록 요청 */
export interface ServiceGetEventListenerInfosMessage {
  name: "evt:gets";
  body: {
    name: string; // 이벤트 이름
  };
}

/** 클라이언트: 이벤트 발생 */
export interface ServiceEmitEventMessage {
  name: "evt:emit";
  body: {
    keys: string[]; // 리스너 키 목록
    data: unknown; // 데이터
  };
}

/** 서버: 이벤트 알림 */
export interface ServiceEventMessage {
  name: "evt:on";
  body: {
    keys: string[]; // 리스너 키 목록
    data: unknown; // 데이터
  };
}
