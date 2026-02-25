/**
 * String utility functions
 */

//#region Korean particle handling

// Korean particle mapping table (created only once when module loads)
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
 * Return the appropriate Korean particle based on the final consonant
 * @param text The text to check
 * @param type The particle type
 *   - `"을"`: 을/를 (eul/reul - object particle)
 *   - `"은"`: 은/는 (eun/neun - subject particle)
 *   - `"이"`: 이/가 (i/ga - subject particle)
 *   - `"와"`: 과/와 (gwa/wa - and particle)
 *   - `"랑"`: 이랑/랑 (irang/rang - and particle)
 *   - `"로"`: 으로/로 (euro/ro - instrumental particle)
 *   - `"라"`: 이라/라 (ira/ra - copula particle)
 *
 * @example
 * koreanGetSuffix("사과", "을") // "를"
 * koreanGetSuffix("책", "이") // "이"
 */
export function koreanGetSuffix(
  text: string,
  type: "을" | "은" | "이" | "와" | "랑" | "로" | "라",
): string {
  const table = suffixTable;

  if (text.length === 0) {
    return table[type].f;
  }

  const lastCharCode = text.charCodeAt(text.length - 1);

  // Hangul range check (0xAC00 ~ 0xD7A3)
  if (lastCharCode < 0xac00 || lastCharCode > 0xd7a3) {
    return table[type].f;
  }

  // Determine if final consonant (jongseong) exists
  const jongseongIndex = (lastCharCode - 0xac00) % 28;
  const hasLast = jongseongIndex !== 0;

  // Special handling for "로" particle: when final consonant is ㄹ (jongseong index 8), use "로"
  if (type === "로" && jongseongIndex === 8) {
    return table[type].f;
  }

  return hasLast ? table[type].t : table[type].f;
}

//#endregion

//#region Full-width to half-width conversion

// Full-width to half-width mapping table (created only once when module loads)
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

// Regex also created only once
const fullWidthCharRegex = new RegExp(`[${Object.keys(fullWidthCharMap).join("")}]`, "g");

/**
 * Convert full-width characters to half-width characters
 *
 * Conversion targets:
 * - Full-width uppercase letters (Ａ-Ｚ → A-Z)
 * - Full-width lowercase letters (ａ-ｚ → a-z)
 * - Full-width digits (０-９ → 0-9)
 * - Full-width space (　 → regular space)
 * - Full-width parentheses (（） → ())
 *
 * @example
 * strReplaceFullWidth("Ａ１２３") // "A123"
 * strReplaceFullWidth("（株）") // "(株)"
 */
export function strReplaceFullWidth(str: string): string {
  return str.replace(fullWidthCharRegex, (char) => fullWidthCharMap[char] ?? char);
}

//#endregion

//#region Case conversion

/**
 * Convert to PascalCase
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
 * Convert to camelCase
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
 * Convert to kebab-case
 *
 * @example "HelloWorld" → "hello-world"
 * @example "helloWorld" → "hello-world"
 * @example "hello_world" → "hello_world" (no conversion if only lowercase)
 * @example "Hello_World" → "hello-_world" (existing separators are preserved)
 * @example "Hello-World" → "hello--world" (existing separators are preserved)
 * @example "XMLParser" → "x-m-l-parser" (consecutive uppercase letters are separated)
 */
export function strToKebabCase(str: string): string {
  return toCaseWithSeparator(str, "-");
}

/**
 * Convert to snake_case
 *
 * @example "HelloWorld" → "hello_world"
 * @example "helloWorld" → "hello_world"
 * @example "hello-world" → "hello-world" (no conversion if only lowercase)
 * @example "Hello-World" → "hello_-world" (existing separators are preserved)
 * @example "Hello_World" → "hello__world" (existing separators are preserved)
 * @example "XMLParser" → "x_m_l_parser" (consecutive uppercase letters are separated)
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

//#region Other

/**
 * Check if string is undefined or empty (type guard)
 *
 * @param str The string to check
 * @returns true if undefined, null, or empty string
 *
 * @example
 * const name: string | undefined = getValue();
 * if (strIsNullOrEmpty(name)) {
 *   // name: "" | undefined
 *   console.log("Name is empty");
 * } else {
 *   // name: string (non-empty string)
 *   console.log(`Name: ${name}`);
 * }
 */
export function strIsNullOrEmpty(str: string | undefined): str is "" | undefined {
  return str == null || str === "";
}

/**
 * Insert a string at a specific position
 *
 * @param str The original string
 * @param index The position to insert at (0-based)
 * @param insertString The string to insert
 * @returns A new string with the insertion applied
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
