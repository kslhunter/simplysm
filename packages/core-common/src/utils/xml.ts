/**
 * XML 변환 유틸리티
 */
import type { XmlBuilderOptions } from "fast-xml-parser";
import { XMLBuilder, XMLParser } from "fast-xml-parser";

//#region parse

/**
 * XML 문자열을 객체로 파싱
 * @param str XML 문자열
 * @param options 옵션
 * @param options.stripTagPrefix 태그 접두사(네임스페이스) 제거 여부
 * @returns 파싱된 객체. 구조:
 *   - 속성: `$` 객체에 그룹화
 *   - 텍스트 노드: `_` key에 저장
 *   - 자식 요소: array로 변환 (루트 요소 제외)
 */
export function parse(str: string, options?: { stripTagPrefix?: boolean }): unknown {
  const result = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    attributesGroupName: "$",
    parseAttributeValue: false,
    parseTagValue: false,
    textNodeName: "_",
    htmlEntities: true,
    isArray: (_tagName: string, jPath: unknown, _isLeafNode: boolean, isAttribute: boolean) => {
      return !isAttribute && typeof jPath === "string" && jPath.split(".").length > 1;
    },
  }).parse(str) as unknown;
  return options?.stripTagPrefix ? stripTagPrefix(result) : result;
}

//#endregion

//#region stringify

/**
 * 객체를 XML 문자열로 직렬화
 * @param obj 직렬화할 객체
 * @param options fast-xml-parser XmlBuilderOptions (선택사항)
 * @returns XML 문자열
 */
export function stringify(obj: unknown, options?: XmlBuilderOptions): string {
  return new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    attributesGroupName: "$",
    suppressBooleanAttributes: false,
    textNodeName: "_",
    ...options,
  }).build(obj);
}

//#endregion

//#region private

/**
 * 태그 이름에서 네임스페이스 접두사 제거
 * @note XML 파싱 결과에서 "ns:tag" 형식의 네임스페이스 접두사를 제거하여 태그 이름만 남김.
 *       네임스페이스를 고려하지 않고 XML 데이터에 일관되게 접근 가능.
 *       단, 속성은 접두사가 유지됨.
 */
function stripTagPrefix(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => stripTagPrefix(item));
  }

  if (typeof obj === "object" && obj != null) {
    const newObj: Record<string, unknown> = {};
    const record = obj as Record<string, unknown>;

    for (const key of Object.keys(record)) {
      const value = record[key];

      // 속성은 접두사를 제거하면 안 됨
      if (key === "$") {
        newObj[key] = value;
      } else {
        // 첫 번째 ":"를 기준으로 태그 이름에서만 접두사 제거
        const colonIndex = key.indexOf(":");
        const cleanKey = colonIndex !== -1 ? key.slice(colonIndex + 1) : key;
        newObj[cleanKey] = stripTagPrefix(value);
      }
    }

    return newObj;
  }

  return obj;
}

//#endregion
