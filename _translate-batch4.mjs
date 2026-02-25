import fs from "fs";
const BASE = "D:/workspaces-13/simplysm";
const fileEdits = {
  "packages/core-common/src/utils/obj.ts": [
    [
      "* 깊은 복사\n * - 순환 참조 지원\n * - 커스텀 타입(DateTime, DateOnly, Time, Uuid, Uint8Array) 복사 지원\n *\n * @note 함수, Symbol은 복사되지 않고 참조가 유지됨\n * @note WeakMap, WeakSet은 지원되지 않음 (일반 객체로 복사되어 빈 객체가 됨)\n * @note 프로토타입 체인은 유지됨 (Object.setPrototypeOf 사용)\n * @note getter/setter는 현재 값으로 평가되어 복사됨 (접근자 속성 자체는 복사되지 않음)",
      "* Deep clone\n * - Supports circular references\n * - Supports custom types (DateTime, DateOnly, Time, Uuid, Uint8Array)\n *\n * @note Functions and Symbols are not cloned; references are preserved\n * @note WeakMap, WeakSet are not supported (cloned as plain objects, resulting in empty objects)\n * @note Prototype chain is preserved (uses Object.setPrototypeOf)\n * @note Getters/setters are evaluated to their current values (accessor properties themselves are not cloned)",
    ],
    ["// primitive는 그대로 반환", "// Return primitives as-is"],
    [
      "// Immutable-like 타입들 (내부에 object 참조 없음)",
      "// Immutable-like types (no internal object references)",
    ],
    [
      "// 순환 참조 체크 (Error 포함 모든 object 타입에 적용)",
      "// Circular reference check (applies to all object types including Error)",
    ],
    [
      "// Error (cause 포함)\n  // 생성자 호출 대신 프로토타입 기반 복사 - 커스텀 Error 클래스 호환성 보장",
      "// Error (including cause)\n  // Prototype-based copy instead of constructor call - ensures custom Error class compatibility",
    ],
    ["// 커스텀 Error 속성 복사", "// Copy custom Error properties"],
    ["// 기타 Object", "// Other Object"],
    ["/** objEqual 옵션 타입 */", "/** objEqual options type */"],
    [
      "/** 비교할 키 목록. 지정 시 해당 키만 비교 (최상위 레벨에만 적용) */",
      "/** List of keys to compare. When specified, only these keys are compared (applies to top level only) */",
    ],
    [
      "/** 비교에서 제외할 키 목록 (최상위 레벨에만 적용) */",
      "/** List of keys to exclude from comparison (applies to top level only) */",
    ],
    [
      "/** 배열 순서 무시 여부. true 시 O(n²) 복잡도 */",
      "/** Whether to ignore array order. O(n^2) complexity when true */",
    ],
    [
      "/** 얕은 비교 여부. true 시 1단계만 비교 (참조 비교) */",
      "/** Whether to use shallow comparison. When true, compares only one level (reference comparison) */",
    ],
    [
      "* 깊은 비교\n *\n * @param source 비교 대상 1\n * @param target 비교 대상 2\n * @param options 비교 옵션\n * @param options.topLevelIncludes 비교할 키 목록. 지정 시 해당 키만 비교 (최상위 레벨에만 적용)",
      "* Deep equality comparison\n *\n * @param source Comparison target 1\n * @param target Comparison target 2\n * @param options Comparison options\n * @param options.topLevelIncludes List of keys to compare. When specified, only these keys are compared (applies to top level only)",
    ],
    [
      '*   @example `{ topLevelIncludes: ["id", "name"] }` - id, name 키만 비교\n * @param options.topLevelExcludes 비교에서 제외할 키 목록 (최상위 레벨에만 적용)\n *   @example `{ topLevelExcludes: ["updatedAt"] }` - updatedAt 키를 제외하고 비교\n * @param options.ignoreArrayIndex 배열 순서 무시 여부. true 시 O(n²) 복잡도\n * @param options.onlyOneDepth 얕은 비교 여부. true 시 1단계만 비교 (참조 비교)',
      '*   @example `{ topLevelIncludes: ["id", "name"] }` - compare only id, name keys\n * @param options.topLevelExcludes List of keys to exclude from comparison (applies to top level only)\n *   @example `{ topLevelExcludes: ["updatedAt"] }` - compare excluding updatedAt key\n * @param options.ignoreArrayIndex Whether to ignore array order. O(n^2) complexity when true\n * @param options.onlyOneDepth Whether to use shallow comparison. When true, compares only one level (reference comparison)',
    ],
    [
      "* @note topLevelIncludes/topLevelExcludes 옵션은 object 속성 키에만 적용됨.\n *       Map의 모든 키는 항상 비교에 포함됨.\n * @note 성능 고려사항:\n * - 기본 배열 비교: O(n) 시간 복잡도\n * - `ignoreArrayIndex: true` 사용 시: O(n²) 시간 복잡도\n *   (대용량 배열에서 성능 저하 가능)\n * @note `ignoreArrayIndex: true` 동작 특성:\n * - 배열 순서를 무시하고 동일한 요소들의 순열인지 비교\n * - 예: `[1,2,3]`과 `[3,2,1]` → true, `[1,1,1]`과 `[1,2,3]` → false",
      "* @note topLevelIncludes/topLevelExcludes options apply only to object property keys.\n *       All Map keys are always included in comparison.\n * @note Performance considerations:\n * - Default array comparison: O(n) time complexity\n * - With `ignoreArrayIndex: true`: O(n^2) time complexity\n *   (may cause performance degradation on large arrays)\n * @note `ignoreArrayIndex: true` behavior:\n * - Compares whether arrays are permutations of the same elements, ignoring order\n * - e.g. `[1,2,3]` and `[3,2,1]` -> true, `[1,1,1]` and `[1,2,3]` -> false",
    ],
    [
      "// 재귀 호출 시 topLevelIncludes/topLevelExcludes 옵션은 최상위 레벨에만 적용되므로 제외",
      "// Exclude topLevelIncludes/topLevelExcludes in recursive calls as they apply only to top level",
    ],
    [
      "* Map 객체 비교\n * @note 비문자열 키(객체, 배열 등) 처리 시 O(n²) 복잡도 발생\n * @note 대량 데이터의 경우 onlyOneDepth: true 옵션 사용 권장 (참조 비교로 O(n)으로 개선)",
      "* Map object comparison\n * @note O(n^2) complexity when handling non-string keys (objects, arrays, etc.)\n * @note For large data, using onlyOneDepth: true is recommended (improves to O(n) with reference comparison)",
    ],
    [
      "// Map 비교 시 topLevelIncludes/topLevelExcludes 옵션은 무시됨 (object 속성 키에만 적용)",
      "// topLevelIncludes/topLevelExcludes options are ignored for Map comparison (applies only to object property keys)",
    ],
    ["// 문자열 키: 직접 비교", "// String key: direct comparison"],
    [
      "// 비문자열 키: targetKeys에서 동등한 키 찾기",
      "// Non-string key: find equivalent key in targetKeys",
    ],
    [
      "* Set 깊은 비교\n * @note deep equal 비교(`onlyOneDepth: false`)는 O(n²) 시간 복잡도를 가짐.\n *   primitive Set이나 성능이 중요한 경우 `onlyOneDepth: true` 사용 권장",
      "* Set deep comparison\n * @note Deep equal comparison (`onlyOneDepth: false`) has O(n^2) time complexity.\n *   For primitive Sets or when performance matters, using `onlyOneDepth: true` is recommended",
    ],
    [
      "// deep equal: target 배열을 루프 외부에서 1회만 생성\n    // 매칭된 인덱스를 추적하여 중복 매칭 방지",
      "// deep equal: create target array once outside loop\n    // Track matched indices to prevent duplicate matching",
    ],
    ["/** objMerge 옵션 타입 */", "/** objMerge options type */"],
    [
      '/** 배열 처리 방식. "replace": target으로 대체(기본), "concat": 합침(중복 제거) */',
      '/** Array processing mode. "replace": replace with target (default), "concat": merge (deduplicated) */',
    ],
    [
      "/** target이 null일 때 해당 키 삭제 여부 */",
      "/** Whether to delete the key when target is null */",
    ],
    [
      "* 깊은 병합 (source를 base로 target을 병합)",
      "* Deep merge (merge target into source as base)",
    ],
    [
      '* @param source 기준 객체\n * @param target 병합할 객체\n * @param opt 병합 옵션\n * @param opt.arrayProcess 배열 처리 방식\n *   - `"replace"`: target 배열로 대체 (기본값)\n *   - `"concat"`: source와 target 배열을 합침 (Set으로 중복 제거)\n * @param opt.useDelTargetNull target 값이 null일 때 해당 키 삭제 여부\n *   - `true`: target이 null이면 결과에서 해당 키 삭제\n *   - `false` 또는 미지정: source 값 유지',
      '* @param source Base object\n * @param target Object to merge\n * @param opt Merge options\n * @param opt.arrayProcess Array processing mode\n *   - `"replace"`: replace with target array (default)\n *   - `"concat"`: merge source and target arrays (deduplication via Set)\n * @param opt.useDelTargetNull Whether to delete the key when target value is null\n *   - `true`: delete the key from result when target is null\n *   - `false` or unspecified: preserve source value',
    ],
    [
      '* @note 원본 객체를 수정하지 않고 새 객체를 반환함 (불변성 보장)\n * @note arrayProcess="concat" 사용 시 Set을 통해 중복을 제거하며,\n *       객체 배열의 경우 참조(주소) 비교로 중복을 판단함\n * @note 타입이 다른 경우 target 값으로 덮어씀',
      '* @note Returns a new object without modifying the original (immutability guaranteed)\n * @note When using arrayProcess="concat", duplicates are removed via Set,\n *       and for object arrays, duplicates are determined by reference comparison\n * @note When types differ, overwrites with the target value',
    ],
    [
      "// source가 object가 아니거나, source와 target이 다른 종류의 object면 target으로 덮어씀",
      "// If source is not an object, or source and target are different kinds of objects, overwrite with target",
    ],
    ["/** merge3 옵션 타입 */", "/** merge3 options type */"],
    [
      "/** 비교할 하위 키 목록 (equal의 topLevelIncludes와 동일) */",
      "/** List of sub-keys to compare (same as equal topLevelIncludes) */",
    ],
    ["/** 비교에서 제외할 하위 키 목록 */", "/** List of sub-keys to exclude from comparison */"],
    ["/** 배열 순서 무시 여부 */", "/** Whether to ignore array order */"],
    [
      "* 3-way 병합\n *\n * source, origin, target 세 객체를 비교하여 병합합니다.\n * - source와 origin이 같고 target이 다르면 → target 값 사용\n * - target과 origin이 같고 source가 다르면 → source 값 사용\n * - source와 target이 같으면 → 해당 값 사용\n * - 세 값이 모두 다르면 → 충돌 발생 (origin 값 유지)",
      "* 3-way merge\n *\n * Compares and merges three objects: source, origin, and target.\n * - If source equals origin but target differs -> use target value\n * - If target equals origin but source differs -> use source value\n * - If source equals target -> use that value\n * - If all three values differ -> conflict occurs (origin value preserved)",
    ],
    [
      "* @param source 변경된 버전 1\n * @param origin 기준 버전 (공통 조상)\n * @param target 변경된 버전 2\n * @param optionsObj 키별 비교 옵션. 각 키에 대해 equal() 비교 옵션을 개별 지정\n *   - `keys`: 비교할 하위 키 목록 (equal의 topLevelIncludes와 동일)\n *   - `excludes`: 비교에서 제외할 하위 키 목록\n *   - `ignoreArrayIndex`: 배열 순서 무시 여부\n * @returns conflict: 충돌 발생 여부, result: 병합 결과",
      "* @param source Modified version 1\n * @param origin Base version (common ancestor)\n * @param target Modified version 2\n * @param optionsObj Per-key comparison options. Specify equal() comparison options for each key\n *   - `keys`: list of sub-keys to compare (same as equal topLevelIncludes)\n *   - `excludes`: list of sub-keys to exclude from comparison\n *   - `ignoreArrayIndex`: whether to ignore array order\n * @returns conflict: whether conflict occurred, result: merge result",
    ],
    [
      "* 객체에서 특정 키들을 제외\n * @param item 원본 객체\n * @param omitKeys 제외할 키 배열\n * @returns 지정된 키가 제외된 새 객체",
      "* Exclude specific keys from object\n * @param item Original object\n * @param omitKeys Array of keys to exclude\n * @returns New object with specified keys excluded",
    ],
    [
      "* 조건에 맞는 키들을 제외\n * @internal\n * @param item 원본 객체\n * @param omitKeyFn 키를 받아 제외 여부를 반환하는 함수 (true면 제외)\n * @returns 조건에 맞는 키가 제외된 새 객체",
      "* Exclude keys matching a condition\n * @internal\n * @param item Original object\n * @param omitKeyFn Function that receives a key and returns whether to exclude (true to exclude)\n * @returns New object with matching keys excluded",
    ],
    [
      "* 객체에서 특정 키들만 선택\n * @param item 원본 객체\n * @param keys 선택할 키 배열\n * @returns 지정된 키만 포함된 새 객체",
      "* Select specific keys from object\n * @param item Original object\n * @param keys Array of keys to select\n * @returns New object containing only specified keys",
    ],
    ["// 정규식 캐싱 (모듈 로드 시 1회만 생성)", "// Regex caching (created once on module load)"],
    ["* 체인 경로로 값 가져오기", "* Get value by chain path"],
    [
      "* depth만큼 같은 키로 내려가기\n * @internal\n * @param obj 대상 객체\n * @param key 내려갈 키\n * @param depth 내려갈 깊이 (1 이상)\n * @param optional true면 중간에 null/undefined가 있어도 에러 없이 undefined 반환\n * @throws ArgumentError depth가 1 미만일 경우",
      "* Descend by the same key for a given depth\n * @internal\n * @param obj Target object\n * @param key Key to descend by\n * @param depth Depth to descend (1 or more)\n * @param optional If true, returns undefined without error when null/undefined is encountered midway\n * @throws ArgumentError If depth is less than 1",
    ],
    ["* 체인 경로로 값 설정", "* Set value by chain path"],
    ["* 체인 경로의 값 삭제", "* Delete value at chain path"],
    [
      "// 중간 경로가 없으면 조용히 리턴 (삭제할 것이 없음)",
      "// Silently return if intermediate path does not exist (nothing to delete)",
    ],
    [
      "* 객체에서 undefined 값을 가진 키 삭제\n * @internal\n *\n * @mutates 원본 객체를 직접 수정함",
      "* Delete keys with undefined values from object\n * @internal\n *\n * @mutates Directly modifies the original object",
    ],
    [
      "* 객체의 모든 키 삭제\n * @internal\n *\n * @mutates 원본 객체를 직접 수정함",
      "* Delete all keys from object\n * @internal\n *\n * @mutates Directly modifies the original object",
    ],
    [
      "* null을 undefined로 변환 (재귀적)\n * @internal\n *\n * @mutates 원본 배열/객체를 직접 수정함",
      "* Convert null to undefined (recursive)\n * @internal\n *\n * @mutates Directly modifies the original array/object",
    ],
    [
      "* flat된 객체를 nested 객체로 변환\n * @internal",
      "* Convert flat object to nested object\n * @internal",
    ],
    ["//#region 타입 유틸리티", "//#region Type utilities"],
    [
      "* undefined를 가진 프로퍼티를 optional로 변환",
      "* Convert properties with undefined to optional",
    ],
    [
      "* optional 프로퍼티를 required + undefined 유니온으로 변환",
      "* Convert optional properties to required + undefined union",
    ],
    [
      "* Object.keys의 타입 안전한 버전\n * @param obj 키를 추출할 객체\n * @returns 객체의 키 배열",
      "* Type-safe version of Object.keys\n * @param obj Object to extract keys from\n * @returns Array of object keys",
    ],
    [
      "* Object.entries의 타입 안전한 버전\n * @param obj 엔트리를 추출할 객체\n * @returns [키, 값] 튜플 배열",
      "* Type-safe version of Object.entries\n * @param obj Object to extract entries from\n * @returns Array of [key, value] tuples",
    ],
    [
      "* Object.fromEntries의 타입 안전한 버전\n * @param entries [키, 값] 튜플 배열\n * @returns 생성된 객체",
      "* Type-safe version of Object.fromEntries\n * @param entries Array of [key, value] tuples\n * @returns Created object",
    ],
    [
      "* 객체의 각 엔트리를 변환하여 새 객체 반환\n * @param obj 변환할 객체\n * @param fn 변환 함수 (key, value) => [newKey, newValue]\n * @returns 변환된 키와 값을 가진 새 객체",
      "* Transform each entry of an object and return a new object\n * @param obj Object to transform\n * @param fn Transform function (key, value) => [newKey, newValue]\n * @returns New object with transformed keys and values",
    ],
    ["// 값만 변환", "// Transform values only"],
    ["// 키와 값 모두 변환", "// Transform both keys and values"],
  ],
  "packages/core-common/src/utils/path.ts": [
    [
      "* 경로 유틸리티 함수\n * Node.js path 모듈 대체용 (브라우저 환경 지원)\n *\n * @note 이 유틸리티는 POSIX 스타일 경로(슬래시 `/`)만 지원합니다.\n *       Windows 백슬래시(`\\`) 경로는 지원하지 않습니다.\n *       브라우저 환경 및 Capacitor 플러그인용으로 설계되었습니다.",
      "* Path utility functions\n * Replacement for Node.js path module (browser environment support)\n *\n * @note This utility supports only POSIX-style paths (forward slash `/`).\n *       Windows backslash (`\\`) paths are not supported.\n *       Designed for browser environments and Capacitor plugins.",
    ],
    [
      "* 경로 조합 (path.join 대체)\n * @note POSIX 스타일 경로만 지원 (슬래시 `/`)",
      "* Join paths (path.join replacement)\n * @note Supports only POSIX-style paths (forward slash `/`)",
    ],
    ["* 파일명 추출 (path.basename 대체)", "* Extract filename (path.basename replacement)"],
    [
      "* 확장자 추출 (path.extname 대체)\n * @note 숨김 파일(예: `.gitignore`)은 빈 문자열을 반환합니다 (Node.js path.extname과 동일)",
      "* Extract extension (path.extname replacement)\n * @note Hidden files (e.g. `.gitignore`) return an empty string (same as Node.js path.extname)",
    ],
  ],
  "packages/core-common/src/utils/primitive.ts": [
    [
      "* 값에서 PrimitiveTypeStr 추론\n *\n * 런타임에서 값의 타입을 검사하여 해당하는 PrimitiveTypeStr을 반환합니다.\n *\n * @param value 타입을 추론할 값\n * @returns 값에 해당하는 PrimitiveTypeStr\n * @throws ArgumentError 지원하지 않는 타입인 경우",
      "* Infer PrimitiveTypeStr from value\n *\n * Inspects the type of a value at runtime and returns the corresponding PrimitiveTypeStr.\n *\n * @param value Value to infer type from\n * @returns PrimitiveTypeStr corresponding to the value\n * @throws ArgumentError If the type is not supported",
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
