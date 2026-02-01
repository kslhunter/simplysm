/**
 * 객체를 JSON 문자열로 직렬화
 * DateTime, DateOnly, Time, Uuid, Set, Map, Error, Uint8Array 등 커스텀 타입 지원
 *
 * @param obj 직렬화할 객체
 * @param options 직렬화 옵션
 * @param options.space JSON 들여쓰기 (숫자: 공백 수, 문자열: 들여쓰기 문자열)
 * @param options.replacer 커스텀 replacer 함수. 기본 타입 변환 전에 호출됨
 * @param options.hideBytes true 시 Uint8Array 내용을 "__hidden__"으로 대체 (로깅용). 이 옵션으로 직렬화한 결과는 jsonParse()로 원본 Uint8Array를 복원할 수 없음
 *
 * @remarks
 * - 순환 참조가 있는 객체는 TypeError를 던짐
 * - 객체의 toJSON 메서드가 있으면 호출하여 결과를 사용함 (Date, DateTime 등 커스텀 타입 제외)
 * - 전역 프로토타입을 수정하지 않아 Worker 환경에서도 안전함
 */
export declare function jsonStringify(obj: unknown, options?: {
    space?: string | number;
    replacer?: (key: string | undefined, value: unknown) => unknown;
    hideBytes?: boolean;
}): string;
/**
 * JSON 문자열을 객체로 역직렬화
 * DateTime, DateOnly, Time, Uuid, Set, Map, Error, Uint8Array 등 커스텀 타입 복원
 *
 * @remarks
 * `__type__`과 `data` 키를 가진 객체는 타입 복원에 사용된다.
 * 사용자 데이터에 `{ __type__: "Date" | "DateTime" | "DateOnly" | "Time" | "Uuid" | "Set" | "Map" | "Error" | "Uint8Array", data: ... }`
 * 형태가 있으면 의도치 않게 타입 변환될 수 있으므로 주의한다.
 *
 * @security 개발 모드(`__DEV__`)에서만 에러 메시지에 JSON 문자열 전체가 포함된다.
 * 프로덕션 모드에서는 JSON 길이만 포함된다.
 */
export declare function jsonParse<T = unknown>(json: string): T;
//# sourceMappingURL=json.d.ts.map