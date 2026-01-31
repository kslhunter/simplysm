/**
 * 문자열 유틸리티 함수
 */

//#region 한글 조사 처리

// 한글 조사 매핑 테이블 (모듈 로드 시 1회만 생성)
const suffixTable = {
  을: { t: "을", f: "를" },
  은: { t: "은", f: "는" },
  이: { t: "이", f: "가" },
  와: { t: "과", f: "와" },
  랑: { t: "이랑", f: "랑" },
  로: { t: "으로", f: "로" },
  라: { t: "이라", f: "라" },
};

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
export function strGetSuffix(
  text: string,
  type: "을" | "은" | "이" | "와" | "랑" | "로" | "라",
): string {
  const table = suffixTable;

  // 빈 문자열 또는 마지막 글자가 한글이 아닌 경우 받침 없음으로 처리
  if (text.length === 0) {
    return table[type].f;
  }

  const lastCharCode = text.charCodeAt(text.length - 1);

  // 한글 범위 체크 (0xAC00 ~ 0xD7A3)
  if (lastCharCode < 0xac00 || lastCharCode > 0xd7a3) {
    return table[type].f;
  }

  // 받침 존재 여부 및 종성 인덱스 계산
  const jongseongIndex = (lastCharCode - 0xac00) % 28;
  const hasLast = jongseongIndex !== 0;

  // "로" 조사는 받침 ㄹ(종성 인덱스 8)일 때 "로"로 처리
  if (type === "로" && jongseongIndex === 8) {
    return table[type].f;
  }

  return hasLast ? table[type].t : table[type].f;
}

//#endregion

//#region 전각→반각 변환

// 전각 → 반각 매핑 테이블 (모듈 로드 시 1회만 생성)
const specialCharMap: Record<string, string> = {
  "Ａ": "A",
  "Ｂ": "B",
  "Ｃ": "C",
  "Ｄ": "D",
  "Ｅ": "E",
  "Ｆ": "F",
  "Ｇ": "G",
  "Ｈ": "H",
  "Ｉ": "I",
  "Ｊ": "J",
  "Ｋ": "K",
  "Ｌ": "L",
  "Ｍ": "M",
  "Ｎ": "N",
  "Ｏ": "O",
  "Ｐ": "P",
  "Ｑ": "Q",
  "Ｒ": "R",
  "Ｓ": "S",
  "Ｔ": "T",
  "Ｕ": "U",
  "Ｖ": "V",
  "Ｗ": "W",
  "Ｘ": "X",
  "Ｙ": "Y",
  "Ｚ": "Z",
  "ａ": "a",
  "ｂ": "b",
  "ｃ": "c",
  "ｄ": "d",
  "ｅ": "e",
  "ｆ": "f",
  "ｇ": "g",
  "ｈ": "h",
  "ｉ": "i",
  "ｊ": "j",
  "ｋ": "k",
  "ｌ": "l",
  "ｍ": "m",
  "ｎ": "n",
  "ｏ": "o",
  "ｐ": "p",
  "ｑ": "q",
  "ｒ": "r",
  "ｓ": "s",
  "ｔ": "t",
  "ｕ": "u",
  "ｖ": "v",
  "ｗ": "w",
  "ｘ": "x",
  "ｙ": "y",
  "ｚ": "z",
  "０": "0",
  "１": "1",
  "２": "2",
  "３": "3",
  "４": "4",
  "５": "5",
  "６": "6",
  "７": "7",
  "８": "8",
  "９": "9",
  "　": " ",
  "）": ")",
  "（": "(",
};

// 정규식도 1회만 생성
const specialCharRegex = new RegExp(`[${Object.keys(specialCharMap).join("")}]`, "g");

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
export function strReplaceFullWidth(str: string): string {
  return str.replace(specialCharRegex, (char) => specialCharMap[char] ?? char);
}

//#endregion

//#region 케이스 변환

/**
 * PascalCase로 변환
 * @example "hello-world" → "HelloWorld"
 * @example "hello_world" → "HelloWorld"
 * @example "hello.world" → "HelloWorld"
 */
export function strToPascalCase(str: string): string {
  return str
    .replace(/[-._][a-z]/g, (m) => m[1].toUpperCase())
    .replace(/^[a-z]/, (m) => m.toUpperCase());
}

/**
 * camelCase로 변환
 * @example "hello-world" → "helloWorld"
 * @example "hello_world" → "helloWorld"
 * @example "HelloWorld" → "helloWorld"
 */
export function strToCamelCase(str: string): string {
  return str
    .replace(/[-._][a-z]/g, (m) => m[1].toUpperCase())
    .replace(/^[A-Z]/, (m) => m.toLowerCase());
}

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
export function strToKebabCase(str: string): string {
  return toCaseWithSeparator(str, "-");
}

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
export function strToSnakeCase(str: string): string {
  return toCaseWithSeparator(str, "_");
}

function toCaseWithSeparator(str: string, separator: string): string {
  return str
    .replace(/^[A-Z]/, (m) => m.toLowerCase())
    .replace(/[-_]?[A-Z]/g, (m) => separator + m.toLowerCase());
}

//#endregion

//#region 기타

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
export function strIsNullOrEmpty(str: string | undefined): str is "" | undefined {
  return str == null || str === "";
}

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
export function strInsert(str: string, index: number, insertString: string): string {
  return str.substring(0, index) + insertString + str.substring(index);
}

//#endregion
