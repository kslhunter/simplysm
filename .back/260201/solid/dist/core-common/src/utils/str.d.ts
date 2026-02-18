/**
 * 문자열 유틸리티 함수
 */
/**
 * 한글 조사를 받침에 따라 적절히 반환
 * @param text 텍스트
 * @param type 조사 타입
 *   - `"을"`: 을/를
 *   - `"은"`: 은/는
 *   - `"이"`: 이/가
 *   - `"와"`: 과/와
 *   - `"랑"`: 이랑/랑
 *   - `"로"`: 으로/로
 *   - `"라"`: 이라/라
 *
 * @example
 * getSuffix("사과", "을") // "를"
 * getSuffix("책", "이") // "이"
 */
export declare function strGetSuffix(
  text: string,
  type: "을" | "은" | "이" | "와" | "랑" | "로" | "라",
): string;
/**
 * 전각(Full-width) 문자를 반각(Half-width) 문자로 변환
 *
 * 변환 대상:
 * - 전각 영문 대문자 (Ａ-Ｚ → A-Z)
 * - 전각 영문 소문자 (ａ-ｚ → a-z)
 * - 전각 숫자 (０-９ → 0-9)
 * - 전각 공백 (　 → 일반 공백)
 * - 전각 괄호 (（） → ())
 *
 * @example
 * replaceSpecialDefaultChar("Ａ１２３") // "A123"
 * replaceSpecialDefaultChar("（株）") // "(株)"
 */
export declare function strReplaceFullWidth(str: string): string;
/**
 * PascalCase로 변환
 * @example "hello-world" → "HelloWorld"
 * @example "hello_world" → "HelloWorld"
 * @example "hello.world" → "HelloWorld"
 */
export declare function strToPascalCase(str: string): string;
/**
 * camelCase로 변환
 * @example "hello-world" → "helloWorld"
 * @example "hello_world" → "helloWorld"
 * @example "HelloWorld" → "helloWorld"
 */
export declare function strToCamelCase(str: string): string;
/**
 * kebab-case로 변환
 *
 * @example "HelloWorld" → "hello-world"
 * @example "helloWorld" → "hello-world"
 * @example "hello_world" → "hello_world" (소문자만 있으면 변환 안됨)
 * @example "Hello_World" → "hello-_world" (기존 분리자는 유지됨)
 * @example "Hello-World" → "hello--world" (기존 분리자는 유지됨)
 * @example "XMLParser" → "x-m-l-parser" (연속된 대문자는 각각 분리됨)
 */
export declare function strToKebabCase(str: string): string;
/**
 * snake_case로 변환
 *
 * @example "HelloWorld" → "hello_world"
 * @example "helloWorld" → "hello_world"
 * @example "hello-world" → "hello-world" (소문자만 있으면 변환 안됨)
 * @example "Hello-World" → "hello_-world" (기존 분리자는 유지됨)
 * @example "Hello_World" → "hello__world" (기존 분리자는 유지됨)
 * @example "XMLParser" → "x_m_l_parser" (연속된 대문자는 각각 분리됨)
 */
export declare function strToSnakeCase(str: string): string;
/**
 * undefined 또는 빈 문자열 여부 체크 (타입 가드)
 *
 * @param str 체크할 문자열
 * @returns undefined, null, 빈 문자열이면 true
 *
 * @example
 * const name: string | undefined = getValue();
 * if (strIsNullOrEmpty(name)) {
 *   // name: "" | undefined
 *   console.log("이름이 비어있습니다");
 * } else {
 *   // name: string (비어있지 않은 문자열)
 *   console.log(`이름: ${name}`);
 * }
 */
export declare function strIsNullOrEmpty(str: string | undefined): str is "" | undefined;
/**
 * 문자열 특정 위치에 삽입
 *
 * @param str 원본 문자열
 * @param index 삽입할 위치 (0부터 시작)
 * @param insertString 삽입할 문자열
 * @returns 삽입된 새 문자열
 *
 * @example
 * strInsert("Hello World", 5, ","); // "Hello, World"
 * strInsert("abc", 0, "X"); // "Xabc"
 * strInsert("abc", 3, "X"); // "abcX"
 */
export declare function strInsert(str: string, index: number, insertString: string): string;
//# sourceMappingURL=str.d.ts.map
