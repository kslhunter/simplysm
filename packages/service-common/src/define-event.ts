/**
 * defineEvent()로 생성된 이벤트 정의.
 * $info와 $data는 타입 전용 마커임 (런타임에서는 사용되지 않음).
 */
export interface ServiceEventDef<TInfo = unknown, TData = unknown> {
  eventName: string;
  /** 타입 추출 전용 (런타임에서는 사용되지 않음) */
  readonly $info: TInfo;
  /** 타입 추출 전용 (런타임에서는 사용되지 않음) */
  readonly $data: TData;
}

/**
 * 타입 안전한 info와 data를 가진 서비스 이벤트를 정의한다.
 */
export function defineEvent<TInfo = unknown, TData = unknown>(
  eventName: string,
): ServiceEventDef<TInfo, TData> {
  return {
    eventName,
    $info: undefined as unknown as TInfo,
    $data: undefined as unknown as TData,
  };
}
