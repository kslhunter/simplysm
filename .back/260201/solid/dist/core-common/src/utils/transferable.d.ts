/**
 * Worker 간 전송 가능한 객체 타입
 *
 * 이 코드에서는 ArrayBuffer만 사용됩니다.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects
 */
type Transferable = ArrayBuffer;
/**
 * Transferable 변환 유틸리티 함수
 *
 * Worker 간 데이터 전송을 위한 직렬화/역직렬화를 수행합니다.
 * structuredClone이 지원하지 않는 커스텀 타입들을 처리합니다.
 *
 * 지원 타입:
 * - Date, DateTime, DateOnly, Time, Uuid, RegExp
 * - Error (cause, code, detail 포함)
 * - Uint8Array (다른 TypedArray는 미지원, 일반 객체로 처리됨)
 * - Array, Map, Set, 일반 객체
 *
 * @note 순환 참조가 있으면 transferableEncode 시 TypeError 발생 (경로 정보 포함)
 * @note 동일 객체가 여러 곳에서 참조되면 순환 참조로 처리되어 TypeError 발생
 *
 * @example
 * // Worker로 데이터 전송
 * const { result, transferList } = transferableEncode(data);
 * worker.postMessage(result, transferList);
 *
 * // Worker에서 데이터 수신
 * const decoded = transferableDecode(event.data);
 */
/**
 * 심플리즘 타입을 사용한 객체를 일반 객체로 변환
 * Worker에 전송할 수 있는 형태로 직렬화
 *
 * @throws 순환 참조 감지 시 TypeError
 */
export declare function transferableEncode(obj: unknown): {
  result: unknown;
  transferList: Transferable[];
};
/**
 * serialize 객체를 심플리즘 타입 사용 객체로 변환
 * Worker로부터 받은 데이터를 역직렬화
 */
export declare function transferableDecode(obj: unknown): unknown;
export {};
//# sourceMappingURL=transferable.d.ts.map
