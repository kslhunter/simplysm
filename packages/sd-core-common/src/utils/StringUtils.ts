import * as _ from "lodash-es";

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

  static replaceSpecialDefaultChar(str: string): string {
    return str
      .replace(/Ａ/g, "A")
      .replace(/Ｂ/g, "B")
      .replace(/Ｃ/g, "C")
      .replace(/Ｄ/g, "D")
      .replace(/Ｅ/g, "E")
      .replace(/Ｆ/g, "F")
      .replace(/Ｇ/g, "G")
      .replace(/Ｈ/g, "H")
      .replace(/Ｉ/g, "I")
      .replace(/Ｊ/g, "J")
      .replace(/Ｋ/g, "K")
      .replace(/Ｌ/g, "L")
      .replace(/Ｍ/g, "M")
      .replace(/Ｎ/g, "N")
      .replace(/Ｏ/g, "O")
      .replace(/Ｐ/g, "P")
      .replace(/Ｑ/g, "Q")
      .replace(/Ｒ/g, "R")
      .replace(/Ｓ/g, "S")
      .replace(/Ｔ/g, "T")
      .replace(/Ｕ/g, "U")
      .replace(/Ｖ/g, "V")
      .replace(/Ｗ/g, "W")
      .replace(/Ｘ/g, "X")
      .replace(/Ｙ/g, "Y")
      .replace(/Ｚ/g, "Z")
      .replace(/０/g, "0")
      .replace(/１/g, "1")
      .replace(/２/g, "2")
      .replace(/３/g, "3")
      .replace(/４/g, "4")
      .replace(/５/g, "5")
      .replace(/６/g, "6")
      .replace(/７/g, "7")
      .replace(/８/g, "8")
      .replace(/９/g, "9")
      .replace(/　/g, " ")
      .replace(/）/g, ")")
      .replace(/（/g, "(");
  }

  static toCamelCase(str: string): string {
    return _.camelCase(str);
  }

  static toPascalCase(str: string): string {
    return _.upperFirst(_.camelCase(str));
  }

  static toKebabCase(str: string): string {
    return _.kebabCase(str);
  }

  static toSnakeCase(str: string): string {
    return _.snakeCase(str);
  }

  static isNullOrEmpty(str: string | null | undefined): str is "" | undefined | null {
    return str == null || str === "";
  }

  static insert(str: string, index: number, insertString: string) {
    return str.substring(0, index) + insertString + str.substring(index);
  }
}
