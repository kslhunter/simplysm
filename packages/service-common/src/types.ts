/**
 * 이벤트 리스너 타입 정의용 추상 클래스
 *
 * - 상속만 하면 됨 (프로퍼티 구현 불필요)
 * - $info, $data는 타입 추출용 (런타임 미사용)
 * - eventName은 mangle 안전한 이벤트 식별자
 *
 * @example
 * export class SharedDataChangeEvent extends ServiceEventListener<
 *   { name: string; filter: unknown },
 *   (string | number)[] | undefined
 * > {
 *   readonly eventName = "SharedDataChangeEvent";
 * }
 *
 * // 클라이언트에서 사용
 * await client.addEventListenerAsync(
 *   SharedDataChangeEvent,
 *   { name: "test", filter: null },
 *   (data) => console.log(data)
 * );
 */
export abstract class ServiceEventListener<TInfo, TData> {
  /** mangle 안전한 이벤트 식별자 (상속 시 필수 구현) */
  abstract readonly eventName: string;

  /** 타입 추출용 (런타임 미사용) */
  declare readonly $info: TInfo;
  declare readonly $data: TData;
}

/**
 * 파일 업로드 결과
 *
 * 서버에 업로드된 파일의 정보를 담는다.
 */
export interface ServiceUploadResult {
  /** 서버 내 저장 경로 */
  path: string;
  /** 원본 파일명 */
  filename: string;
  /** 파일 크기 (bytes) */
  size: number;
}
