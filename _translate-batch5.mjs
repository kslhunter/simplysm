import fs from "fs";
const BASE = "D:/workspaces-13/simplysm";
const fileEdits = {
  "packages/core-common/src/utils/str.ts": [
    ["* 문자열 유틸리티 함수", "* String utility functions"],
    ["//#region 한글 조사 처리", "//#region Korean particle handling"],
    [
      "// 한글 조사 매핑 테이블 (모듈 로드 시 1회만 생성)",
      "// Korean particle mapping table (created once on module load)",
    ],
    [
      "* 한글 조사를 받침에 따라 적절히 반환\n * @param text 텍스트\n * @param type 조사 타입",
      "* Return appropriate Korean particle based on final consonant\n * @param text Text\n * @param type Particle type",
    ],
    [
      "// 빈 문자열 또는 마지막 글자가 한글이 아닌 경우 받침 없음으로 처리",
      "// Treat as no final consonant for empty string or non-Korean last character",
    ],
    ["// 한글 범위 체크 (0xAC00 ~ 0xD7A3)", "// Korean character range check (0xAC00 ~ 0xD7A3)"],
    [
      "// 받침 존재 여부 및 종성 인덱스 계산",
      "// Check final consonant existence and calculate jongseong index",
    ],
    [
      '// "로" 조사는 받침 ㄹ(종성 인덱스 8)일 때 "로"로 처리',
      '// Particle "ro" uses "ro" form when final consonant is rieul (jongseong index 8)',
    ],
    ["//#region 전각→반각 변환", "//#region Full-width to half-width conversion"],
    [
      "// 전각 → 반각 매핑 테이블 (모듈 로드 시 1회만 생성)",
      "// Full-width to half-width mapping table (created once on module load)",
    ],
    ["// 정규식도 1회만 생성", "// Regex is also created once"],
    [
      "* 전각(Full-width) 문자를 반각(Half-width) 문자로 변환\n *\n * 변환 대상:\n * - 전각 영문 대문자 (Ａ-Ｚ → A-Z)\n * - 전각 영문 소문자 (ａ-ｚ → a-z)\n * - 전각 숫자 (０-９ → 0-9)\n * - 전각 공백 (　 → 일반 공백)\n * - 전각 괄호 (（） → ())",
      "* Convert full-width characters to half-width characters\n *\n * Conversion targets:\n * - Full-width uppercase letters (A-Z -> A-Z)\n * - Full-width lowercase letters (a-z -> a-z)\n * - Full-width digits (0-9 -> 0-9)\n * - Full-width space (ideographic space -> regular space)\n * - Full-width parentheses (（） -> ())",
    ],
    ["//#region 케이스 변환", "//#region Case conversion"],
    ["* PascalCase로 변환", "* Convert to PascalCase"],
    ["* camelCase로 변환", "* Convert to camelCase"],
    ["* kebab-case로 변환", "* Convert to kebab-case"],
    ["* snake_case로 변환", "* Convert to snake_case"],
    ["//#region 기타", "//#region Miscellaneous"],
    [
      "* undefined 또는 빈 문자열 여부 체크 (타입 가드)\n *\n * @param str 체크할 문자열\n * @returns undefined, null, 빈 문자열이면 true",
      "* Check if undefined or empty string (type guard)\n *\n * @param str String to check\n * @returns true if undefined, null, or empty string",
    ],
    ['*   console.log("이름이 비어있습니다");', '*   console.log("name is empty");'],
    ["*   console.log(`이름: ${name}`);", "*   console.log(`name: ${name}`);"],
    [
      "* 문자열 특정 위치에 삽입\n *\n * @param str 원본 문자열\n * @param index 삽입할 위치 (0부터 시작)\n * @param insertString 삽입할 문자열\n * @returns 삽입된 새 문자열",
      "* Insert string at specific position\n *\n * @param str Original string\n * @param index Position to insert at (0-based)\n * @param insertString String to insert\n * @returns New string with insertion",
    ],
  ],
  "packages/core-common/src/utils/template-strings.ts": [
    [
      "* 템플릿 문자열 태그 함수들\n * IDE 코드 하이라이팅 지원용 (실제 동작은 문자열 조합 + 들여쓰기 정리)",
      "* Template string tag functions\n * For IDE code highlighting support (actual behavior is string concatenation + indent trimming)",
    ],
    [
      "* JavaScript 코드 하이라이팅용 템플릿 태그\n * @param strings 템플릿 문자열 배열\n * @param values 보간된 값들\n * @returns 들여쓰기가 정리된 문자열",
      "* Template tag for JavaScript code highlighting\n * @param strings Template string array\n * @param values Interpolated values\n * @returns String with trimmed indentation",
    ],
    [
      "* TypeScript 코드 하이라이팅용 템플릿 태그\n * @param strings 템플릿 문자열 배열\n * @param values 보간된 값들\n * @returns 들여쓰기가 정리된 문자열",
      "* Template tag for TypeScript code highlighting\n * @param strings Template string array\n * @param values Interpolated values\n * @returns String with trimmed indentation",
    ],
    [
      "* HTML 마크업 하이라이팅용 템플릿 태그\n * @param strings 템플릿 문자열 배열\n * @param values 보간된 값들\n * @returns 들여쓰기가 정리된 문자열",
      "* Template tag for HTML markup highlighting\n * @param strings Template string array\n * @param values Interpolated values\n * @returns String with trimmed indentation",
    ],
    [
      "* MSSQL T-SQL 하이라이팅용 템플릿 태그\n * @param strings 템플릿 문자열 배열\n * @param values 보간된 값들\n * @returns 들여쓰기가 정리된 문자열",
      "* Template tag for MSSQL T-SQL highlighting\n * @param strings Template string array\n * @param values Interpolated values\n * @returns String with trimmed indentation",
    ],
    [
      "* MySQL SQL 하이라이팅용 템플릿 태그\n * @param strings 템플릿 문자열 배열\n * @param values 보간된 값들\n * @returns 들여쓰기가 정리된 문자열",
      "* Template tag for MySQL SQL highlighting\n * @param strings Template string array\n * @param values Interpolated values\n * @returns String with trimmed indentation",
    ],
    [
      "* PostgreSQL SQL 하이라이팅용 템플릿 태그\n * @param strings 템플릿 문자열 배열\n * @param values 보간된 값들\n * @returns 들여쓰기가 정리된 문자열",
      "* Template tag for PostgreSQL SQL highlighting\n * @param strings Template string array\n * @param values Interpolated values\n * @returns String with trimmed indentation",
    ],
    [
      "// 첫/마지막 빈 줄 제거 (연속된 빈 줄 모두 제거)",
      "// Remove first/last empty lines (remove all consecutive empty lines)",
    ],
    ["// 최소 들여쓰기 계산", "// Calculate minimum indentation"],
    ["// 들여쓰기 제거", "// Remove indentation"],
  ],
  "packages/core-common/src/utils/transferable.ts": [
    [
      "* Worker 간 전송 가능한 객체 타입\n *\n * 이 코드에서는 ArrayBuffer만 사용됩니다.",
      "* Transferable object type between Workers\n *\n * Only ArrayBuffer is used in this code.",
    ],
    [
      "* Transferable 변환 유틸리티 함수\n *\n * Worker 간 데이터 전송을 위한 직렬화/역직렬화를 수행합니다.\n * structuredClone이 지원하지 않는 커스텀 타입들을 처리합니다.",
      "* Transferable conversion utility functions\n *\n * Performs serialization/deserialization for data transfer between Workers.\n * Handles custom types not supported by structuredClone.",
    ],
    [
      "* 지원 타입:\n * - Date, DateTime, DateOnly, Time, Uuid, RegExp\n * - Error (cause, code, detail 포함)\n * - Uint8Array (다른 TypedArray는 미지원, 일반 객체로 처리됨)\n * - Array, Map, Set, 일반 객체",
      "* Supported types:\n * - Date, DateTime, DateOnly, Time, Uuid, RegExp\n * - Error (including cause, code, detail)\n * - Uint8Array (other TypedArrays not supported, treated as plain objects)\n * - Array, Map, Set, plain objects",
    ],
    [
      "* @note 순환 참조가 있으면 transferableEncode 시 TypeError 발생 (경로 정보 포함)\n * @note 동일 객체가 여러 곳에서 참조되면 캐시된 인코딩 결과를 재사용합니다",
      "* @note Circular references cause TypeError during transferableEncode (with path info)\n * @note When the same object is referenced from multiple places, cached encoding results are reused",
    ],
    ["// Worker로 데이터 전송", "// Transfer data to Worker"],
    ["// Worker에서 데이터 수신", "// Receive data from Worker"],
    [
      "* 심플리즘 타입을 사용한 객체를 일반 객체로 변환\n * Worker에 전송할 수 있는 형태로 직렬화\n *\n * @throws 순환 참조 감지 시 TypeError",
      "* Convert object using Simplysm types to plain object\n * Serialize into a form transferable to Worker\n *\n * @throws TypeError when circular reference is detected",
    ],
    ["// 객체 타입 처리: 순환 감지 + 캐시", "// Object type handling: circular detection + cache"],
    [
      "// 순환 참조 감지 (현재 재귀 스택에 있는 객체)",
      "// Circular reference detection (objects in current recursion stack)",
    ],
    ["// 캐시 히트 → 이전 인코딩 결과 재사용", "// Cache hit -> reuse previous encoding result"],
    ["// 재귀 스택에 추가", "// Add to recursion stack"],
    [
      "// SharedArrayBuffer는 이미 공유 메모리이므로 transferList에 추가하지 않음\n      // ArrayBuffer만 transferList에 추가",
      "// SharedArrayBuffer is already shared memory, so not added to transferList\n      // Only ArrayBuffer is added to transferList",
    ],
    [
      "// 2. 특수 타입 변환 (JSON.stringify 없이 구조체로 변환)",
      "// 2. Special type conversion (convert to struct without JSON.stringify)",
    ],
    ["// 3. 배열 재귀 순회", "// 3. Recursive array traversal"],
    ["// 4. Map 재귀 순회", "// 4. Recursive Map traversal"],
    ["// 5. Set 재귀 순회", "// 5. Recursive Set traversal"],
    ["// 6. 일반 객체 재귀 순회", "// 6. Recursive plain object traversal"],
    ["// 7. 원시 타입", "// 7. Primitive types"],
    ["// 캐시 저장 (성공 시에만)", "// Save to cache (only on success)"],
    [
      "// 재귀 스택에서 제거 (예외 시에도 반드시 실행)",
      "// Remove from recursion stack (must execute even on exception)",
    ],
    [
      "* serialize 객체를 심플리즘 타입 사용 객체로 변환\n * Worker로부터 받은 데이터를 역직렬화",
      "* Convert serialized object to object using Simplysm types\n * Deserialize data received from Worker",
    ],
    ["// 1. 특수 타입 복원", "// 1. Restore special types"],
    ["// 2. 배열 재귀 (새 배열 생성)", "// 2. Recursive array (create new array)"],
    ["// 3. Map 재귀", "// 3. Recursive Map"],
    ["// 4. Set 재귀", "// 4. Recursive Set"],
    ["// 5. 객체 재귀 (새 객체 생성)", "// 5. Recursive object (create new object)"],
  ],
  "packages/core-common/src/utils/wait.ts": [
    ["* 대기 유틸리티 함수", "* Wait utility functions"],
    [
      "* 조건이 참이 될 때까지 대기\n * @param forwarder 조건 함수\n * @param milliseconds 체크 간격 (기본: 100ms)\n * @param maxCount 최대 시도 횟수 (undefined면 무제한)\n *\n * @note 조건이 첫 번째 호출에서 true면 즉시 반환됩니다.\n * @example\n * // maxCount=3: 최대 3번 조건 확인 후 모두 false면 TimeoutError\n * await waitUntil(() => someCondition, 100, 3);\n * @throws TimeoutError 최대 시도 횟수 초과 시",
      "* Wait until condition becomes true\n * @param forwarder Condition function\n * @param milliseconds Check interval (default: 100ms)\n * @param maxCount Maximum retry count (unlimited if undefined)\n *\n * @note Returns immediately if condition is true on first call.\n * @example\n * // maxCount=3: check condition up to 3 times, throws TimeoutError if all false\n * await waitUntil(() => someCondition, 100, 3);\n * @throws TimeoutError When maximum retry count is exceeded",
    ],
    [
      "* 지정된 시간만큼 대기\n * @param millisecond 대기 시간 (ms)",
      "* Wait for specified duration\n * @param millisecond Wait time (ms)",
    ],
  ],
  "packages/core-common/src/utils/xml.ts": [
    ["* XML 변환 유틸리티", "* XML conversion utility"],
    [
      "* XML 문자열을 객체로 파싱\n * @param str XML 문자열\n * @param options 옵션\n * @param options.stripTagPrefix 태그 prefix 제거 여부 (namespace)\n * @returns 파싱된 객체. 구조:\n *   - 속성: `$` 객체에 그룹화\n *   - 텍스트 노드: `_` 키에 저장\n *   - 자식 요소: 배열로 변환 (루트 요소 제외)",
      "* Parse XML string to object\n * @param str XML string\n * @param options Options\n * @param options.stripTagPrefix Whether to strip tag prefix (namespace)\n * @returns Parsed object. Structure:\n *   - Attributes: grouped in `$` object\n *   - Text nodes: stored in `_` key\n *   - Child elements: converted to arrays (except root element)",
    ],
    [
      "* 객체를 XML 문자열로 직렬화\n * @param obj 직렬화할 객체\n * @param options fast-xml-parser XmlBuilderOptions (선택)\n * @returns XML 문자열",
      "* Serialize object to XML string\n * @param obj Object to serialize\n * @param options fast-xml-parser XmlBuilderOptions (optional)\n * @returns XML string",
    ],
    [
      '* 태그 이름에서 namespace prefix 제거\n * @note XML 파싱 결과에서 "ns:tag" 형태의 namespace prefix를 제거하여 태그 이름만 남긴다.\n *       이를 통해 namespace를 고려하지 않고 일관된 방식으로 XML 데이터에 접근할 수 있다.\n *       단, 속성(attribute)은 prefix를 유지한다.',
      '* Remove namespace prefix from tag names\n * @note Removes "ns:tag" style namespace prefix from XML parse results, leaving only tag names.\n *       This allows consistent access to XML data without considering namespaces.\n *       However, attributes retain their prefix.',
    ],
    [
      "// Attribute는 prefix를 제거하면 안 된다.",
      "// Attributes must not have their prefix removed.",
    ],
    [
      '// 태그 이름에서만 첫 번째 ":"을 기준으로 prefix 제거',
      '// Remove prefix only from tag names based on first ":"',
    ],
  ],
  "packages/core-common/src/zip/sd-zip.ts": [
    ["* ZIP 파일 처리 유틸리티", "* ZIP file processing utility"],
    [
      "* ZIP 아카이브 처리 클래스\n *\n * ZIP 파일의 읽기, 쓰기, 압축/해제를 처리합니다.\n * 내부 캐시를 사용하여 동일 파일의 중복 압축 해제를 방지합니다.",
      "* ZIP archive processing class\n *\n * Handles reading, writing, compression/decompression of ZIP files.\n * Uses internal cache to prevent duplicate decompression of the same file.",
    ],
    ["// ZIP 파일 읽기", "// Read ZIP file"],
    ["// ZIP 파일 생성", "// Create ZIP file"],
    ["// 전체 압축 해제 (진행률 표시)", "// Extract all (with progress)"],
    [
      "* ZipArchive 생성\n   * @param data ZIP 데이터 (생략 시 새 아카이브 생성)",
      "* Create ZipArchive\n   * @param data ZIP data (creates new archive when omitted)",
    ],
    [
      "* 모든 파일을 압축 해제\n   * @param progressCallback 진행률 콜백",
      "* Extract all files\n   * @param progressCallback Progress callback",
    ],
    ["// 압축 해제 대상 크기 총합 계산", "// Calculate total size of extraction targets"],
    ["// 개별 파일이 끝나면 누적 처리", "// Accumulate when individual file is done"],
    [
      "* 특정 파일 압축 해제\n   * @param fileName 파일 이름",
      "* Extract specific file\n   * @param fileName File name",
    ],
    [
      "* 파일 존재 여부 확인\n   * @param fileName 파일 이름",
      "* Check file existence\n   * @param fileName File name",
    ],
    [
      "* 파일 쓰기 (캐시에 저장)\n   * @param fileName 파일 이름\n   * @param bytes 파일 내용",
      "* Write file (store in cache)\n   * @param fileName File name\n   * @param bytes File content",
    ],
    [
      "* 캐시된 파일들을 ZIP으로 압축\n   *\n   * @remarks\n   * 내부적으로 `extractAll()`을 호출하여 모든 파일을 메모리에 로드한 후 압축합니다.\n   * 대용량 ZIP 파일의 경우 메모리 사용량에 주의가 필요합니다.",
      "* Compress cached files to ZIP\n   *\n   * @remarks\n   * Internally calls `extractAll()` to load all files into memory before compressing.\n   * Be mindful of memory usage for large ZIP files.",
    ],
    ["* 리더 닫기 및 캐시 정리", "* Close reader and clear cache"],
    ["* await using 지원", "* Support for await using"],
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
