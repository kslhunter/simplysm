import fs from "fs";
import path from "path";

const BASE = "D:/workspaces-13/simplysm";

// Map of [file, [[oldComment, newComment], ...]]
const fileEdits = {
  "packages/core-common/src/extensions/arr-ext.ts": [
    ["* Array 확장 메서드", "* Array extension methods"],
    [
      "* @remarks 각 메서드의 TSDoc은 타입 정의 파일(arr-ext.types.ts) 참조",
      "* @remarks See the type definition file (arr-ext.types.ts) for TSDoc of each method",
    ],
    ["//#region 구현", "//#region Implementation"],
    ["// PrimitiveTypeStr인 경우", "// PrimitiveTypeStr case"],
    [
      "// exhaustive check: PrimitiveTypeStr에 새 타입 추가 시 컴파일 에러 발생",
      "// exhaustive check: adding a new type to PrimitiveTypeStr will cause a compile error",
    ],
    ["// Type<N> (생성자)인 경우", "// Type<N> (constructor) case"],
    [
      "// 배열을 키별로 그룹화\n  // 성능 고려사항:\n  // - primitive 키 (string, number 등): O(n) - Map 기반\n  // - 객체 키: O(n²) - objEqual 비교",
      "// Group array by key\n  // Performance considerations:\n  // - primitive keys (string, number, etc.): O(n) - Map-based\n  // - object keys: O(n^2) - objEqual comparison",
    ],
    [
      "// primitive 키 최적화를 위한 Map (키 문자열 -> result 인덱스)",
      "// Map for primitive key optimization (key string -> result index)",
    ],
    ["// primitive 키는 Map으로 O(n) 처리", "// Primitive keys: O(n) via Map"],
    ["// 객체 키는 기존 방식 O(n²)", "// Object keys: O(n^2) legacy approach"],
    [
      '// undefined 값은 "없음"으로 취급하여 덮어쓰기 허용',
      '// undefined values are treated as "absent", allowing overwrites',
    ],
    ["// O(n) 최적화: 맵 기반 인덱싱", "// O(n) optimization: map-based indexing"],
    ["// 옵션 정규화\n    const opts", "// Normalize options\n    const opts"],
    [
      "// matchAddress: Set 기반 O(n)\n    if (opts.matchAddress === true) return",
      "// matchAddress: Set-based O(n)\n    if (opts.matchAddress === true) return",
    ],
    [
      "// keyFn 제공 시: 커스텀 키 기반 O(n)\n    if (opts.keyFn)",
      "// With keyFn: custom key-based O(n)\n    if (opts.keyFn)",
    ],
    [
      "// 기본: 타입별 처리\n    const seen = new Map",
      "// Default: type-based processing\n    const seen = new Map",
    ],
    ["// symbol/function용 O(n) 처리", "// O(n) processing for symbol/function"],
    [
      "// primitive 타입은 빠른 경로\n      if (item === null",
      "// Fast path for primitive types\n      if (item === null",
    ],
    [
      "// symbol, function은 Set으로 identity 비교 (O(n))",
      "// symbol, function: identity comparison via Set (O(n))",
    ],
    [
      '// 나머지 primitive는 타입 prefix + 특수 케이스 처리\n        let key = type + ":";\n        if (Object.is(item, -0)) {\n          key += "-0";\n        } else {\n          key += String(item);\n        }\n\n        if (!seen.has(key)) {\n          seen.set(key, item);\n          result.push(item);\n        }\n        continue;\n      }\n\n      if (!result.some',
      '// Other primitives: type prefix + special case handling\n        let key = type + ":";\n        if (Object.is(item, -0)) {\n          key += "-0";\n        } else {\n          key += String(item);\n        }\n\n        if (!seen.has(key)) {\n          seen.set(key, item);\n          result.push(item);\n        }\n        continue;\n      }\n\n      if (!result.some',
    ],
    [
      "// keys 옵션이 있는 경우 target을 keys 기준으로 Map에 미리 인덱싱하여 O(n×m) → O(n+m) 개선\n    // 키 값이 같은 target이 여러 개 있을 수 있으므로 배열로 저장",
      "// When keys option is provided, pre-index target by keys into a Map for O(n*m) -> O(n+m) improvement\n    // Store as array since multiple targets may have the same key value",
    ],
    [
      "// 전체 일치(sameTarget) 우선, 없으면 키 일치(sameKeyTarget) 검색",
      "// Prioritize exact match (sameTarget), otherwise search for key match (sameKeyTarget)",
    ],
    [
      "// Set 기반 건너뛰기로 이미 매칭된 항목 스킵 (splice O(n) 제거)",
      "// Skip already matched items via Set-based check (eliminates splice O(n))",
    ],
    [
      "// 전체 일치가 없고 keys 옵션이 있으면 Map에서 O(1) 조회",
      "// No exact match and keys option present: O(1) lookup from Map",
    ],
    [
      "// uncheckedTargetSet에서 O(1) 조회로 아직 남아있는 첫 번째 항목 선택",
      "// Select first remaining item via O(1) lookup from uncheckedTargetSet",
    ],
    [
      "// source 항목의 원본 인덱스를 미리 계산하여 O(n) 검색을 O(1)로 개선",
      "// Pre-compute original indices of source items to improve O(n) search to O(1)",
    ],
    ["// 변경시\n      if (diff.source", "// On update\n      if (diff.source"],
    ["// 추가시\n      else if", "// On insert\n      else if"],
    [
      '// 옵션 정규화\n    const opts = typeof options === "boolean"',
      '// Normalize options\n    const opts = typeof options === "boolean"',
    ],
    [
      "// matchAddress: Set 기반 O(n)\n    // 첫 번째 등장한 요소를 유지하기 위해 정방향 순회 후 제거할 인덱스 수집\n    if (opts.matchAddress",
      "// matchAddress: Set-based O(n)\n    // Forward traversal to collect indices to remove, keeping the first occurrence\n    if (opts.matchAddress",
    ],
    [
      "// 역순으로 제거 (인덱스 변화 방지)\n      for (let i = toRemove.length",
      "// Remove in reverse order (prevents index shift)\n      for (let i = toRemove.length",
    ],
    [
      "// keyFn 제공 시: 커스텀 키 기반 O(n)\n    // 첫 번째 등장한 요소를 유지하기 위해 정방향 순회 후 제거할 인덱스 수집\n    if (opts.keyFn)",
      "// With keyFn: custom key-based O(n)\n    // Forward traversal to collect indices to remove, keeping the first occurrence\n    if (opts.keyFn)",
    ],
    [
      "// 역순으로 제거 (인덱스 변화 방지)\n      for (let i = toRemove.length - 1; i >= 0; i--) {\n        this.splice(toRemove[i], 1);\n      }\n      return this;\n    }\n\n    // 기본: 타입별 처리 (primitive 최적화)",
      "// Remove in reverse order (prevents index shift)\n      for (let i = toRemove.length - 1; i >= 0; i--) {\n        this.splice(toRemove[i], 1);\n      }\n      return this;\n    }\n\n    // Default: type-based processing (primitive optimization)",
    ],
    ["// primitive 타입은 빠른 경로 O(n)", "// Fast path for primitive types O(n)"],
    [
      "// symbol, function은 Set으로 identity 비교\n",
      "// symbol, function: identity comparison via Set\n",
    ],
    [
      '// 나머지 primitive는 타입 prefix + 특수 케이스 처리\n        let key = type + ":";\n        if (Object.is(item, -0)) {\n          key += "-0";\n        } else {\n          key += String(item);\n        }\n\n        if (seen.has(key)) {',
      '// Other primitives: type prefix + special case handling\n        let key = type + ":";\n        if (Object.is(item, -0)) {\n          key += "-0";\n        } else {\n          key += String(item);\n        }\n\n        if (seen.has(key)) {',
    ],
    [
      "// 객체는 깊은 비교 O(n²) - 제거되지 않은 이전 항목들과 비교",
      "// Objects: deep comparison O(n^2) - compare with previous non-removed items",
    ],
    [
      "// toRemoveSet에 있는 인덱스는 건너뜀 (O(1) 조회)",
      "// Skip indices in toRemoveSet (O(1) lookup)",
    ],
    [
      "// 역순으로 제거 (인덱스 변화 방지)\n    const toRemoveArr",
      "// Remove in reverse order (prevents index shift)\n    const toRemoveArr",
    ],
    [
      "// 역방향 순회로 인덱스 변경 문제 방지 (O(n) 성능)",
      "// Reverse traversal to prevent index shift issues (O(n) performance)",
    ],
    ["//#region 타입 선언", "//#region Type declarations"],
  ],

  "packages/core-common/src/extensions/arr-ext.types.ts": [
    ["* Array 확장 타입 정의", "* Array extension type definitions"],
    ["//#region 인터페이스", "//#region Interfaces"],
    [
      "* 조건에 맞는 단일 요소 반환\n   * @param predicate 필터 조건 (생략 시 배열 전체 대상)\n   * @returns 요소가 없으면 undefined\n   * @throws ArgumentError 조건에 맞는 요소가 2개 이상이면 발생",
      "* Return a single element matching the condition\n   * @param predicate Filter condition (targets entire array if omitted)\n   * @returns undefined if no element found\n   * @throws ArgumentError if more than one element matches the condition",
    ],
    [
      "* 첫 번째 요소 반환\n   * @param predicate 필터 조건 (생략 시 첫 번째 요소 반환)\n   * @returns 요소가 없으면 undefined",
      "* Return the first element\n   * @param predicate Filter condition (returns first element if omitted)\n   * @returns undefined if no element found",
    ],
    ["/** 비동기 필터 (순차 실행) */", "/** Async filter (sequential execution) */"],
    [
      "* 마지막 요소 반환\n   * @param predicate 필터 조건 (생략 시 마지막 요소 반환)\n   * @returns 요소가 없으면 undefined",
      "* Return the last element\n   * @param predicate Filter condition (returns last element if omitted)\n   * @returns undefined if no element found",
    ],
    ["/** null/undefined 제거 */", "/** Remove null/undefined */"],
    [
      "/** 특정 타입의 요소만 필터링 (PrimitiveTypeStr 또는 생성자 타입) */",
      "/** Filter elements by specific type (PrimitiveTypeStr or constructor type) */",
    ],
    ["/** 비동기 매핑 (순차 실행) */", "/** Async mapping (sequential execution) */"],
    ["/** 중첩 배열 평탄화 */", "/** Flatten nested arrays */"],
    ["/** 매핑 후 평탄화 */", "/** Map then flatten */"],
    [
      "/** 비동기 매핑 후 평탄화 (순차 실행) */",
      "/** Async map then flatten (sequential execution) */",
    ],
    [
      "* 비동기 병렬 처리 (Promise.all 사용)\n   * @note 하나라도 reject되면 전체가 fail-fast로 reject됨 (Promise.all 동작)",
      "* Async parallel processing (using Promise.all)\n   * @note If any promise rejects, the entire operation fails fast (Promise.all behavior)",
    ],
    [
      "* 키 기준 그룹화\n   * @param keySelector 그룹 키 선택 함수\n   * @note O(n²) 복잡도 (객체 키 지원을 위해 깊은 비교 사용). primitive 키만 필요하면 toArrayMap()이 O(n)으로 더 효율적",
      "* Group by key\n   * @param keySelector Group key selector function\n   * @note O(n^2) complexity (uses deep comparison to support object keys). If only primitive keys are needed, toArrayMap() is more efficient at O(n)",
    ],
    [
      "* 키 기준 그룹화 (값 변환 포함)\n   * @param keySelector 그룹 키 선택 함수\n   * @param valueSelector 값 변환 함수\n   * @note O(n²) 복잡도 (객체 키 지원을 위해 깊은 비교 사용). primitive 키만 필요하면 toArrayMap()이 O(n)으로 더 효율적",
      "* Group by key (with value transformation)\n   * @param keySelector Group key selector function\n   * @param valueSelector Value transformation function\n   * @note O(n^2) complexity (uses deep comparison to support object keys). If only primitive keys are needed, toArrayMap() is more efficient at O(n)",
    ],
    ["* 평탄한 배열을 트리 구조로 변환한다", "* Convert a flat array to a tree structure"],
    [
      "* @param keyProp 각 항목의 고유 키 속성명",
      "* @param keyProp Unique key property name of each item",
    ],
    [
      "* @param parentKey 부모 항목의 키를 참조하는 속성명",
      "* @param parentKey Property name referencing the parent item's key",
    ],
    [
      "* @returns 루트 항목들의 배열 (각 항목에 children 속성 추가)",
      "* @returns Array of root items (with children property added to each item)",
    ],
    [
      "* - parentKey 값이 null/undefined인 항목이 루트가 된다",
      "* - Items with null/undefined parentKey value become roots",
    ],
    [
      "* - 내부적으로 toArrayMap을 사용하여 O(n) 복잡도로 처리한다",
      "* - Uses toArrayMap internally for O(n) complexity",
    ],
    [
      "* - 원본 항목은 복사되어 children 속성이 추가된다",
      "* - Original items are cloned and children property is added",
    ],
    [
      "* 중복 제거\n   * @param options matchAddress: 주소 비교 (true면 Set 사용), keyFn: 커스텀 키 함수 (O(n) 성능)\n   * @note 객체 배열에서 keyFn 없이 사용 시 O(n²) 복잡도. 대량 데이터는 keyFn 사용 권장",
      "* Remove duplicates\n   * @param options matchAddress: reference comparison (uses Set if true), keyFn: custom key function (O(n) performance)\n   * @note O(n^2) complexity when used without keyFn on object arrays. Using keyFn is recommended for large datasets",
    ],
    [
      "* 두 배열 비교 (INSERT/DELETE/UPDATE)\n   * @param target 비교 대상 배열\n   * @param options keys: 키 비교용, excludes: 비교 제외 속성\n   * @note target에 중복 키가 있으면 첫 번째 매칭만 사용됨",
      "* Compare two arrays (INSERT/DELETE/UPDATE)\n   * @param target Target array to compare against\n   * @param options keys: for key comparison, excludes: properties to exclude from comparison\n   * @note If target has duplicate keys, only the first match is used",
    ],
    [
      "* 요소의 합계 반환\n   * @param selector 값 선택 함수 (생략 시 요소 자체를 number로 사용)\n   * @returns 빈 배열인 경우 0 반환",
      "* Return sum of elements\n   * @param selector Value selector function (uses element itself as number if omitted)\n   * @returns Returns 0 for empty arrays",
    ],
    [
      "* 원본 배열을 변경하는 확장 메서드\n * @mutates 모든 메서드가 원본 배열을 직접 변경합니다",
      "* Extension methods that mutate the original array\n * @mutates All methods directly modify the original array",
    ],
    [
      "* 원본 배열에서 중복 제거\n   * @param options matchAddress: 주소 비교 (true면 Set 사용), keyFn: 커스텀 키 함수 (O(n) 성능)\n   * @note 객체 배열에서 keyFn 없이 사용 시 O(n²) 복잡도. 대량 데이터는 keyFn 사용 권장",
      "* Remove duplicates from the original array\n   * @param options matchAddress: reference comparison (uses Set if true), keyFn: custom key function (O(n) performance)\n   * @note O(n^2) complexity when used without keyFn on object arrays. Using keyFn is recommended for large datasets",
    ],
    [
      "/** 원본 배열 오름차순 정렬 @mutates */",
      "/** Sort original array in ascending order @mutates */",
    ],
    [
      "/** 원본 배열 내림차순 정렬 @mutates */",
      "/** Sort original array in descending order @mutates */",
    ],
    ["/** 원본 배열에 항목 삽입 @mutates */", "/** Insert items into original array @mutates */"],
    ["/** 원본 배열에서 항목 제거 @mutates */", "/** Remove item from original array @mutates */"],
    [
      "/** 원본 배열에서 조건에 맞는 항목 제거 @mutates */",
      "/** Remove items matching condition from original array @mutates */",
    ],
    [
      "/** 원본 배열에서 항목 토글 (있으면 제거, 없으면 추가) @mutates */",
      "/** Toggle item in original array (remove if exists, add if not) @mutates */",
    ],
    ["/** 원본 배열 비우기 @mutates */", "/** Clear original array @mutates */"],
    ["//#region 내보내기 타입", "//#region Export types"],
    ["/** 정렬/비교 가능한 타입 */", "/** Sortable/comparable type */"],
  ],

  "packages/core-common/src/extensions/map-ext.ts": [
    ["* Map 확장 메서드", "* Map extension methods"],
    [
      "* 키에 해당하는 값이 없으면 새 값을 설정하고 반환",
      "* Get value for key, or set and return a new value if absent",
    ],
    [
      "* **주의**: V 타입이 함수인 경우(예: `Map<string, () => void>`),",
      "* **Caution**: If V type is a function (e.g., `Map<string, () => void>`),",
    ],
    [
      "* 두 번째 인자로 함수를 직접 전달하면 팩토리로 인식되어 호출됩니다.",
      "* passing a function directly as the second argument will be treated as a factory and invoked.",
    ],
    [
      "* 함수 자체를 값으로 저장하려면 팩토리로 감싸세요.",
      "* To store a function itself as a value, wrap it in a factory.",
    ],
    ["* // 일반 값", "* // Plain value"],
    [
      "* // 팩토리 함수 (계산 비용이 큰 경우)",
      "* // Factory function (for expensive computations)",
    ],
    ["* // 함수를 값으로 저장하는 경우", "* // Storing a function as a value"],
    [
      '* fnMap.getOrCreate("key", () => myFn);  // 팩토리로 감싸기',
      '* fnMap.getOrCreate("key", () => myFn);  // Wrap in a factory',
    ],
    ["* 키에 해당하는 값을 함수로 업데이트한다", "* Update the value for a key using a function"],
    ["* @param key 업데이트할 키", "* @param key Key to update"],
    [
      "* @param updateFn 현재 값을 받아 새 값을 반환하는 함수 (키가 없으면 undefined 전달)",
      "* @param updateFn Function that receives the current value and returns a new value (undefined if key does not exist)",
    ],
    [
      "* 키가 존재하지 않아도 updateFn이 호출되어 새 값이 설정된다.",
      "* Even if the key does not exist, updateFn is called and a new value is set.",
    ],
    [
      "* 기존 값 기반 계산이 필요한 경우 (카운터 증가, 배열에 추가 등) 유용하다.",
      "* Useful when computation based on the existing value is needed (incrementing counters, appending to arrays, etc.).",
    ],
    ["* // 카운터 증가", "* // Increment counter"],
    ["* // 배열에 항목 추가", "* // Append item to array"],
  ],

  "packages/core-common/src/extensions/set-ext.ts": [
    ["* Set 확장 메서드", "* Set extension methods"],
    ["* 여러 값을 한 번에 추가", "* Add multiple values at once"],
    [
      "* 값을 토글한다 (있으면 제거, 없으면 추가)",
      "* Toggle a value (remove if exists, add if not)",
    ],
    ["* @param value 토글할 값", "* @param value Value to toggle"],
    [
      '* @param addOrDel 강제로 추가("add") 또는 제거("del") 지정 (생략 시 자동 토글)',
      '* @param addOrDel Force add ("add") or remove ("del") (auto-toggle if omitted)',
    ],
    ["* @returns this (메서드 체이닝 가능)", "* @returns this (chainable)"],
    [
      "* addOrDel 파라미터로 조건부 추가/제거를 간결하게 표현할 수 있다.",
      "* The addOrDel parameter allows concise conditional add/remove.",
    ],
    [
      "* set.toggle(2);  // 2가 있으므로 제거 → {1, 3}",
      "* set.toggle(2);  // 2 exists, so remove -> {1, 3}",
    ],
    [
      "* set.toggle(4);  // 4가 없으므로 추가 → {1, 3, 4}",
      "* set.toggle(4);  // 4 does not exist, so add -> {1, 3, 4}",
    ],
    ["* // 조건부 토글", "* // Conditional toggle"],
    [
      '* set.toggle(5, isAdmin ? "add" : "del");  // 강제 추가',
      '* set.toggle(5, isAdmin ? "add" : "del");  // Force add',
    ],
  ],

  "packages/core-common/src/features/debounce-queue.ts": [
    ["* 비동기 함수 디바운스 큐", "* Async function debounce queue"],
    [
      "* 짧은 시간 내에 여러 번 호출되면 마지막 요청만 실행하고 이전 요청은 무시합니다.",
      "* When called multiple times within a short period, only the last request is executed and previous ones are ignored.",
    ],
    [
      "* 입력 필드 자동완성, 연속적인 상태 변경 배치 처리 등에 유용합니다.",
      "* Useful for input field autocomplete, batching consecutive state changes, etc.",
    ],
    [
      "* 실행 중에 추가된 요청은 디바운스 지연 없이 현재 실행이 완료된 직후 처리됩니다.",
      "* Requests added during execution are processed immediately after the current execution completes, without debounce delay.",
    ],
    [
      "* 이는 실행 완료 전에 들어온 요청이 누락되지 않도록 하기 위한 의도적 설계입니다.",
      "* This is an intentional design to prevent requests received before execution completes from being dropped.",
    ],
    ["* // 에러 처리", "* // Error handling"],
    [
      "* @param _delay 디바운스 지연 시간 (밀리초). 생략 시 즉시 실행 (다음 이벤트 루프)",
      "* @param _delay Debounce delay time (milliseconds). Executes immediately (next event loop) if omitted",
    ],
    ["* 대기 중인 작업과 타이머 정리", "* Clean up pending tasks and timers"],
    ["* using 문 지원", "* Support for using statement"],
    [
      "* 함수를 큐에 추가\n   * 이전에 추가된 함수가 있으면 대체됨",
      "* Add function to queue\n   * Replaces any previously added function",
    ],
    [
      '// 실행 중에 새 요청이 들어오면 디바운스 지연 없이 즉시 처리\n      // 이는 "실행 완료 전에 들어온 요청은 실행 직후 바로 처리"하는 의도적 설계',
      '// If new requests arrive during execution, process immediately without debounce delay\n      // This is an intentional design: "requests received before completion are processed right after"',
    ],
    [
      'const sdError = new SdError(error, "작업 실행 중 오류 발생");',
      'const sdError = new SdError(error, "Error occurred during task execution");',
    ],
    [
      "// 리스너가 있으면 이벤트로 전달, 없으면 로깅",
      "// Emit as event if listeners exist, otherwise log",
    ],
  ],

  "packages/core-common/src/features/event-emitter.ts": [
    [
      "* EventTarget 래퍼 - EventEmitter와 유사한 API 제공",
      "* EventTarget wrapper - provides EventEmitter-like API",
    ],
    [
      "* 브라우저와 Node.js 모두에서 사용 가능한 타입 안전한 이벤트 에미터이다.",
      "* A type-safe event emitter usable in both browser and Node.js environments.",
    ],
    [
      "* 내부적으로 EventTarget을 사용하여 구현되어 있다.",
      "* Implemented internally using EventTarget.",
    ],
    [
      "* @typeParam TEvents 이벤트 타입 맵. 키는 이벤트 이름, 값은 이벤트 데이터 타입",
      "* @typeParam TEvents Event type map. Key is the event name, value is the event data type",
    ],
    [
      '* emitter.emit("done"); // void 타입은 인자 없이 호출',
      '* emitter.emit("done"); // void type called without arguments',
    ],
    [
      "// 이벤트 타입별로 리스너 맵 관리 (같은 리스너를 다른 이벤트에 등록 가능)",
      "// Manage listener maps per event type (same listener can be registered for different events)",
    ],
    [
      "// 다형적 리스너 관리를 위해 Function 타입 사용",
      "// Function type used for polymorphic listener management",
    ],
    ["* 이벤트 리스너 등록", "* Register event listener"],
    ["* @param type 이벤트 타입", "* @param type Event type"],
    ["* @param listener 이벤트 핸들러", "* @param listener Event handler"],
    [
      "* @note 같은 리스너를 같은 이벤트에 중복 등록하면 무시됨",
      "* @note Duplicate registration of the same listener for the same event is ignored",
    ],
    ["// 이벤트 타입별 맵 가져오거나 생성", "// Get or create map for event type"],
    [
      "// 이미 해당 이벤트에 등록된 리스너면 무시 (중복 등록 방지)",
      "// Ignore if already registered for this event (prevent duplicate registration)",
    ],
    ["* 이벤트 리스너 제거", "* Remove event listener"],
    ["* @param listener 제거할 이벤트 핸들러", "* @param listener Event handler to remove"],
    ["// 빈 맵 정리", "// Clean up empty map"],
    ["* 이벤트 발생", "* Emit event"],
    [
      "* @param args 이벤트 데이터 (void 타입이면 생략)",
      "* @param args Event data (omit for void type)",
    ],
    ["* 특정 이벤트의 리스너 수 반환", "* Return listener count for a specific event"],
    ["* @returns 등록된 리스너 수", "* @returns Number of registered listeners"],
    ["* 모든 이벤트 리스너를 제거한다.", "* Remove all event listeners."],
    ["* using 문 지원", "* Support for using statement"],
  ],

  "packages/core-common/src/features/serial-queue.ts": [
    ["* 비동기 함수 직렬 큐", "* Async function serial queue"],
    [
      "* 큐에 추가된 함수들을 순서대로 실행합니다.",
      "* Executes functions added to the queue in order.",
    ],
    [
      "* 한 작업이 완료되어야 다음 작업이 시작됩니다.",
      "* The next task starts only after the previous one completes.",
    ],
    [
      "* 에러가 발생해도 후속 작업은 계속 실행됩니다.",
      "* Subsequent tasks continue to execute even if an error occurs.",
    ],
    ["* // 에러 처리", "* // Error handling"],
    ["* @param _gap 각 작업 사이의 간격 (ms)", "* @param _gap Gap between each task (ms)"],
    [
      "* 대기 중인 큐 비우기 (현재 실행 중인 작업은 완료됨)",
      "* Clear the pending queue (currently running task will complete)",
    ],
    ["* using 문 지원", "* Support for using statement"],
    ["* 함수를 큐에 추가하고 실행", "* Add function to queue and execute"],
    [
      'const sdError = new SdError(error, "큐 작업 실행 중 오류 발생");',
      'const sdError = new SdError(error, "Error occurred during queue task execution");',
    ],
    [
      "// 리스너가 있으면 이벤트로 전달, 없으면 로깅",
      "// Emit as event if listeners exist, otherwise log",
    ],
  ],

  "packages/core-common/src/globals.ts": [
    ["* 개발 모드 여부", "* Whether in development mode"],
    ["* 빌드 시점에 치환됨:", "* Replaced at build time:"],
    [
      "* - 라이브러리 빌드: 치환하지 않음 (그대로 유지)",
      "* - Library build: not replaced (kept as-is)",
    ],
    [
      "* - client/server 빌드: `define: { '__DEV__': 'true/false' }`로 치환",
      "* - Client/server build: replaced with `define: { '__DEV__': 'true/false' }`",
    ],
  ],

  "packages/core-common/src/index.ts": [
    [
      "// @simplysm/core-common\n// 공통 유틸리티 패키지",
      "// @simplysm/core-common\n// Common utility package",
    ],
  ],

  "packages/core-common/src/types/date-only.ts": [
    [
      "* 날짜 클래스 (시간제외: yyyy-MM-dd, 불변)",
      "* Date class (time excluded: yyyy-MM-dd, immutable)",
    ],
    [
      "* 시간 정보 없이 날짜만 저장하는 불변 클래스이다.",
      "* An immutable class that stores only the date without time information.",
    ],
    ["* 로컬 타임존을 기준으로 동작한다.", "* Operates based on the local timezone."],
    ["/** 현재시간 */", "/** Current date */"],
    ["/** 연월일로 초기화 */", "/** Initialize with year, month, day */"],
    ["/** tick (millisecond)으로 생성 */", "/** Create from tick (milliseconds) */"],
    ["/** Date 타입으로 생성 */", "/** Create from Date type */"],
    ["* 문자열을 DateOnly로 파싱", "* Parse string to DateOnly"],
    ["* @param str 날짜 문자열", "* @param str Date string"],
    ["* 지원 형식:", "* Supported formats:"],
    [
      "* - `yyyy-MM-dd` (예: '2024-01-15') - 문자열에서 직접 추출, 타임존 영향 없음",
      "* - `yyyy-MM-dd` (e.g., '2024-01-15') - extracted directly from string, no timezone effect",
    ],
    [
      "* - `yyyyMMdd` (예: '20240115') - 문자열에서 직접 추출, 타임존 영향 없음",
      "* - `yyyyMMdd` (e.g., '20240115') - extracted directly from string, no timezone effect",
    ],
    [
      "* - ISO 8601 (예: '2024-01-15T00:00:00Z') - UTC로 해석 후 로컬 타임존 변환",
      "* - ISO 8601 (e.g., '2024-01-15T00:00:00Z') - interpreted as UTC then converted to local timezone",
    ],
    [
      "* @note 서버/클라이언트 타임존이 다른 경우 `yyyy-MM-dd` 형식 사용 권장",
      "* @note `yyyy-MM-dd` format is recommended when server/client timezones differ",
    ],
    [
      "* @note DST(일광절약시간) 지역에서 ISO 8601 형식 파싱 시, 파싱 대상 날짜의 오프셋을 사용합니다.",
      "* @note When parsing ISO 8601 format in DST regions, the offset of the parsed date is used.",
    ],
    ["// yyyy-MM-dd 형식 (타임존 영향 없음)", "// yyyy-MM-dd format (no timezone effect)"],
    ["// yyyyMMdd 형식 (타임존 영향 없음)", "// yyyyMMdd format (no timezone effect)"],
    [
      "// ISO 8601 등 기타 형식 (Date.parse 사용, 타임존 변환 적용)",
      "// ISO 8601 and other formats (uses Date.parse, timezone conversion applied)",
    ],
    [
      "// Date.parse()는 'Z' 접미사가 있는 ISO 8601을 UTC tick으로 반환",
      "// Date.parse() returns UTC tick for ISO 8601 with 'Z' suffix",
    ],
    [
      '// getTimezoneOffset()은 "로컬에서 UTC로 변환할 때 더할 분"을 반환 (KST는 -540분 = UTC+9)',
      '// getTimezoneOffset() returns "minutes to add when converting local to UTC" (KST is -540min = UTC+9)',
    ],
    [
      '// 여기서는 "UTC → 로컬" 변환이므로 부호를 반대로 적용 (뺄셈)',
      '// Here we convert "UTC -> local", so the sign is reversed (subtraction)',
    ],
    [
      "// 파싱 대상 날짜의 오프셋을 사용하여 DST 지역에서도 정확한 변환",
      "// Use the offset of the parsed date for accurate conversion even in DST regions",
    ],
    ["//#region 주차 계산", "//#region Week number calculation"],
    [
      "* 기준 연도와 월을 주차 정보를 기반으로 반환",
      "* Return the base year and month based on week number information",
    ],
    [
      "* @param weekStartDay 주의 시작 요일 (0=일요일, 1=월요일, ..., 6=토요일). 기본값: 1(월요일)",
      "* @param weekStartDay Start day of week (0=Sunday, 1=Monday, ..., 6=Saturday). Default: 1 (Monday)",
    ],
    [
      "* @param minDaysInFirstWeek 첫 주로 간주할 최소 일수 (1~7). 기본값: 4 (ISO 8601 표준)",
      "* @param minDaysInFirstWeek Minimum days to count as the first week (1-7). Default: 4 (ISO 8601 standard)",
    ],
    [
      "* @returns 해당 날짜가 속한 주차의 기준 연도와 월",
      "* @returns Base year and month of the week the date belongs to",
    ],
    [
      "// ISO 8601 표준 (월요일 시작, 첫 주 최소 4일)",
      "// ISO 8601 standard (Monday start, first week min 4 days)",
    ],
    ["// 미국식 (일요일 시작, 첫 주 최소 1일)", "// US style (Sunday start, first week min 1 day)"],
    [
      "// 주의 시작 요일 기준으로 현재 날짜의 요일 인덱스 계산 (0 = 주 시작일)",
      "// Calculate day-of-week index relative to week start day (0 = week start)",
    ],
    [
      "// 현재 주의 남은 일수 (현재 날짜 포함)",
      "// Remaining days in current week (including current date)",
    ],
    [
      "// 현재 주의 남은 일수가 첫 주 최소 일수 미만이면 이전 주로 간주",
      "// If remaining days in week is less than min first week days, treat as previous week",
    ],
    [
      "// 월 경계를 고려한 실제 주의 남은 일수 계산",
      "// Calculate actual remaining days considering month boundary",
    ],
    [
      "// 월 경계까지의 실제 일수와 주의 남은 일수 중 작은 값",
      "// Minimum of actual days to month boundary and remaining days in week",
    ],
    [
      "// 월 경계 고려 시에도 첫 주 최소 일수 미만이면 다음 주로 간주",
      "// If still less than min first week days considering month boundary, treat as next week",
    ],
    [
      "* 주차 정보를 기반으로 해당 주의 시작 날짜 계산",
      "* Calculate the start date of the week based on week number information",
    ],
    [
      "* @returns 해당 날짜가 속한 주의 시작 날짜",
      "* @returns Start date of the week the date belongs to",
    ],
    ["* 연도 및 주차 순서 정보를 반환", "* Return year and week sequence information"],
    [
      "* @returns 연도와 해당 연도 기준 주차 번호",
      "* @returns Year and week number relative to that year",
    ],
    [
      "* 해당 날짜의 연도, 월 및 주차(weekSeq) 정보를 반환",
      "* Return the year, month, and week sequence (weekSeq) information for the date",
    ],
    [
      "* @returns 연도, 월 및 해당 월 기준 주차 번호",
      "* @returns Year, month, and week number relative to that month",
    ],
    [
      "* 주차 정보를 기반으로 해당 주의 시작 날짜 가져오기",
      "* Get the start date of a week based on week number information",
    ],
    [
      "* @param arg 연도, 선택적 월, 주차 번호",
      "* @param arg Year, optional month, and week number",
    ],
    ["* @returns 해당 주차의 시작 날짜", "* @returns Start date of the specified week"],
    [
      "// 2025년 2주차의 시작일 (ISO 8601 표준)",
      "// Start date of 2025 week 2 (ISO 8601 standard)",
    ],
    ["// 2025년 1월 3주차의 시작일", "// Start date of 2025 January week 3"],
    ["//#region Getters (읽기 전용)", "//#region Getters (read-only)"],
    ["/** 날짜 세팅이 제대로 되었는지 여부 */", "/** Whether the date is set correctly */"],
    ["/** 요일 (일~토: 0~6) */", "/** Day of week (Sun-Sat: 0-6) */"],
    [
      "//#region 불변 변환 메서드 (새 인스턴스 반환)",
      "//#region Immutable transformation methods (return new instance)",
    ],
    ["/** 지정된 연도로 새 인스턴스 반환 */", "/** Return new instance with specified year */"],
    [
      "* 지정된 월로 새 DateOnly 인스턴스를 반환",
      "* Return new DateOnly instance with specified month",
    ],
    [
      "* @param month 설정할 월 (1-12, 범위 외 값은 연도 조정)",
      "* @param month Month to set (1-12, out-of-range values adjust the year)",
    ],
    [
      "* @note 대상 월의 일수보다 현재 일자가 크면 해당 월의 마지막 날로 조정됨",
      "* @note If the current day exceeds the target month's days, it is adjusted to the last day of that month",
    ],
    [
      "*       (예: 1월 31일에서 setMonth(2) → 2월 28일 또는 29일)",
      "*       (e.g., setMonth(2) from Jan 31 -> Feb 28 or 29)",
    ],
    [
      "* 지정된 일자로 새 DateOnly 인스턴스를 반환",
      "* Return new DateOnly instance with specified day",
    ],
    ["* @param day 설정할 일자", "* @param day Day to set"],
    [
      "* @note 해당 월의 유효 범위를 벗어나는 일자는 JavaScript Date 기본 동작에 따라",
      "* @note Days outside the valid range for the month follow JavaScript Date default behavior",
    ],
    [
      "*       자동으로 다음/이전 달로 조정됨 (예: 1월에 day=32 → 2월 1일)",
      "*       and are automatically adjusted to the next/previous month (e.g., day=32 in January -> Feb 1)",
    ],
    [
      "//#region 산술 메서드 (새 인스턴스 반환)",
      "//#region Arithmetic methods (return new instance)",
    ],
    [
      "/** 지정된 연수를 더한 새 인스턴스 반환 */",
      "/** Return new instance with specified years added */",
    ],
    [
      "/** 지정된 월수를 더한 새 인스턴스 반환 */",
      "/** Return new instance with specified months added */",
    ],
    [
      "/** 지정된 일수를 더한 새 인스턴스 반환 */",
      "/** Return new instance with specified days added */",
    ],
    ["//#region 포맷팅", "//#region Formatting"],
    ["* 지정된 포맷으로 문자열 변환", "* Convert to string with specified format"],
    ["* @param format 포맷 문자열", "* @param format Format string"],
    ["* @see dtFormat 지원 포맷 문자열 참조", "* @see dtFormat for supported format strings"],
  ],

  "packages/core-common/src/types/date-time.ts": [
    ["* 날짜시간 클래스 (불변)", "* DateTime class (immutable)"],
    [
      "* JavaScript Date 객체를 래핑하여 불변성과 편리한 API를 제공한다.",
      "* Wraps JavaScript Date object to provide immutability and a convenient API.",
    ],
    [
      "* 밀리초 단위까지 지원하며, 로컬 타임존을 기준으로 동작한다.",
      "* Supports up to millisecond precision and operates based on the local timezone.",
    ],
    ["/** 현재 시간으로 생성 */", "/** Create with current time */"],
    [
      "/** 연월일시분초밀리초로 생성 */",
      "/** Create with year, month, day, hour, minute, second, millisecond */",
    ],
    ["/** tick (밀리초)으로 생성 */", "/** Create from tick (milliseconds) */"],
    ["/** Date 객체로 생성 */", "/** Create from Date object */"],
    [
      "* 문자열을 파싱하여 DateTime 인스턴스를 생성",
      "* Parse a string to create a DateTime instance",
    ],
    ["* @param str 날짜시간 문자열", "* @param str DateTime string"],
    ["* @returns 파싱된 DateTime 인스턴스", "* @returns Parsed DateTime instance"],
    [
      "* @throws ArgumentError 지원하지 않는 형식인 경우",
      "* @throws ArgumentError if the format is not supported",
    ],
    ["/** 요일 (일~토: 0~6) */", "/** Day of week (Sun-Sat: 0-6) */"],
    ["/** 날짜시간 세팅이 제대로 되었는지 여부 */", "/** Whether the datetime is set correctly */"],
    ["//#region Getters (읽기 전용)", "//#region Getters (read-only)"],
    [
      "//#region 불변 변환 메서드 (새 인스턴스 반환)",
      "//#region Immutable transformation methods (return new instance)",
    ],
    ["/** 지정된 연도로 새 인스턴스 반환 */", "/** Return new instance with specified year */"],
    [
      "* 지정된 월로 새 DateTime 인스턴스를 반환",
      "* Return new DateTime instance with specified month",
    ],
    [
      "* @param month 설정할 월 (1-12, 범위 외 값은 연도 조정)",
      "* @param month Month to set (1-12, out-of-range values adjust the year)",
    ],
    [
      "* @note 대상 월의 일수보다 현재 일자가 크면 해당 월의 마지막 날로 조정됨",
      "* @note If the current day exceeds the target month's days, it is adjusted to the last day of that month",
    ],
    [
      "*       (예: 1월 31일에서 setMonth(2) → 2월 28일 또는 29일)",
      "*       (e.g., setMonth(2) from Jan 31 -> Feb 28 or 29)",
    ],
    [
      "* 지정된 일자로 새 DateTime 인스턴스를 반환",
      "* Return new DateTime instance with specified day",
    ],
    ["* @param day 설정할 일자", "* @param day Day to set"],
    [
      "* @note 해당 월의 유효 범위를 벗어나는 일자는 JavaScript Date 기본 동작에 따라",
      "* @note Days outside the valid range for the month follow JavaScript Date default behavior",
    ],
    [
      "*       자동으로 다음/이전 달로 조정됨 (예: 1월에 day=32 → 2월 1일)",
      "*       and are automatically adjusted to the next/previous month (e.g., day=32 in January -> Feb 1)",
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
      "//#region Arithmetic methods (return new instance)",
    ],
    [
      "/** 지정된 연수를 더한 새 인스턴스 반환 */",
      "/** Return new instance with specified years added */",
    ],
    [
      "/** 지정된 월수를 더한 새 인스턴스 반환 */",
      "/** Return new instance with specified months added */",
    ],
    [
      "/** 지정된 일수를 더한 새 인스턴스 반환 */",
      "/** Return new instance with specified days added */",
    ],
    [
      "/** 지정된 시간을 더한 새 인스턴스 반환 */",
      "/** Return new instance with specified hours added */",
    ],
    [
      "/** 지정된 분을 더한 새 인스턴스 반환 */",
      "/** Return new instance with specified minutes added */",
    ],
    [
      "/** 지정된 초를 더한 새 인스턴스 반환 */",
      "/** Return new instance with specified seconds added */",
    ],
    [
      "/** 지정된 밀리초를 더한 새 인스턴스 반환 */",
      "/** Return new instance with specified milliseconds added */",
    ],
    ["//#region 포맷팅", "//#region Formatting"],
    ["* 지정된 포맷으로 문자열 변환", "* Convert to string with specified format"],
    ["* @param format 포맷 문자열", "* @param format Format string"],
    ["* @see dtFormat 지원 포맷 문자열 참조", "* @see dtFormat for supported format strings"],
  ],
};

let totalFiles = 0;
let totalReplacements = 0;

for (const [relFile, edits] of Object.entries(fileEdits)) {
  const filePath = path.join(BASE, relFile);
  let content = fs.readFileSync(filePath, "utf8");
  let fileReplacements = 0;

  for (const [from, to] of edits) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      fileReplacements++;
    }
  }

  if (fileReplacements > 0) {
    fs.writeFileSync(filePath, content, "utf8");
    totalFiles++;
    totalReplacements += fileReplacements;
    console.log(`Updated: ${relFile} (${fileReplacements} replacements)`);
  } else {
    console.log(`No changes: ${relFile}`);
  }
}

console.log(`\nTotal: ${totalFiles} files, ${totalReplacements} replacements`);
