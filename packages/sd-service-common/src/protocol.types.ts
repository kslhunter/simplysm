export const SD_SERVICE_MESSAGE_MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB

export type TSdServiceMessage =
  | ISdServiceConnectedMessage
  | ISdServiceReloadMessage
  | ISdServicePingMessage
  // | ISdServicePongMessage -> ping response
  | ISdServiceProgressMessage
  | ISdServiceErrorMessage
  | ISdServiceRequestMessage
  | ISdServiceResponseMessage
  | ISdServiceAddEventListenerMessage
  | ISdServiceRemoveEventListenerMessage
  | ISdServiceGetEventListenerInfosMessage
  // | ISdServiceGetEventListenerInfosResponseMessage -> response
  | ISdServiceEmitEventMessage
  | ISdServiceEventMessage;

export type TSdServiceServerMessage =
  | ISdServiceConnectedMessage
  | ISdServiceReloadMessage
  | ISdServiceErrorMessage
  | ISdServiceResponseMessage
  // | ISdServiceGetEventListenerInfosResponseMessage -> response
  | ISdServiceEventMessage;

export type TSdServiceServerRawMessage =
  // | ISdServicePongMessage -> ping response
  ISdServiceProgressMessage | TSdServiceServerMessage;

export type TSdServiceClientMessage =
  | ISdServiceRequestMessage
  | ISdServiceAddEventListenerMessage
  | ISdServiceRemoveEventListenerMessage
  | ISdServiceGetEventListenerInfosMessage
  | ISdServiceEmitEventMessage;

export type TSdServiceClientRawMessage = ISdServicePingMessage | TSdServiceClientMessage;

// ----------------------------------------------------------------------
// System 공통
// ----------------------------------------------------------------------

// 서버: 연결되었음을 클라이언트에 알림
export interface ISdServiceConnectedMessage {
  name: "connected";
}

// 서버: 클라이언트에게 reload 명령
export interface ISdServiceReloadMessage {
  name: "reload";
  body: {
    clientName: string | undefined; // 클라이언트명
    changedFileSet: Set<string>; // 변경파일목록
  };
}

// 클라: ping (클라->서버에 대한 ping/pong은 수동으로 수행)
export interface ISdServicePingMessage {
  name: "ping";
}

// 서버: ping에 대한 응답
/*export interface ISdServicePongMessage {
  name: "pong";
}*/

// 서버: 받은 분할메시지에 대한 progress 알림
export interface ISdServiceProgressMessage {
  name: "progress";
  body: {
    totalSize: number; // 총 크기 (Bytes)
    completedSize: number; // 완료된 크기 (Bytes)
  };
}

// 서버: 에러 발생 알림
export interface ISdServiceErrorMessage {
  name: `error`;
  body: {
    message: string;
    code: string;
    stack?: string;
    detail?: any;
  };
}

// ----------------------------------------------------------------------
// Service.Method
// ----------------------------------------------------------------------

// 클라: ServiceMethod 요청
export interface ISdServiceRequestMessage {
  name: `${string}.${string}`; // ${service}.${method}
  body: any[]; // params
}

// 서버: ServiceMethod 응답
export interface ISdServiceResponseMessage {
  name: `response`;
  body?: any; // result
}

// ----------------------------------------------------------------------
// 이벤트
// ----------------------------------------------------------------------

// 클라: 이벤트 리스너 등록
export interface ISdServiceAddEventListenerMessage {
  name: "evt:add";
  body: {
    key: string; // 리스너키 (uuid) - 차후 removeEventListener를 위해서라도 필요함

    name: string; // 이벤트명 (Type.name)
    info: any; // 이벤트 발생시, 리스너 필터링이 가능하도록 하기 위한 "추가 리스너 정보"
  };
}

// 클라: 이벤트 리스너 제거
export interface ISdServiceRemoveEventListenerMessage {
  name: "evt:remove";
  body: {
    key: string; // 리스너키 (uuid) - 차후 removeEventListener를 위해서라도 필요함
  };
}

// 클라: 이벤트 리스너 정보 목록 요청
export interface ISdServiceGetEventListenerInfosMessage {
  name: "evt:gets";
  body: {
    name: string; // 이벤트명
  };
}

// 서버: 이벤트 리스너 정보 목록 응답
/*export interface ISdServiceGetEventListenerInfosResponseMessage {
  name: "evt:gets:res";
  body: {
    key: string; // 리스너키
    info: any; // 리스너정보
  }[];
}*/

// 클라: 이벤트 발생
export interface ISdServiceEmitEventMessage {
  name: "evt:emit";
  body: {
    keys: string[]; // 리스너키 목록
    data: any; // 데이터
  };
}

// 서버: 이벤트 발생 알림
export interface ISdServiceEventMessage {
  name: `evt:on`;
  body: {
    keys: string[]; // 리스너키 목록
    data: any; // 데이터
  };
}
