# core-common 코드 리뷰 개선 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 코드 리뷰에서 발견된 8건의 개선 사항을 core-common 패키지에 적용한다.

**Architecture:** 모두 core-common 패키지 내부 변경이며 외부 패키지에 영향 최소화. 리네이밍은 export 유지 + deprecated 별칭 없이 직접 변경. 테스트로 검증.

**Tech Stack:** TypeScript, Vitest (`--project=node`)

---

### Task 1: `format` → `formatDate` 리네이밍

**Files:**

- Modify: `packages/core-common/src/utils/date-format.ts:123` — 함수명 변경
- Modify: `packages/core-common/src/types/date-time.ts:285` — import/호출부 변경
- Modify: `packages/core-common/src/types/date-only.ts:317` — import/호출부 변경
- Modify: `packages/core-common/src/types/time.ts:205` — import/호출부 변경
- Modify: `packages/core-common/tests/utils/date-format.spec.ts:2` — import 변경 + 모든 호출부

**Step 1: `date-format.ts`에서 함수명과 JSDoc 변경**

`format` → `formatDate`로 변경 (함수 선언부와 JSDoc @example).

**Step 2: 내부 호출부 3곳 수정**

- `date-time.ts`: `import { format }` → `import { formatDate }`, 호출부 `format(` → `formatDate(`
- `date-only.ts`: 동일
- `time.ts`: 동일

**Step 3: 테스트 파일 수정**

`date-format.spec.ts`의 `import { format }` → `import { formatDate }`, 모든 `format(` 호출을 `formatDate(`로 변경.

**Step 4: 테스트 실행**

Run: `pnpm vitest packages/core-common/tests/utils/date-format.spec.ts --project=node --run`
Expected: PASS

**Step 5: 타입체크**

Run: `pnpm typecheck packages/core-common`
Expected: 에러 없음

---

### Task 2: `hideBytes` → `redactBytes` 리네이밍

**Files:**

- Modify: `packages/core-common/src/utils/json.ts:29,41,105,212` — 옵션명 + 에러 메시지 변경
- Modify: `packages/core-common/tests/utils/json.spec.ts:110,112,434,436,438,440` — 테스트 옵션명 변경

**Step 1: `json.ts` 소스 변경**

- JSDoc: `@param options.hideBytes` → `@param options.redactBytes`
- 인터페이스: `hideBytes?: boolean` → `redactBytes?: boolean`
- 구현부: `options?.hideBytes` → `options?.redactBytes`
- 에러 메시지: `"hideBytes 옵션으로"` → `"redactBytes 옵션으로"`

**Step 2: 테스트 파일 변경**

- `{ hideBytes: true }` → `{ redactBytes: true }` (2곳)
- 테스트 설명과 주석의 `hideBytes` → `redactBytes`

**Step 3: 테스트 실행**

Run: `pnpm vitest packages/core-common/tests/utils/json.spec.ts --project=node --run`
Expected: PASS

---

### Task 3: `EqualOptions.includes/excludes` → `topLevelIncludes/topLevelExcludes` 리네이밍

**Files:**

- Modify: `packages/core-common/src/utils/obj.ts:136-139,152-155,231-258,337-348,361-363,505-510` — 옵션명 변경
- Modify: `packages/core-common/tests/utils/object.spec.ts:273-281` — 테스트 옵션명 변경

**Step 1: `EqualOptions` 인터페이스 변경**

```typescript
export interface EqualOptions {
  /** 비교할 키 목록. 지정 시 해당 키만 비교 (최상위 레벨에만 적용) */
  topLevelIncludes?: string[];
  /** 비교에서 제외할 키 목록 (최상위 레벨에만 적용) */
  topLevelExcludes?: string[];
  /** 배열 순서 무시 여부. true 시 O(n² 복잡도 */
  ignoreArrayIndex?: boolean;
  /** 얕은 비교 여부. true 시 1단계만 비교 (참조 비교) */
  onlyOneDepth?: boolean;
}
```

**Step 2: 구현부 변경**

`objEqualObject` 함수 내에서:

- `options?.includes` → `options?.topLevelIncludes`
- `options?.excludes` → `options?.topLevelExcludes`

주석도 동일하게 변경.

`ObjMerge3KeyOptions`의 `keys`/`excludes` 는 다른 인터페이스이므로 **변경하지 않음**.

**Step 3: JSDoc 변경**

`objEqual` 함수의 `@param options.includes` → `@param options.topLevelIncludes` 등.

**Step 4: 테스트 파일 변경**

```typescript
// Before
expect(objEqual(obj1, obj2, { includes: ["a"] })).toBe(true);
expect(objEqual(obj1, obj2, { excludes: ["b", "c"] })).toBe(true);
// After
expect(objEqual(obj1, obj2, { topLevelIncludes: ["a"] })).toBe(true);
expect(objEqual(obj1, obj2, { topLevelExcludes: ["b", "c"] })).toBe(true);
```

**Step 5: 테스트 실행**

Run: `pnpm vitest packages/core-common/tests/utils/object.spec.ts --project=node --run`
Expected: PASS

---

### Task 4: `obj*` 함수에 `@internal` 태그 추가

**Files:**

- Modify: `packages/core-common/src/utils/obj.ts` — JSDoc에 `@internal` 추가

**대상 함수 (외부 사용 없거나 극히 드문 것):**

- `objGetChainValueByDepth` — 외부 사용 없음
- `objNullToUndefined` — 내부(json.ts)에서만 사용
- `objUnflatten` — 외부 사용 없음
- `objClearUndefined` — orm-common 2곳에서만 사용
- `objClear` — 외부 사용 확인 필요
- `objOmitByFilter` — 외부 사용 없음

**Step 1: 대상 함수의 JSDoc에 `@internal` 태그 추가**

각 함수의 기존 JSDoc 첫 줄 아래에 `@internal` 추가. 예:

```typescript
/**
 * 체인 경로의 값 삭제
 * @internal
 * @example objDeleteChainValue(obj, "a.b[0].c")
 */
```

**Step 2: 타입체크**

Run: `pnpm typecheck packages/core-common`
Expected: 에러 없음

---

### Task 5: `LazyGcMap.gcInterval`에 기본값 추가

**Files:**

- Modify: `packages/core-common/src/types/lazy-gc-map.ts:55-61` — `gcInterval`을 optional로 변경 + 기본값 적용
- Test: `packages/core-common/tests/types/` — 기존 테스트 확인 또는 새 테스트 추가 필요

**Step 1: 기존 테스트 파일 확인**

`packages/core-common/tests/` 디렉토리에서 `lazy-gc-map` 관련 테스트가 있는지 확인.

**Step 2: 생성자 옵션 타입 변경**

```typescript
constructor(
  private readonly _options: {
    gcInterval?: number;  // optional로 변경
    expireTime: number;
    onExpire?: (key: K, value: V) => void | Promise<void>;
  },
) {
  LazyGcMap._registry?.register(this, this._instanceId);
}
```

**Step 3: `_startGc()`에서 기본값 적용**

```typescript
private _startGc(): void {
  if (this._isDestroyed) return;
  if (this._gcTimer != null) return;

  const interval = this._options.gcInterval ?? Math.max(this._options.expireTime / 10, 1000);
  this._gcTimer = setInterval(() => {
    void this._runGc();
  }, interval);
}
```

기본값 로직: `expireTime / 10` (최소 1초). expireTime이 60초이면 gcInterval은 6초.

**Step 4: JSDoc 업데이트**

```typescript
/** @param _options.gcInterval GC 주기 (밀리초). 기본값: expireTime의 1/10 (최소 1000ms) */
```

**Step 5: 테스트 실행**

Run: `pnpm vitest packages/core-common --project=node --run`
Expected: PASS (기존 테스트는 gcInterval을 명시적으로 전달하므로 영향 없음)

---

### Task 6: 12시간→24시간 변환 헬퍼 추출

**Files:**

- Modify: `packages/core-common/src/utils/date-format.ts` — `convert12To24` 함수 추가
- Modify: `packages/core-common/src/types/date-time.ts:77-87` — 헬퍼 호출로 대체
- Modify: `packages/core-common/src/types/time.ts:72-83` — 헬퍼 호출로 대체

**Step 1: `date-format.ts`에 헬퍼 함수 추가**

`normalizeMonth` 아래에 추가:

```typescript
/**
 * 12시간제를 24시간제로 변환
 * - 오전 12시 = 0시, 오후 12시 = 12시
 * - 오전 1-11시 = 1-11시, 오후 1-11시 = 13-23시
 *
 * @param rawHour 12시간제 시 (1-12)
 * @param isPM 오후 여부
 * @returns 24시간제 시 (0-23)
 */
export function convert12To24(rawHour: number, isPM: boolean): number {
  if (rawHour === 12) {
    return isPM ? 12 : 0;
  }
  return isPM ? rawHour + 12 : rawHour;
}
```

**Step 2: `date-time.ts`에서 헬퍼 사용**

```typescript
// Before (77-87행):
let hour: number;
if (rawHour === 12) {
  hour = isPM ? 12 : 0;
} else {
  hour = isPM ? rawHour + 12 : rawHour;
}

// After:
const hour = convert12To24(rawHour, isPM);
```

import에 `convert12To24` 추가.

**Step 3: `time.ts`에서 동일하게 변경**

**Step 4: 테스트 실행**

Run: `pnpm vitest packages/core-common --project=node --run`
Expected: 기존 DateTime.parse/Time.parse 테스트 PASS

---

### Task 7: Map/Set 확장 등록 패턴 통일

**Files:**

- Modify: `packages/core-common/src/extensions/map-ext.ts:59-74` — `Object.defineProperty` 패턴으로 변경
- Modify: `packages/core-common/src/extensions/set-ext.ts:38-58` — `Object.defineProperty` 패턴으로 변경

**Step 1: `map-ext.ts` 변경**

```typescript
// Before:
Map.prototype.getOrCreate = function <K, V>(this: Map<K, V>, key: K, newValue: V | (() => V)): V {
  // ...
};

Map.prototype.update = function <K, V>(this: Map<K, V>, key: K, updateFn: (v: V | undefined) => V): void {
  // ...
};

// After:
Object.defineProperty(Map.prototype, "getOrCreate", {
  value: function <K, V>(this: Map<K, V>, key: K, newValue: V | (() => V)): V {
    if (!this.has(key)) {
      if (typeof newValue === "function") {
        this.set(key, (newValue as () => V)());
      } else {
        this.set(key, newValue);
      }
    }
    return this.get(key)!;
  },
  enumerable: false,
  writable: true,
  configurable: true,
});

Object.defineProperty(Map.prototype, "update", {
  value: function <K, V>(this: Map<K, V>, key: K, updateFn: (v: V | undefined) => V): void {
    const val = this.get(key);
    const res = updateFn(val);
    this.set(key, res);
  },
  enumerable: false,
  writable: true,
  configurable: true,
});
```

**Step 2: `set-ext.ts` 변경**

IIFE 패턴을 제거하고 `Object.defineProperty` 패턴으로 변경:

```typescript
// Before:
((prototype) => {
  prototype.adds = function ...
  prototype.toggle = function ...
})(Set.prototype);

// After:
Object.defineProperty(Set.prototype, "adds", {
  value: function <T>(this: Set<T>, ...values: T[]): Set<T> {
    for (const val of values) {
      this.add(val);
    }
    return this;
  },
  enumerable: false,
  writable: true,
  configurable: true,
});

Object.defineProperty(Set.prototype, "toggle", {
  value: function <T>(this: Set<T>, value: T, addOrDel?: "add" | "del"): Set<T> {
    if (addOrDel === "add") {
      this.add(value);
    } else if (addOrDel === "del") {
      this.delete(value);
    } else if (this.has(value)) {
      this.delete(value);
    } else {
      this.add(value);
    }
    return this;
  },
  enumerable: false,
  writable: true,
  configurable: true,
});
```

**Step 3: 테스트 실행**

Run: `pnpm vitest packages/core-common --project=node --run`
Expected: PASS

---

### Task 8: `transferableEncode`에 `try/finally` 추가

**Files:**

- Modify: `packages/core-common/src/utils/transferable.ts:67-173` — `ancestors.add/delete`를 `try/finally`로 감싸기

**Step 1: `encodeImpl` 함수의 ancestors 처리를 try/finally로 변경**

```typescript
function encodeImpl(
  obj: unknown,
  transferList: Transferable[],
  path: (string | number)[],
  ancestors: Set<object>,
  cache: Map<object, unknown>,
): unknown {
  if (obj == null) return obj;

  // 객체 타입 처리: 순환 감지 + 캐시
  if (typeof obj === "object") {
    if (ancestors.has(obj)) {
      const currentPath = path.length > 0 ? path.join(".") : "root";
      throw new TypeError(`순환 참조가 감지되었습니다: ${currentPath}`);
    }

    const cached = cache.get(obj);
    if (cached !== undefined) return cached;

    ancestors.add(obj);
  }

  try {
    let result: unknown;

    // ... (기존 인코딩 로직 그대로, 82행~167행)

    // 캐시 저장
    if (typeof obj === "object") {
      cache.set(obj, result);
    }

    return result;
  } finally {
    // 재귀 스택에서 제거 (예외 시에도 반드시 실행)
    if (typeof obj === "object" && obj !== null) {
      ancestors.delete(obj);
    }
  }
}
```

핵심 변경:

- `ancestors.add(obj)` 이후의 모든 로직을 `try` 블록으로 감쌈
- `ancestors.delete(obj)`를 `finally` 블록으로 이동
- `cache.set(obj, result)`는 `try` 블록 내부에 유지 (성공 시에만 캐시)

**Step 2: 테스트 실행**

Run: `pnpm vitest packages/core-common/tests/utils/transferable.spec.ts --project=node --run`
Expected: PASS

---

### Task 9: 최종 검증

**Step 1: 전체 타입체크**

Run: `pnpm typecheck packages/core-common`

**Step 2: 전체 린트**

Run: `pnpm lint packages/core-common`

**Step 3: 전체 테스트**

Run: `pnpm vitest packages/core-common --project=node --run`

**Step 4: 커밋**

```bash
git add packages/core-common/src packages/core-common/tests
git commit -m "refactor(core-common): 코드 리뷰 개선 8건 적용

- format → formatDate 리네이밍
- hideBytes → redactBytes 리네이밍
- EqualOptions.includes/excludes → topLevelIncludes/topLevelExcludes
- obj* 저빈도 함수에 @internal 태그 추가
- LazyGcMap.gcInterval에 기본값 추가
- 12h→24h 변환 헬퍼(convert12To24) 추출
- Map/Set 확장 등록 패턴을 Object.defineProperty로 통일
- transferableEncode ancestors 정리를 try/finally로 변경

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
