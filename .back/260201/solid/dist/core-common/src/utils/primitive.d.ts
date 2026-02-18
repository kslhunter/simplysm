import type { PrimitiveTypeMap, PrimitiveTypeStr } from "../common.types";
/**
 * 값에서 PrimitiveTypeStr 추론
 *
 * 런타임에서 값의 타입을 검사하여 해당하는 PrimitiveTypeStr을 반환합니다.
 *
 * @param value 타입을 추론할 값
 * @returns 값에 해당하는 PrimitiveTypeStr
 * @throws ArgumentError 지원하지 않는 타입인 경우
 *
 * @example
 * getPrimitiveTypeStr("hello") // "string"
 * getPrimitiveTypeStr(123) // "number"
 * getPrimitiveTypeStr(new DateTime()) // "DateTime"
 * getPrimitiveTypeStr(new Uint8Array()) // "Bytes"
 */
export declare function getPrimitiveTypeStr(
  value: PrimitiveTypeMap[PrimitiveTypeStr],
): PrimitiveTypeStr;
//# sourceMappingURL=primitive.d.ts.map
