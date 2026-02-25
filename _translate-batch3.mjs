import fs from "fs";
const BASE = "D:/workspaces-13/simplysm";
const fileEdits = {
  "packages/core-common/src/utils/bytes.ts": [
    [
      "* Uint8Array 유틸리티 함수 (복잡한 연산만)\n *\n * 기능:\n * - bytesConcat: 여러 Uint8Array 연결\n * - bytesToHex: Uint8Array를 hex 문자열로 변환\n * - bytesFromHex: hex 문자열을 Uint8Array로 변환\n * - bytesToBase64: Uint8Array를 base64 문자열로 변환\n * - bytesFromBase64: base64 문자열을 Uint8Array로 변환",
      "* Uint8Array utility functions (complex operations only)\n *\n * Features:\n * - bytesConcat: Concatenate multiple Uint8Arrays\n * - bytesToHex: Convert Uint8Array to hex string\n * - bytesFromHex: Convert hex string to Uint8Array\n * - bytesToBase64: Convert Uint8Array to base64 string\n * - bytesFromBase64: Convert base64 string to Uint8Array",
    ],
    [
      "/** hex 변환용 룩업 테이블 (성능 최적화) */",
      "/** Lookup table for hex conversion (performance optimization) */",
    ],
    ["/** base64 인코딩 테이블 */", "/** Base64 encoding table */"],
    [
      "/** base64 디코딩 룩업 테이블 (O(1) 조회, 모든 바이트 값 커버) */",
      "/** Base64 decoding lookup table (O(1) lookup, covers all byte values) */",
    ],
    [
      "* 여러 Uint8Array 연결\n * @param arrays 연결할 Uint8Array 배열\n * @returns 연결된 새 Uint8Array",
      "* Concatenate multiple Uint8Arrays\n * @param arrays Array of Uint8Arrays to concatenate\n * @returns New concatenated Uint8Array",
    ],
    [
      "* hex 문자열로 변환\n * @param bytes 변환할 Uint8Array\n * @returns 소문자 hex 문자열",
      "* Convert to hex string\n * @param bytes Uint8Array to convert\n * @returns Lowercase hex string",
    ],
    [
      "* hex 문자열에서 Uint8Array로 변환\n * @param hex 변환할 hex 문자열 (소문자/대문자 모두 허용)\n * @returns 변환된 Uint8Array\n * @throws {ArgumentError} 홀수 길이 또는 유효하지 않은 hex 문자가 포함된 경우",
      "* Convert hex string to Uint8Array\n * @param hex Hex string to convert (both lowercase/uppercase accepted)\n * @returns Converted Uint8Array\n * @throws {ArgumentError} If odd length or contains invalid hex characters",
    ],
    [
      "* Bytes를 base64 문자열로 변환\n * @param bytes 변환할 Uint8Array\n * @returns base64 인코딩된 문자열",
      "* Convert Bytes to base64 string\n * @param bytes Uint8Array to convert\n * @returns Base64 encoded string",
    ],
    [
      "* base64 문자열을 Bytes로 변환\n * @param base64 변환할 base64 문자열\n * @returns 디코딩된 Uint8Array\n * @throws {ArgumentError} 유효하지 않은 base64 문자가 포함된 경우",
      "* Convert base64 string to Bytes\n * @param base64 Base64 string to convert\n * @returns Decoded Uint8Array\n * @throws {ArgumentError} If contains invalid base64 characters",
    ],
    ["// 공백 제거 및 패딩 정규화", "// Remove whitespace and normalize padding"],
    ["// 빈 문자열 처리", "// Handle empty string"],
    ["// 유효성 검사: 문자", "// Validation: characters"],
    [
      "// 유효성 검사: 길이 (패딩 제거 후 나머지가 1이면 유효하지 않음)",
      "// Validation: length (remainder of 1 after padding removal is invalid)",
    ],
  ],
  "packages/core-common/src/utils/date-format.ts": [
    [
      "* 월 설정 시 연도/월/일 정규화 결과",
      "* Normalized year/month/day result when setting month",
    ],
    [
      "* 월 설정 시 연도/월/일을 정규화\n * - 월이 1-12 범위를 벗어나면 연도를 조정\n * - 대상 월의 일수보다 현재 일자가 크면 해당 월의 마지막 날로 조정",
      "* Normalize year/month/day when setting month\n * - Adjusts year if month is outside 1-12 range\n * - Clamps day to last day of target month if current day exceeds it",
    ],
    [
      "@param year 기준 연도\n * @param month 설정할 월 (1-12 범위 외의 값도 허용)\n * @param day 기준 일자\n * @returns 정규화된 연도, 월, 일",
      "@param year Base year\n * @param month Month to set (values outside 1-12 range are accepted)\n * @param day Base day\n * @returns Normalized year, month, day",
    ],
    [
      "// 월 오버플로우/언더플로우 정규화\n  // month가 1-12 범위를 벗어나면 연도를 조정",
      "// Normalize month overflow/underflow\n  // Adjust year if month is outside 1-12 range",
    ],
    [
      "// JavaScript % 연산자는 음수에서 음수를 반환하므로 (% 12 + 12) % 12 패턴으로 0-11 범위를 보장 후 1-12로 변환",
      "// JavaScript % operator returns negative for negative values, so use (% 12 + 12) % 12 pattern to ensure 0-11 range then convert to 1-12",
    ],
    ["// 대상 월의 마지막 날 구하기", "// Get last day of target month"],
    [
      "* 12시간제를 24시간제로 변환\n * - 오전 12시 = 0시, 오후 12시 = 12시\n * - 오전 1-11시 = 1-11시, 오후 1-11시 = 13-23시",
      "* Convert 12-hour to 24-hour format\n * - AM 12 = 0, PM 12 = 12\n * - AM 1-11 = 1-11, PM 1-11 = 13-23",
    ],
    [
      "@param rawHour 12시간제 시 (1-12)\n * @param isPM 오후 여부\n * @returns 24시간제 시 (0-23)",
      "@param rawHour 12-hour format hour (1-12)\n * @param isPM Whether PM\n * @returns 24-hour format hour (0-23)",
    ],
    [
      "//#region 정규식 캐싱 (모듈 로드 시 1회만 생성)",
      "//#region Regex caching (created once on module load)",
    ],
    [
      '* 포맷 패턴 정규식\n *\n * 순서 중요:\n * dtFormat() 함수에서 긴 패턴(yyyy, MM, dd 등)을 먼저 처리해야\n * 짧은 패턴(y, M, d 등)이 부분 매칭되는 것을 방지합니다.\n * 예: "yyyy"를 먼저 처리하지 않으면 "yy"가 두 번 매칭될 수 있음',
      '* Format pattern regex\n *\n * Order matters:\n * The dtFormat() function must process longer patterns (yyyy, MM, dd, etc.) first\n * to prevent shorter patterns (y, M, d, etc.) from partial matching.\n * e.g. Without processing "yyyy" first, "yy" could match twice',
    ],
    [
      "* 포맷 문자열에 따라 날짜/시간을 문자열로 변환한다",
      "* Convert date/time to string according to format string",
    ],
    [
      "@param formatString 포맷 문자열\n * @param args 날짜/시간 구성 요소",
      "@param formatString Format string\n * @param args Date/time components",
    ],
    ["* C#과 동일한 포맷 문자열을 지원한다:", "* Supports the same format strings as C#:"],
    ["| 포맷 | 설명 | 예시 |", "| Format | Description | Example |"],
    ["| yyyy | 4자리 연도 | 2024 |", "| yyyy | 4-digit year | 2024 |"],
    ["| yy | 2자리 연도 | 24 |", "| yy | 2-digit year | 24 |"],
    ["| MM | 0으로 패딩된 월 | 01~12 |", "| MM | Zero-padded month | 01~12 |"],
    ["| M | 월 | 1~12 |", "| M | Month | 1~12 |"],
    ["| ddd | 요일 (한글)", "| ddd | Day of week (Korean)"],
    ["| dd | 0으로 패딩된 일 | 01~31 |", "| dd | Zero-padded day | 01~31 |"],
    ["| d | 일 | 1~31 |", "| d | Day | 1~31 |"],
    ["| tt | 오전/오후", "| tt | AM/PM (Korean)"],
    ["| hh | 0으로 패딩된 12시간 | 01~12 |", "| hh | Zero-padded 12-hour | 01~12 |"],
    ["| h | 12시간 | 1~12 |", "| h | 12-hour | 1~12 |"],
    ["| HH | 0으로 패딩된 24시간 | 00~23 |", "| HH | Zero-padded 24-hour | 00~23 |"],
    ["| H | 24시간 | 0~23 |", "| H | 24-hour | 0~23 |"],
    ["| mm | 0으로 패딩된 분 | 00~59 |", "| mm | Zero-padded minute | 00~59 |"],
    ["| m | 분 | 0~59 |", "| m | Minute | 0~59 |"],
    ["| ss | 0으로 패딩된 초 | 00~59 |", "| ss | Zero-padded second | 00~59 |"],
    ["| s | 초 | 0~59 |", "| s | Second | 0~59 |"],
    ["| fff | 밀리초 (3자리) | 000~999 |", "| fff | Millisecond (3 digits) | 000~999 |"],
    ["| ff | 밀리초 (2자리) | 00~99 |", "| ff | Millisecond (2 digits) | 00~99 |"],
    ["| f | 밀리초 (1자리) | 0~9 |", "| f | Millisecond (1 digit) | 0~9 |"],
    ["| zzz | 타임존 오프셋 (±HH:mm) | +09:00 |", "| zzz | Timezone offset (±HH:mm) | +09:00 |"],
    ["| zz | 타임존 오프셋 (±HH) | +09 |", "| zz | Timezone offset (±HH) | +09 |"],
    ["| z | 타임존 오프셋 (±H) | +9 |", "| z | Timezone offset (±H) | +9 |"],
    ["// 연도", "// Year"],
    ["// 월", "// Month"],
    ["// 요일", "// Day of week"],
    ["// 일", "// Day"],
    ["// 시간", "// Hour"],
    ["// 분", "// Minute"],
    ["// 초", "// Second"],
    ["// 밀리초", "// Millisecond"],
    ["// 타임존", "// Timezone"],
  ],
  "packages/core-common/src/utils/error.ts": [
    [
      "* unknown 타입의 에러에서 메시지를 추출하는 유틸리티.\n *\n * Error 인스턴스이면 message 속성을, 아니면 String 변환을 반환한다.\n *\n * @param err - catch 블록의 unknown 에러\n * @returns 에러 메시지 문자열",
      "* Utility to extract message from unknown type errors.\n *\n * Returns the message property if it is an Error instance, otherwise returns String conversion.\n *\n * @param err - Unknown error from catch block\n * @returns Error message string",
    ],
  ],
  "packages/core-common/src/utils/json.ts": [
    [
      "* JSON 변환 유틸리티\n * 커스텀 타입(DateTime, DateOnly, Time, Uuid 등)을 지원하는 JSON 직렬화/역직렬화",
      "* JSON conversion utility\n * JSON serialization/deserialization with support for custom types (DateTime, DateOnly, Time, Uuid, etc.)",
    ],
    [
      "* 객체를 JSON 문자열로 직렬화\n * DateTime, DateOnly, Time, Uuid, Set, Map, Error, Uint8Array 등 커스텀 타입 지원",
      "* Serialize object to JSON string\n * Supports custom types including DateTime, DateOnly, Time, Uuid, Set, Map, Error, Uint8Array",
    ],
    [
      '@param obj 직렬화할 객체\n * @param options 직렬화 옵션\n * @param options.space JSON 들여쓰기 (숫자: 공백 수, 문자열: 들여쓰기 문자열)\n * @param options.replacer 커스텀 replacer 함수. 기본 타입 변환 전에 호출됨\n * @param options.redactBytes true 시 Uint8Array 내용을 "__hidden__"으로 대체 (로깅용). 이 옵션으로 직렬화한 결과는 jsonParse()로 원본 Uint8Array를 복원할 수 없음',
      '@param obj Object to serialize\n * @param options Serialization options\n * @param options.space JSON indentation (number: space count, string: indent string)\n * @param options.replacer Custom replacer function. Called before default type conversion\n * @param options.redactBytes When true, replaces Uint8Array content with "__hidden__" (for logging). Results serialized with this option cannot restore original Uint8Array via jsonParse()',
    ],
    [
      "* - 순환 참조가 있는 객체는 TypeError를 던짐\n * - 객체의 toJSON 메서드가 있으면 호출하여 결과를 사용함 (Date, DateTime 등 커스텀 타입 제외)\n * - 전역 프로토타입을 수정하지 않아 Worker 환경에서도 안전함",
      "* - Objects with circular references throw TypeError\n * - If an object has a toJSON method, it is called and the result is used (except custom types like Date, DateTime)\n * - Does not modify global prototypes, so it is safe in Worker environments",
    ],
    ["// 순환 참조 감지를 위한 WeakSet", "// WeakSet for circular reference detection"],
    [
      "* 재귀적으로 객체를 순회하며 특수 타입을 __type__ 형식으로 변환\n   *\n   * JSON.stringify의 replacer는 toJSON 호출 후의 값을 받으므로,\n   * Date 등의 타입을 올바르게 처리하려면 미리 변환해야 함.\n   * 이 방식은 전역 프로토타입을 수정하지 않아 Worker 환경에서도 안전함.\n   *\n   * @param key 현재 값의 키 (루트는 undefined)\n   * @param value 변환할 값",
      "* Recursively traverse object and convert special types to __type__ format\n   *\n   * Since JSON.stringify replacer receives values after toJSON is called,\n   * types like Date must be converted beforehand for correct handling.\n   * This approach does not modify global prototypes, so it is safe in Worker environments.\n   *\n   * @param key Key of current value (undefined for root)\n   * @param value Value to convert",
    ],
    ["// 커스텀 replacer 적용", "// Apply custom replacer"],
    ["// 배열 처리", "// Array handling"],
    ["// 순환 참조 감지", "// Circular reference detection"],
    ["// 일반 객체 처리", "// Plain object handling"],
    [
      "// toJSON 메서드가 있으면 호출 (Date, DateTime 등 커스텀 타입은 이미 위에서 처리됨)",
      "// Call toJSON method if present (custom types like Date, DateTime are already handled above)",
    ],
    ["// undefined는 JSON에서 제외됨", "// undefined is excluded from JSON"],
    [
      "// 전체 객체를 미리 변환 후 JSON.stringify 호출\n  // 이 방식은 Date.prototype.toJSON을 수정하지 않아 동시성 환경에서 안전함",
      "// Pre-convert entire object then call JSON.stringify\n  // This approach does not modify Date.prototype.toJSON, so it is safe in concurrent environments",
    ],
    [
      "* JSON 문자열을 객체로 역직렬화\n * DateTime, DateOnly, Time, Uuid, Set, Map, Error, Uint8Array 등 커스텀 타입 복원",
      "* Deserialize JSON string to object\n * Restores custom types including DateTime, DateOnly, Time, Uuid, Set, Map, Error, Uint8Array",
    ],
    [
      '* `__type__`과 `data` 키를 가진 객체는 타입 복원에 사용된다.\n * 사용자 데이터에 `{ __type__: "Date" | "DateTime" | "DateOnly" | "Time" | "Uuid" | "Set" | "Map" | "Error" | "Uint8Array", data: ... }`\n * 형태가 있으면 의도치 않게 타입 변환될 수 있으므로 주의한다.',
      '* Objects with `__type__` and `data` keys are used for type restoration.\n * Note that user data in the form `{ __type__: "Date" | "DateTime" | "DateOnly" | "Time" | "Uuid" | "Set" | "Map" | "Error" | "Uint8Array", data: ... }`\n * may be unintentionally converted.',
    ],
    [
      "* @security 개발 모드(`__DEV__`)에서만 에러 메시지에 JSON 문자열 전체가 포함된다.\n * 프로덕션 모드에서는 JSON 길이만 포함된다.",
      "* @security In development mode (`__DEV__`), the full JSON string is included in the error message.\n * In production mode, only the JSON length is included.",
    ],
    ["// __type__ 기반 타입 복원", "// Type restoration based on __type__"],
  ],
  "packages/core-common/src/utils/num.ts": [
    ["* 숫자 유틸리티 함수", "* Number utility functions"],
    [
      "* 문자열을 정수로 파싱\n * 숫자가 아닌 문자(0-9, -, . 제외)는 제거 후 파싱",
      "* Parse string to integer\n * Non-numeric characters (except 0-9, -, .) are removed before parsing",
    ],
    [
      "* @note 소수점이 포함된 문자열은 정수 부분만 반환됩니다 (예: '12.34' → 12).\n *       반올림이 필요하면 {@link numParseRoundedInt}를 사용하세요.\n * @note 문자열 중간의 `-`도 유지되므로 의도치 않은 음수가 될 수 있습니다.\n *       예: `\"가-123나\"` → `-123`",
      "* @note Strings with decimals return only the integer part (e.g. '12.34' -> 12).\n *       Use {@link numParseRoundedInt} if rounding is needed.\n * @note `-` in the middle of the string is preserved, which may result in unintended negatives.\n *       e.g. `\"A-123B\"` -> `-123`",
    ],
    [
      "* 문자열을 실수로 파싱 후 반올림하여 정수 반환",
      "* Parse string to float then round to integer",
    ],
    [
      "* 문자열을 실수로 파싱\n * 숫자가 아닌 문자는 제거 후 파싱",
      "* Parse string to float\n * Non-numeric characters are removed before parsing",
    ],
    [
      "* undefined, null, 0 체크 (타입 가드)\n *\n * 타입 가드로 동작하여, true 반환 시 `val`이 `0 | undefined`임을 보장합니다.\n * false 반환 시 `val`이 0이 아닌 유효한 숫자임이 보장됩니다.\n *\n * @param val 체크할 값\n * @returns undefined, null, 0이면 true",
      "* Check for undefined, null, or 0 (type guard)\n *\n * Acts as a type guard; when returning true, guarantees `val` is `0 | undefined`.\n * When returning false, guarantees `val` is a valid non-zero number.\n *\n * @param val Value to check\n * @returns true if undefined, null, or 0",
    ],
    ['*   console.log("비어있음");', '*   console.log("empty");'],
    ["*   console.log(`개수: ${count}`);", "*   console.log(`count: ${count}`);"],
    [
      "* 숫자를 천단위 구분자가 포함된 문자열로 포맷팅\n * @param val 포맷팅할 숫자\n * @param digit 소수점 자릿수 옵션\n * @param digit.max 최대 소수점 자릿수\n * @param digit.min 최소 소수점 자릿수 (부족하면 0으로 채움)",
      "* Format number as string with thousands separator\n * @param val Number to format\n * @param digit Decimal digit options\n * @param digit.max Maximum decimal digits\n * @param digit.min Minimum decimal digits (pads with 0 if insufficient)",
    ],
  ],
};
let totalFiles = 0;
let totalReplacements = 0;
for (const [rel, edits] of Object.entries(fileEdits)) {
  const filePath = BASE + "/" + rel;
  let content = fs.readFileSync(filePath, "utf-8");
  let count = 0;
  for (const [old, rep] of edits) {
    if (content.includes(old)) {
      content = content.replace(old, rep);
      count++;
    }
  }
  if (count > 0) {
    fs.writeFileSync(filePath, content, "utf-8");
    totalFiles++;
    totalReplacements += count;
    console.log(`Updated: ${rel} (${count} replacements)`);
  } else {
    console.log(`SKIPPED: ${rel} (no matches)`);
  }
}
console.log(`\nTotal: ${totalFiles} files, ${totalReplacements} replacements`);
