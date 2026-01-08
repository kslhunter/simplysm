export type TServiceMessage =
  | IServiceReloadMessage
  | IServiceRequestMessage
  | IServiceAuthMessage
  | IServiceProgressMessage
  | IServiceResponseMessage
  | IServiceErrorMessage
  | IServiceAddEventListenerMessage
  | IServiceRemoveEventListenerMessage
  | IServiceGetEventListenerInfosMessage
  | IServiceEmitEventMessage
  | IServiceEventMessage;

export type TServiceServerMessage =
  | IServiceReloadMessage // 알림
  | IServiceResponseMessage
  | IServiceErrorMessage
  | IServiceEventMessage; // 알림

export type TServiceServerRawMessage = IServiceProgressMessage | TServiceServerMessage;

export type TServiceClientMessage =
  | IServiceRequestMessage
  | IServiceAuthMessage
  | IServiceAddEventListenerMessage
  | IServiceRemoveEventListenerMessage
  | IServiceGetEventListenerInfosMessage
  | IServiceEmitEventMessage;

// ----------------------------------------------------------------------
// System 공통
// ----------------------------------------------------------------------

/** 서버: 클라이언트에게 reload 명령 */
export interface IServiceReloadMessage {
  name: "reload";
  body: {
    clientName: string | undefined; // 클라이언트명
    changedFileSet: Set<string>; // 변경파일목록
  };
}

/** 서버: 받은 분할메시지에 대한 progress 알림 */
export interface IServiceProgressMessage {
  name: "progress";
  body: {
    totalSize: number; // 총 크기 (Bytes)
    completedSize: number; // 완료된 크기 (Bytes)
  };
}

/** 서버: 에러 발생 알림 */
export interface IServiceErrorMessage {
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
export interface IServiceAuthMessage {
  name: "auth";
  body: string; // 토큰
}

// ----------------------------------------------------------------------
// Service.Method
// ----------------------------------------------------------------------

/** 클라: ServiceMethod 요청 */
export interface IServiceRequestMessage {
  name: `${string}.${string}`; // ${service}.${method}
  body: unknown[]; // params
}

/** 서버: ServiceMethod 응답 */
export interface IServiceResponseMessage {
  name: "response";
  body?: unknown; // result
}

// ----------------------------------------------------------------------
// 이벤트
// ----------------------------------------------------------------------

/** 클라: 이벤트 리스너 등록 */
export interface IServiceAddEventListenerMessage {
  name: "evt:add";
  body: {
    key: string; // 리스너키 (uuid) - 차후 removeEventListener를 위해서라도 필요함
    name: string; // 이벤트명 (Type.name)
    info: unknown; // 이벤트 발생시, 리스너 필터링이 가능하도록 하기 위한 "추가 리스너 정보"
  };
}

/** 클라: 이벤트 리스너 제거 */
export interface IServiceRemoveEventListenerMessage {
  name: "evt:remove";
  body: {
    key: string; // 리스너키 (uuid)
  };
}

/** 클라: 이벤트 리스너 정보 목록 요청 */
export interface IServiceGetEventListenerInfosMessage {
  name: "evt:gets";
  body: {
    name: string; // 이벤트명
  };
}

/** 클라: 이벤트 발생 */
export interface IServiceEmitEventMessage {
  name: "evt:emit";
  body: {
    keys: string[]; // 리스너키 목록
    data: unknown; // 데이터
  };
}

/** 서버: 이벤트 발생 알림 */
export interface IServiceEventMessage {
  name: "evt:on";
  body: {
    keys: string[]; // 리스너키 목록
    data: unknown; // 데이터
  };
}
