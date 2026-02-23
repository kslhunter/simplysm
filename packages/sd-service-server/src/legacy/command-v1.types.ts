/** @deprecated */
export interface ISdServiceMethodCommandInfo {
  serviceName: string;
  methodName: string;
}

/**
 * @deprecated
 * 서버가 특별하게 처리하는 "특수 커맨드" 들
 *
 * 특수 커맨드 추가 방법
 * 1. SD_SERVICE_SPECIAL_COMMANDS에 추가
 * 2. 서버 #processRequestAsync에 분기 추가
 * 3. 클라이언트에서 사용할 때도 상수만 쓰기
 */
export const SD_SERVICE_SPECIAL_COMMANDS = {
  ADD_EVENT_LISTENER: "addEventListener",
  REMOVE_EVENT_LISTENER: "removeEventListener",
  GET_EVENT_LISTENER_INFOS: "getEventListenerInfos",
  EMIT_EVENT: "emitEvent",
} as const;

/** @deprecated */
export type TSdServiceSpecialCommand =
  (typeof SD_SERVICE_SPECIAL_COMMANDS)[keyof typeof SD_SERVICE_SPECIAL_COMMANDS];

// "Service.method" 형태의 일반 호출용 커맨드
/** @deprecated */
export type TSdServiceMethodCommand = `${string}.${string}`;

// 최종적으로 허용되는 전체 커맨드 타입
/** @deprecated */
export type TSdServiceCommand = TSdServiceSpecialCommand | TSdServiceMethodCommand;
