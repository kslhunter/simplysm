import fs from "fs";
const BASE = "D:/workspaces-13/simplysm";
const fileEdits = {
  "packages/core-common/src/types/lazy-gc-map.ts": [
    [
      "* 자동 만료 기능이 있는 Map\n * LRU 방식으로 접근 시간 갱신, 일정 시간 미접근 시 자동 삭제",
      "* Map with auto-expiration\n * Refreshes access time on LRU basis, auto-deletes after a period of inactivity",
    ],
    [
      "* @note 인스턴스 사용 후 반드시 dispose()를 호출하거나 using 문을 사용해야 함.\n *       그렇지 않으면 GC 타이머가 계속 동작하여 메모리 누수 발생.",
      "* @note You must call dispose() or use a using statement after using the instance.\n *       Otherwise the GC timer keeps running, causing a memory leak.",
    ],
    ["// using 문 사용 (권장)", "// Using statement (recommended)"],
    ["// 또는 명시적 dispose() 호출", "// Or explicit dispose() call"],
    ["// ... 사용", "// ... use"],
    [
      "// 실제 데이터와 마지막 접근 시간을 함께 저장",
      "// Store actual data along with last access time",
    ],
    ["// GC 타이머", "// GC timer"],
    ["// GC 실행 중 플래그 (중복 실행 방지)", "// GC running flag (prevents duplicate execution)"],
    ["// destroy 호출 여부", "// Whether destroy has been called"],
    ["@param _options 설정 옵션", "@param _options Configuration options"],
    [
      "@param _options.gcInterval GC 주기 (밀리초). 기본값: expireTime의 1/10 (최소 1000ms)",
      "@param _options.gcInterval GC interval (milliseconds). Default: 1/10 of expireTime (minimum 1000ms)",
    ],
    [
      "@param _options.expireTime 만료 시간 (밀리초). 마지막 접근 후 이 시간이 지나면 삭제됨. 예: 60000 (60초)",
      "@param _options.expireTime Expiration time (milliseconds). Deleted after this time since last access. e.g. 60000 (60s)",
    ],
    [
      "@param _options.onExpire 만료 시 호출되는 콜백. 비동기 함수도 가능하며, 에러 발생 시 로깅 후 계속 진행됨",
      "@param _options.onExpire Callback invoked on expiration. Async functions are supported; errors are logged and execution continues",
    ],
    ["/** 저장된 항목 수 */", "/** Number of stored entries */"],
    [
      "/** 키 존재 여부 확인 (접근 시간 갱신 안함) */",
      "/** Check key existence (does not refresh access time) */",
    ],
    ["/** 값 조회 (접근 시간 갱신됨) */", "/** Get value (refreshes access time) */"],
    ["// 접근 시 시간 갱신 (LRU)", "// Refresh time on access (LRU)"],
    [
      "/** 값 저장 (접근 시간 설정 및 GC 타이머 시작) */",
      "/** Store value (sets access time and starts GC timer) */",
    ],
    ["// 데이터가 들어왔으므로 GC 타이머 가동", "// Data has been added, start GC timer"],
    ["/** 항목 삭제 (비었으면 GC 타이머 중지) */", "/** Delete entry (stops GC timer if empty) */"],
    ["// 비었으면 타이머 중지", "// Stop timer if empty"],
    [
      "/** 인스턴스 정리 (GC 타이머 중지 및 데이터 삭제) */",
      "/** Dispose instance (stops GC timer and clears data) */",
    ],
    ["/** using 문 지원 */", "/** Support for using statement */"],
    [
      "* 모든 항목 삭제 (인스턴스는 계속 사용 가능)",
      "* Clear all entries (instance remains usable)",
    ],
    [
      "* 키에 해당하는 값을 반환하고, 없으면 factory로 생성 후 저장하여 반환\n   * @param key 조회할 키\n   * @param factory 키가 없을 때 값을 생성하는 함수\n   * @returns 기존 값 또는 새로 생성된 값",
      "* Return value for key, or create via factory, store, and return\n   * @param key Key to look up\n   * @param factory Function to create value when key is absent\n   * @returns Existing value or newly created value",
    ],
    ["/** 값들만 순회 (Iterator) */", "/** Iterate over values only (Iterator) */"],
    ["/** 키들만 순회 (Iterator) */", "/** Iterate over keys only (Iterator) */"],
    ["/** 엔트리 순회 (Iterator) */", "/** Iterate over entries (Iterator) */"],
    ["//#region GC 로직", "//#region GC logic"],
    [
      "// 이미 실행 중이면 스킵 (onExpire 콜백이 오래 걸리는 경우 중복 실행 방지)",
      "// Skip if already running (prevents duplicate execution when onExpire callback takes long)",
    ],
    ["// 1. 만료된 항목 수집 (삭제 전)", "// 1. Collect expired entries (before deletion)"],
    ["// 2. 각 항목에 대해 콜백 실행 후 삭제", "// 2. Execute callback then delete for each entry"],
    [
      "// 콜백 실행 전 현재 상태 확인 (이미 다른 값으로 교체되었거나 삭제되었으면 스킵)",
      "// Check current state before callback (skip if already replaced or deleted)",
    ],
    ["// 만료 콜백 실행", "// Execute expiration callback"],
    [
      "// 콜백 후 재등록 여부 확인\n        // 시나리오: onExpire 콜백에서 동일 키로 새 값을 set()한 경우,\n        // 새로 등록된 항목을 삭제하면 안 됨. item 참조가 같으면 재등록되지 않은 것이므로 삭제 진행.",
      "// Check if re-registered after callback\n        // Scenario: if onExpire callback called set() with the same key,\n        // the newly registered entry must not be deleted. If item reference is the same, it was not re-registered, so proceed with deletion.",
    ],
    ["// GC 후 비었으면 끄기", "// Turn off if empty after GC"],
  ],
  "packages/core-common/src/types/time.ts": [
    [
      "* 시간 클래스 (날짜제외: HH:mm:ss.fff, 불변)\n *\n * 날짜 정보 없이 시간만 저장하는 불변 클래스이다.\n * 24시간을 초과하거나 음수인 경우 자동으로 정규화된다.",
      "* Time class (time only: HH:mm:ss.fff, immutable)\n *\n * An immutable class that stores only time without date information.\n * Values exceeding 24 hours or negative values are automatically normalized.",
    ],
    ["/** 현재 시간으로 생성 */", "/** Create with current time */"],
    ["/** 시분초밀리초로 생성 */", "/** Create with hour, minute, second, millisecond */"],
    ["/** tick (밀리초)으로 생성 */", "/** Create with tick (milliseconds) */"],
    [
      "/** Date 객체에서 시간 부분만 추출하여 생성 */",
      "/** Create by extracting time part from Date object */",
    ],
    [
      "* 문자열을 파싱하여 Time 인스턴스를 생성\n   *\n   * @param str 시간 문자열\n   * @returns 파싱된 Time 인스턴스\n   * @throws ArgumentError 지원하지 않는 형식인 경우",
      "* Parse a string to create a Time instance\n   *\n   * @param str Time string\n   * @returns Parsed Time instance\n   * @throws ArgumentError If the format is not supported",
    ],
    [
      "// ISO 8601 형식 (예: 2025-01-15T10:30:00.123Z, 2025-01-15T10:30:00+09:00)\n    // Date 객체를 사용하여 타임존 변환 처리",
      "// ISO 8601 format (e.g. 2025-01-15T10:30:00.123Z, 2025-01-15T10:30:00+09:00)\n    // Use Date object for timezone conversion",
    ],
    ["//#region Getters (읽기 전용)", "//#region Getters (read-only)"],
    ["/** 시간 세팅이 제대로 되었는지 여부 */", "/** Whether the time is properly set */"],
    [
      "//#region 불변 변환 메서드 (새 인스턴스 반환)",
      "//#region Immutable transformation methods (returns new instance)",
    ],
    ["/** 지정된 시로 새 인스턴스 반환 */", "/** Return new instance with specified hour */"],
    ["/** 지정된 분으로 새 인스턴스 반환 */", "/** Return new instance with specified minute */"],
    ["/** 지정된 초로 새 인스턴스 반환 */", "/** Return new instance with specified second */"],
    [
      "/** 지정된 밀리초로 새 인스턴스 반환 */",
      "/** Return new instance with specified millisecond */",
    ],
    [
      "//#region 산술 메서드 (새 인스턴스 반환)",
      "//#region Arithmetic methods (returns new instance)",
    ],
    [
      "/** 지정된 시간을 더한 새 인스턴스 반환 (24시간 순환) */",
      "/** Return new instance with added hours (24-hour wraparound) */",
    ],
    [
      "/** 지정된 분을 더한 새 인스턴스 반환 (24시간 순환) */",
      "/** Return new instance with added minutes (24-hour wraparound) */",
    ],
    [
      "/** 지정된 초를 더한 새 인스턴스 반환 (24시간 순환) */",
      "/** Return new instance with added seconds (24-hour wraparound) */",
    ],
    [
      "/** 지정된 밀리초를 더한 새 인스턴스 반환 (24시간 순환) */",
      "/** Return new instance with added milliseconds (24-hour wraparound) */",
    ],
    ["//#region 포맷팅", "//#region Formatting"],
    [
      "* 지정된 포맷으로 문자열 변환\n   * @param format 포맷 문자열\n   * @see dtFormat 지원 포맷 문자열 참조",
      "* Convert to string with specified format\n   * @param format Format string\n   * @see dtFormat See supported format strings",
    ],
  ],
  "packages/core-common/src/types/uuid.ts": [
    [
      "* UUID v4 클래스\n *\n * crypto.getRandomValues 기반으로 암호학적으로 안전한 UUID를 생성한다. (Chrome 79+, Node.js 공용)",
      "* UUID v4 class\n *\n * Generates cryptographically secure UUIDs based on crypto.getRandomValues. (Chrome 79+, Node.js compatible)",
    ],
    [
      "// 0x00 ~ 0xFF에 대한 hex 문자열 미리 계산 (256개)",
      "// Pre-computed hex strings for 0x00 ~ 0xFF (256 entries)",
    ],
    ["/** 16바이트 배열을 UUID 문자열로 변환 */", "/** Convert 16-byte array to UUID string */"],
    ["/** 새 UUID v4 인스턴스 생성 */", "/** Create a new UUID v4 instance */"],
    ["// UUID v4 설정", "// UUID v4 configuration"],
    [
      "* 16바이트 Uint8Array에서 UUID 생성\n   * @param bytes 16바이트 배열\n   * @throws {ArgumentError} 바이트 크기가 16이 아닌 경우",
      "* Create UUID from 16-byte Uint8Array\n   * @param bytes 16-byte array\n   * @throws {ArgumentError} If byte length is not 16",
    ],
    [
      "* @param uuid UUID 문자열 (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx 형식)\n   * @throws {ArgumentError} 형식이 올바르지 않은 경우",
      "* @param uuid UUID string (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx format)\n   * @throws {ArgumentError} If the format is invalid",
    ],
    ["/** UUID를 문자열로 변환 */", "/** Convert UUID to string */"],
    ["/** UUID를 16바이트 Uint8Array로 변환 */", "/** Convert UUID to 16-byte Uint8Array */"],
    [
      "// UUID 형식: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (8-4-4-4-12)\n    // 하이픈 위치: 8, 13, 18, 23",
      "// UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (8-4-4-4-12)\n    // Hyphen positions: 8, 13, 18, 23",
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
