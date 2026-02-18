export class StringUtils {
  static getSuffix(text: string, type: "을" | "은" | "이" | "와" | "랑" | "로" | "라"): string {
    const table = {
      을: { t: "을", f: "를" },
      은: { t: "은", f: "는" },
      이: { t: "이", f: "가" },
      와: { t: "과", f: "와" },
      랑: { t: "이랑", f: "랑" },
      로: { t: "으로", f: "로" },
      라: { t: "이라", f: "라" },
    };

    // 받침존재여부
    const hasLast = (text.slice(-1).charCodeAt(0) - 0xac00) % 28 !== 0;
    return hasLast ? table[type].t : table[type].f;
  }

  // 전각 → 반각 매핑 테이블 (클래스 로드 시 1회만 생성)
  private static readonly _specialCharMap: Record<string, string> = {
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

  static replaceSpecialDefaultChar(str: string): string {
    return str.replace(
      StringUtils._specialCharRegex,
      (char) => StringUtils._specialCharMap[char] ?? char,
    );
  }

  static toPascalCase(str: string): string {
    return str
      .replace(/[-.][a-z]/g, (m) => m[1].toUpperCase())
      .replace(/^[a-z]/, (m) => m.toUpperCase());
  }

  static toCamelCase(str: string): string {
    return str
      .replace(/[-.][a-z]/g, (m) => m[1].toUpperCase())
      .replace(/^[A-Z]/, (m) => m.toLowerCase());
  }

  static toKebabCase(str: string): string {
    return str
      .replace(/^[A-Z]/, (m) => m.toLowerCase())
      .replace(/[-_]?[A-Z]/g, (m) => "-" + m.toLowerCase());
  }

  static isNullOrEmpty(str: string | null | undefined): str is "" | undefined | null {
    return str == null || str === "";
  }

  static insert(str: string, index: number, insertString: string) {
    return str.substring(0, index) + insertString + str.substring(index);
  }
}
