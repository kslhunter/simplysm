/**
 * 문자열 유틸리티 함수
 */

//#region 한국어 조사 처리

// 한국어 조사 매핑 테이블 (모듈 로드 시 한 번만 생성)
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
 * 받침 유무에 따라 적절한 한국어 조사 반환
 * @param text 확인할 텍스트
 * @param type 조사 타입
 *   - `"을"`: 을/를 (목적격 조사)
 *   - `"은"`: 은/는 (주격 보조사)
 *   - `"이"`: 이/가 (주격 조사)
 *   - `"와"`: 과/와 (접속 조사)
 *   - `"랑"`: 이랑/랑 (접속 조사)
 *   - `"로"`: 으로/로 (도구격 조사)
 *   - `"라"`: 이라/라 (서술격 조사)
 */
export function getKoreanSuffix(
  text: string,
  type: "을" | "은" | "이" | "와" | "랑" | "로" | "라",
): string {
  const table = suffixTable;

  if (text.length === 0) {
    return table[type].f;
  }

  const lastCharCode = text.charCodeAt(text.length - 1);

  // 한글 범위 확인 (0xAC00 ~ 0xD7A3)
  if (lastCharCode < 0xac00 || lastCharCode > 0xd7a3) {
    return table[type].f;
  }

  // 받침(종성) 존재 여부 판단
  const jongseongIndex = (lastCharCode - 0xac00) % 28;
  const hasLast = jongseongIndex !== 0;

  // "로" 조사 특수 처리: 받침이 ㄹ (종성 인덱스 8)이면 "로" 사용
  if (type === "로" && jongseongIndex === 8) {
    return table[type].f;
  }

  return hasLast ? table[type].t : table[type].f;
}

//#endregion

//#region 전각 → 반각 변환

// 전각 → 반각 매핑 테이블 (모듈 로드 시 한 번만 생성)
const fullWidthCharMap: Record<string, string> = {
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

// 정규식도 한 번만 생성
const fullWidthCharRegex = new RegExp(`[${Object.keys(fullWidthCharMap).join("")}]`, "g");

/**
 * 전각 문자를 반각 문자로 변환
 *
 * 변환 대상:
 * - 전각 대문자 (Ａ-Ｚ → A-Z)
 * - 전각 소문자 (ａ-ｚ → a-z)
 * - 전각 숫자 (０-９ → 0-9)
 * - 전각 공백 (　 → 일반 공백)
 * - 전각 괄호 (（） → ())
 */
export function replaceFullWidth(str: string): string {
  return str.replace(fullWidthCharRegex, (char) => fullWidthCharMap[char] ?? char);
}

//#endregion

//#region 대소문자 변환

/**
 * PascalCase로 변환
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/[-._][a-z]/g, (m) => m[1].toUpperCase())
    .replace(/^[a-z]/, (m) => m.toUpperCase());
}

/**
 * camelCase로 변환
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/[-._][a-z]/g, (m) => m[1].toUpperCase())
    .replace(/^[A-Z]/, (m) => m.toLowerCase());
}

/**
 * kebab-case로 변환
 */
export function toKebabCase(str: string): string {
  return toCaseWithSeparator(str, "-");
}

/**
 * snake_case로 변환
 */
export function toSnakeCase(str: string): string {
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
 * 문자열이 undefined 또는 빈 문자열인지 검사 (타입 가드)
 *
 * @param str 검사할 문자열
 * @returns undefined, null, 또는 빈 문자열이면 true
 */
export function isNullOrEmpty(str: string | undefined): str is "" | undefined {
  return str == null || str === "";
}

/**
 * 특정 위치에 문자열 삽입
 *
 * @param str 원본 문자열
 * @param index 삽입할 위치 (0부터 시작)
 * @param insertString 삽입할 문자열
 * @returns 삽입이 적용된 새 문자열
 */
export function insert(str: string, index: number, insertString: string): string {
  return str.substring(0, index) + insertString + str.substring(index);
}

//#endregion
