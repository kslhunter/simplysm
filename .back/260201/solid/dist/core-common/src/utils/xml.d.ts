/**
 * XML 변환 유틸리티
 */
import type { XmlBuilderOptions } from "fast-xml-parser";
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
export declare function xmlParse(
  str: string,
  options?: {
    stripTagPrefix?: boolean;
  },
): unknown;
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
export declare function xmlStringify(obj: unknown, options?: XmlBuilderOptions): string;
//# sourceMappingURL=xml.d.ts.map
