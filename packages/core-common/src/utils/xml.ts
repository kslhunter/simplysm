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
 * @param options.stripTagPrefix 태그 prefix 제거 여부 (namespace)
 * @returns 파싱된 객체. 구조:
 *   - 속성: `$` 객체에 그룹화
 *   - 텍스트 노드: `_` 키에 저장
 *   - 자식 요소: 배열로 변환 (루트 요소 제외)
 * @example
 * xmlParse('<root id="1"><item>hello</item></root>');
 * // { root: { $: { id: "1" }, item: [{ _: "hello" }] } }
 */
export function xmlParse(str: string, options?: { stripTagPrefix?: boolean }): unknown {
  const result = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    attributesGroupName: "$",
    parseAttributeValue: false,
    parseTagValue: false,
    textNodeName: "_",
    isArray: (_tagName: string, jPath: string, _isLeafNode: boolean, isAttribute: boolean) => {
      return !isAttribute && jPath.split(".").length > 1;
    },
  }).parse(str) as unknown;
  return options?.stripTagPrefix ? stripTagPrefix(result) : result;
}

//#endregion

//#region stringify

/**
 * 객체를 XML 문자열로 직렬화
 * @param obj 직렬화할 객체
 * @param options fast-xml-parser XmlBuilderOptions (선택)
 * @returns XML 문자열
 * @example
 * xmlStringify({
 *   root: {
 *     $: { id: "1" },
 *     item: [{ _: "hello" }, { _: "world" }],
 *   },
 * });
 * // '<root id="1"><item>hello</item><item>world</item></root>'
 */
export function xmlStringify(obj: unknown, options?: XmlBuilderOptions): string {
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
 * 태그 이름에서 namespace prefix 제거
 * @note XML 파싱 결과에서 "ns:tag" 형태의 namespace prefix를 제거하여 태그 이름만 남긴다.
 *       이를 통해 namespace를 고려하지 않고 일관된 방식으로 XML 데이터에 접근할 수 있다.
 *       단, 속성(attribute)은 prefix를 유지한다.
 */
function stripTagPrefix(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => stripTagPrefix(item));
  }

  if (typeof obj === "object" && obj !== null) {
    const newObj: Record<string, unknown> = {};
    const record = obj as Record<string, unknown>;

    for (const key of Object.keys(record)) {
      const value = record[key];

      // Attribute는 prefix를 제거하면 안 된다.
      if (key === "$") {
        newObj[key] = value;
      } else {
        // 태그 이름에서만 첫 번째 ":"을 기준으로 prefix 제거
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
