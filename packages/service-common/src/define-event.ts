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
 *
 * @example
 * // 서버·클라이언트 공통 패키지에서 이벤트 정의 + export
 * export const OrderUpdated = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");
 *
 * // 서버에서 이벤트 발생 (정의 객체를 그대로 전달, 이름·타입 자동 추론)
 * await server.emitEvent(OrderUpdated, (info) => info.orderId === 123, { status: "shipped" });
 *
 * // 클라이언트에서 구독
 * import { OrderUpdated } from "@common-package";
 * await client.addListener(OrderUpdated, { orderId: 123 }, async (data) => {
 *   console.log(data.status); // typed
 * });
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
