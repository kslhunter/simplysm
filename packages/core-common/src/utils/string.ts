/**
 * 문자열 유틸리티
 */
export class StringUtils {
  //#region 한글 조사 처리
  /**
   * 한글 조사를 받침에 따라 적절히 반환
   * @param text 텍스트
   * @param type 조사 타입
   */
  static getSuffix(
    text: string,
    type: "을" | "은" | "이" | "와" | "랑" | "로" | "라",
  ): string {
    const table = {
      을: { t: "을", f: "를" },
      은: { t: "은", f: "는" },
      이: { t: "이", f: "가" },
      와: { t: "과", f: "와" },
      랑: { t: "이랑", f: "랑" },
      로: { t: "으로", f: "로" },
      라: { t: "이라", f: "라" },
    };

    // 빈 문자열 또는 마지막 글자가 한글이 아닌 경우 받침 없음으로 처리
    if (text.length === 0) {
      return table[type].f;
    }

    const lastCharCode = text.charCodeAt(text.length - 1);

    // 한글 범위 체크 (0xAC00 ~ 0xD7A3)
    if (lastCharCode < 0xac00 || lastCharCode > 0xd7a3) {
      return table[type].f;
    }

    // 받침존재여부
    const hasLast = (lastCharCode - 0xac00) % 28 !== 0;
    return hasLast ? table[type].t : table[type].f;
  }
  //#endregion

  //#region 전각→반각 변환
  // 전각 → 반각 매핑 테이블 (클래스 로드 시 1회만 생성)
  private static readonly _specialCharMap: Record<string, string> = {
    Ａ: "A",
    Ｂ: "B",
    Ｃ: "C",
    Ｄ: "D",
    Ｅ: "E",
    Ｆ: "F",
    Ｇ: "G",
    Ｈ: "H",
    Ｉ: "I",
    Ｊ: "J",
    Ｋ: "K",
    Ｌ: "L",
    Ｍ: "M",
    Ｎ: "N",
    Ｏ: "O",
    Ｐ: "P",
    Ｑ: "Q",
    Ｒ: "R",
    Ｓ: "S",
    Ｔ: "T",
    Ｕ: "U",
    Ｖ: "V",
    Ｗ: "W",
    Ｘ: "X",
    Ｙ: "Y",
    Ｚ: "Z",
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
  private static readonly _specialCharRegex = new RegExp(
    `[${Object.keys(StringUtils._specialCharMap).join("")}]`,
    "g",
  );

  /**
   * 전각 문자를 반각으로 변환
   */
  static replaceSpecialDefaultChar(str: string): string {
    return str.replace(
      StringUtils._specialCharRegex,
      (char) => StringUtils._specialCharMap[char] ?? char,
    );
  }
  //#endregion

  //#region 케이스 변환
  /**
   * PascalCase로 변환
   */
  static toPascalCase(str: string): string {
    return str
      .replace(/[-.][a-z]/g, (m) => m[1].toUpperCase())
      .replace(/^[a-z]/, (m) => m.toUpperCase());
  }

  /**
   * camelCase로 변환
   */
  static toCamelCase(str: string): string {
    return str
      .replace(/[-.][a-z]/g, (m) => m[1].toUpperCase())
      .replace(/^[A-Z]/, (m) => m.toLowerCase());
  }

  /**
   * kebab-case로 변환
   */
  static toKebabCase(str: string): string {
    return str
      .replace(/^[A-Z]/, (m) => m.toLowerCase())
      .replace(/[-_]?[A-Z]/g, (m) => "-" + m.toLowerCase());
  }
  //#endregion

  //#region 기타
  /**
   * null, undefined, 빈 문자열 체크
   */
  static isNullOrEmpty(
    str: string | null | undefined,
  ): str is "" | undefined | null {
    return str == null || str === "";
  }

  /**
   * 문자열 특정 위치에 삽입
   */
  static insert(str: string, index: number, insertString: string): string {
    return str.substring(0, index) + insertString + str.substring(index);
  }
  //#endregion
}
