# core-common 코드 리뷰 수정 구현 플랜

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** core-common 코드 리뷰에서 도출된 7개 액션 아이템을 모두 구현

**Architecture:** 기존 코드의 안정성/성능/정확성 개선. 새로운 패턴 도입 없이 기존 패턴 내에서 수정.

**Tech Stack:** TypeScript, Vitest

---

### Task 1: `env.ts` — `??` → `||` 변경

**Files:**

- Modify: `packages/core-common/src/env.ts:8`

**Step 1: 수정**

```typescript
// packages/core-common/src/env.ts:8
// Before:
DEV: JSON.parse(process.env.DEV ?? "false"),
// After:
DEV: JSON.parse(process.env.DEV || "false"),
```

빈 문자열 `""`일 때 `??`는 통과시켜 `JSON.parse("")` SyntaxError 발생. `||`는 빈 문자열도 falsy로 처리하여 `"false"` 폴백.

**Step 2: 타입체크**

Run: `pnpm typecheck packages/core-common`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/core-common/src/env.ts
git commit -m "fix(core-common): env.ts에서 ?? 대신 || 사용하여 빈 문자열 안전 처리"
```

---

### Task 2: `lazy-gc-map.ts` — `_isDestroyed` 가드 추가

**Files:**

- Modify: `packages/core-common/src/types/lazy-gc-map.ts`
- Test: `packages/core-common/tests/types/lazy-gc-map.spec.ts`

**Step 1: 테스트 작성**

기존 `lazy-gc-map.spec.ts` 파일 끝에 추가:

```typescript
describe("dispose 후 안전성", () => {
  it("dispose 후 get은 undefined를 반환한다", () => {
    const map = new LazyGcMap<string, number>({ gcInterval: 10000, expireTime: 60000 });
    map.set("a", 1);
    map.dispose();
    expect(map.get("a")).toBeUndefined();
  });

  it("dispose 후 set은 무시된다", () => {
    const map = new LazyGcMap<string, number>({ gcInterval: 10000, expireTime: 60000 });
    map.dispose();
    map.set("a", 1);
    expect(map.size).toBe(0);
  });

  it("dispose 후 has는 false를 반환한다", () => {
    const map = new LazyGcMap<string, number>({ gcInterval: 10000, expireTime: 60000 });
    map.set("a", 1);
    map.dispose();
    expect(map.has("a")).toBe(false);
  });

  it("dispose 후 delete는 false를 반환한다", () => {
    const map = new LazyGcMap<string, number>({ gcInterval: 10000, expireTime: 60000 });
    map.set("a", 1);
    map.dispose();
    expect(map.delete("a")).toBe(false);
  });

  it("dispose 후 getOrCreate는 에러를 던진다", () => {
    const map = new LazyGcMap<string, number>({ gcInterval: 10000, expireTime: 60000 });
    map.dispose();
    expect(() => map.getOrCreate("a", () => 1)).toThrow();
  });

  it("dispose 후 clear는 에러 없이 무시된다", () => {
    const map = new LazyGcMap<string, number>({ gcInterval: 10000, expireTime: 60000 });
    map.dispose();
    expect(() => map.clear()).not.toThrow();
  });

  it("dispose 후 values는 빈 이터레이터를 반환한다", () => {
    const map = new LazyGcMap<string, number>({ gcInterval: 10000, expireTime: 60000 });
    map.set("a", 1);
    map.dispose();
    expect([...map.values()]).toEqual([]);
  });

  it("dispose 후 keys는 빈 이터레이터를 반환한다", () => {
    const map = new LazyGcMap<string, number>({ gcInterval: 10000, expireTime: 60000 });
    map.set("a", 1);
    map.dispose();
    expect([...map.keys()]).toEqual([]);
  });

  it("dispose 후 entries는 빈 이터레이터를 반환한다", () => {
    const map = new LazyGcMap<string, number>({ gcInterval: 10000, expireTime: 60000 });
    map.set("a", 1);
    map.dispose();
    expect([...map.entries()]).toEqual([]);
  });
});
```

**Step 2: 테스트 실패 확인**

Run: `pnpm vitest packages/core-common/tests/types/lazy-gc-map.spec.ts --project=node --run`
Expected: FAIL (dispose 후에도 값이 반환됨)

**Step 3: 구현**

`packages/core-common/src/types/lazy-gc-map.ts`의 각 메서드에 가드 추가:

```typescript
has(key: K): boolean {
  if (this._isDestroyed) return false;
  return this._map.has(key);
}

get(key: K): V | undefined {
  if (this._isDestroyed) return undefined;
  // ... 기존 로직
}

set(key: K, value: V): void {
  if (this._isDestroyed) return;
  // ... 기존 로직
}

delete(key: K): boolean {
  if (this._isDestroyed) return false;
  // ... 기존 로직
}

getOrCreate(key: K, factory: () => V): V {
  if (this._isDestroyed) {
    throw new Error("LazyGcMap이 이미 dispose되었습니다.");
  }
  // ... 기존 로직
}

clear(): void {
  if (this._isDestroyed) return;
  // ... 기존 로직
}

*values(): IterableIterator<V> {
  if (this._isDestroyed) return;
  // ... 기존 로직
}

*keys(): IterableIterator<K> {
  if (this._isDestroyed) return;
  // ... 기존 로직
}

*entries(): IterableIterator<[K, V]> {
  if (this._isDestroyed) return;
  // ... 기존 로직
}

private _startGc(): void {
  if (this._isDestroyed) return;
  // ... 기존 로직
}
```

**Step 4: 테스트 통과 확인**

Run: `pnpm vitest packages/core-common/tests/types/lazy-gc-map.spec.ts --project=node --run`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/core-common/src/types/lazy-gc-map.ts packages/core-common/tests/types/lazy-gc-map.spec.ts
git commit -m "fix(core-common): LazyGcMap dispose 후 메서드 호출 시 안전 가드 추가"
```

---

### Task 3: `obj.ts` — `objNullToUndefined` 순환 참조 감지

**Files:**

- Modify: `packages/core-common/src/utils/obj.ts:811-847`
- Test: `packages/core-common/tests/utils/object.spec.ts`

**Step 1: 테스트 작성**

기존 `object.spec.ts`에 추가:

```typescript
describe("objNullToUndefined()", () => {
  it("순환 참조가 있는 객체를 안전하게 처리한다", () => {
    const obj: Record<string, unknown> = { a: null };
    obj.self = obj; // 순환 참조
    const result = objNullToUndefined(obj);
    expect(result).toBeDefined();
    expect((result as Record<string, unknown>).a).toBeUndefined();
  });

  it("순환 참조가 있는 배열을 안전하게 처리한다", () => {
    const arr: unknown[] = [null, 1];
    arr.push(arr); // 순환 참조
    const result = objNullToUndefined(arr);
    expect(result).toBeDefined();
    expect((result as unknown[])[0]).toBeUndefined();
    expect((result as unknown[])[1]).toBe(1);
  });
});
```

**Step 2: 테스트 실패 확인**

Run: `pnpm vitest packages/core-common/tests/utils/object.spec.ts --project=node --run -t "objNullToUndefined"`
Expected: FAIL (Maximum call stack size exceeded)

**Step 3: 구현**

`packages/core-common/src/utils/obj.ts`에서 `objNullToUndefined`와 `objNullToUndefinedImpl` 수정:

```typescript
export function objNullToUndefined<T>(obj: T): T | undefined {
  return objNullToUndefinedImpl(obj, new WeakSet());
}

function objNullToUndefinedImpl<T>(obj: T, seen: WeakSet<object>): T | undefined {
  if (obj == null) {
    return undefined;
  }

  if (
    obj instanceof Date ||
    obj instanceof DateTime ||
    obj instanceof DateOnly ||
    obj instanceof Time ||
    obj instanceof Uuid
  ) {
    return obj;
  }

  if (obj instanceof Array) {
    if (seen.has(obj)) return obj;
    seen.add(obj);
    for (let i = 0; i < obj.length; i++) {
      obj[i] = objNullToUndefinedImpl(obj[i], seen);
    }
    return obj;
  }

  if (typeof obj === "object") {
    if (seen.has(obj as object)) return obj;
    seen.add(obj as object);
    const objRec = obj as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      objRec[key] = objNullToUndefinedImpl(objRec[key], seen);
    }
    return obj;
  }

  return obj;
}
```

핵심: `seen` WeakSet을 두 번째 파라미터로 전달. 배열/객체 진입 전에 `seen.has()` 체크하여 순환 시 원본 반환.

**Step 4: 테스트 통과 확인**

Run: `pnpm vitest packages/core-common/tests/utils/object.spec.ts --project=node --run`
Expected: PASS (기존 테스트 포함)

**Step 5: 커밋**

```bash
git add packages/core-common/src/utils/obj.ts packages/core-common/tests/utils/object.spec.ts
git commit -m "fix(core-common): objNullToUndefined에 WeakSet 기반 순환 참조 감지 추가"
```

---

### Task 4: `transferable.ts` — DAG 지원 (ancestors + cache)

**Files:**

- Modify: `packages/core-common/src/utils/transferable.ts`
- Test: `packages/core-common/tests/utils/transferable.spec.ts`

**Step 1: 테스트 작성**

기존 `transferable.spec.ts`에 추가:

```typescript
describe("encode() - DAG (공유 객체)", () => {
  it("동일 객체를 여러 곳에서 참조해도 에러 없이 인코딩된다", () => {
    const shared = { name: "shared" };
    const data = { a: shared, b: shared };
    const { result } = transferEncode(data);
    const decoded = result as Record<string, Record<string, string>>;
    expect(decoded.a.name).toBe("shared");
    expect(decoded.b.name).toBe("shared");
  });

  it("동일 배열을 여러 곳에서 참조해도 에러 없이 인코딩된다", () => {
    const sharedArr = [1, 2, 3];
    const data = { x: sharedArr, y: sharedArr };
    const { result } = transferEncode(data);
    const decoded = result as Record<string, number[]>;
    expect(decoded.x).toEqual([1, 2, 3]);
    expect(decoded.y).toEqual([1, 2, 3]);
  });

  it("순환 참조는 여전히 TypeError를 던진다", () => {
    const a: Record<string, unknown> = {};
    const b: Record<string, unknown> = { a };
    a.b = b;
    expect(() => transferEncode(a)).toThrow(TypeError);
  });
});
```

**Step 2: 테스트 실패 확인**

Run: `pnpm vitest packages/core-common/tests/utils/transferable.spec.ts --project=node --run -t "DAG"`
Expected: FAIL (현재 공유 객체를 순환 참조로 오인하여 TypeError)

**Step 3: 구현**

`packages/core-common/src/utils/transferable.ts` 수정:

1. JSDoc 27번줄 수정:

```typescript
// Before:
// * @note 동일 객체가 여러 곳에서 참조되면 순환 참조로 처리되어 TypeError 발생
// After:
// * @note 동일 객체가 여러 곳에서 참조되면 캐시된 인코딩 결과를 재사용합니다
```

2. `transferableEncode` 함수:

```typescript
export function transferableEncode(obj: unknown): {
  result: unknown;
  transferList: Transferable[];
} {
  const transferList: Transferable[] = [];
  const ancestors = new Set<object>();
  const cache = new Map<object, unknown>();
  const result = encodeImpl(obj, transferList, [], ancestors, cache);
  return { result, transferList };
}
```

3. `encodeImpl` 시그니처 및 로직:

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
    // 순환 참조 감지 (현재 재귀 스택에 있는 객체)
    if (ancestors.has(obj)) {
      const currentPath = path.length > 0 ? path.join(".") : "root";
      throw new TypeError(`순환 참조가 감지되었습니다: ${currentPath}`);
    }

    // 캐시 히트 → 이전 인코딩 결과 재사용
    const cached = cache.get(obj);
    if (cached !== undefined) return cached;

    // 재귀 스택에 추가
    ancestors.add(obj);
  }

  // ... 기존 인코딩 로직 (1~6번 그대로) ...

  // 참고: 각 분기의 return 전에 ancestors.delete + cache.set 필요
  // 아래처럼 각 분기를 result 변수에 담고, 마지막에 일괄 처리

  let result: unknown;

  // 1. Uint8Array
  if (obj instanceof Uint8Array) {
    const isSharedArrayBuffer = typeof SharedArrayBuffer !== "undefined" && obj.buffer instanceof SharedArrayBuffer;
    const buffer = obj.buffer as ArrayBuffer;
    if (!isSharedArrayBuffer && !transferList.includes(buffer)) {
      transferList.push(buffer);
    }
    result = obj;
  }
  // 2. 특수 타입 변환
  else if (obj instanceof Date) {
    result = { __type__: "Date", data: obj.getTime() };
  } else if (obj instanceof DateTime) {
    result = { __type__: "DateTime", data: obj.tick };
  } else if (obj instanceof DateOnly) {
    result = { __type__: "DateOnly", data: obj.tick };
  } else if (obj instanceof Time) {
    result = { __type__: "Time", data: obj.tick };
  } else if (obj instanceof Uuid) {
    result = { __type__: "Uuid", data: obj.toString() };
  } else if (obj instanceof RegExp) {
    result = { __type__: "RegExp", data: { source: obj.source, flags: obj.flags } };
  } else if (obj instanceof Error) {
    const errObj = obj as Error & { code?: unknown; detail?: unknown };
    result = {
      __type__: "Error",
      data: {
        name: errObj.name,
        message: errObj.message,
        stack: errObj.stack,
        ...(errObj.code !== undefined ? { code: errObj.code } : {}),
        ...(errObj.detail !== undefined
          ? { detail: encodeImpl(errObj.detail, transferList, [...path, "detail"], ancestors, cache) }
          : {}),
        ...(errObj.cause !== undefined
          ? { cause: encodeImpl(errObj.cause, transferList, [...path, "cause"], ancestors, cache) }
          : {}),
      },
    };
  }
  // 3. 배열 재귀
  else if (Array.isArray(obj)) {
    result = obj.map((item, idx) => encodeImpl(item, transferList, [...path, idx], ancestors, cache));
  }
  // 4. Map 재귀
  else if (obj instanceof Map) {
    let idx = 0;
    result = new Map(
      Array.from(obj.entries()).map(([k, v]) => {
        const keyPath = [...path, `Map[${idx}].key`];
        const valuePath = [...path, `Map[${idx}].value`];
        idx++;
        return [
          encodeImpl(k, transferList, keyPath, ancestors, cache),
          encodeImpl(v, transferList, valuePath, ancestors, cache),
        ];
      }),
    );
  }
  // 5. Set 재귀
  else if (obj instanceof Set) {
    let idx = 0;
    result = new Set(
      Array.from(obj).map((v) => encodeImpl(v, transferList, [...path, `Set[${idx++}]`], ancestors, cache)),
    );
  }
  // 6. 일반 객체 재귀
  else if (typeof obj === "object") {
    const res: Record<string, unknown> = {};
    const record = obj as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      res[key] = encodeImpl(record[key], transferList, [...path, key], ancestors, cache);
    }
    result = res;
  }
  // 7. 원시 타입
  else {
    return obj;
  }

  // 재귀 스택에서 제거 + 캐시 저장
  if (typeof obj === "object") {
    ancestors.delete(obj);
    cache.set(obj, result);
  }

  return result;
}
```

**Step 4: 테스트 통과 확인**

Run: `pnpm vitest packages/core-common/tests/utils/transferable.spec.ts --project=node --run`
Expected: PASS (기존 테스트 + DAG 테스트 모두)

**Step 5: 커밋**

```bash
git add packages/core-common/src/utils/transferable.ts packages/core-common/tests/utils/transferable.spec.ts
git commit -m "feat(core-common): transferable에 DAG 지원 추가 (ancestors + cache 분리)"
```

---

### Task 5: `arr-ext.ts` — `diffs()` 성능 개선

**Files:**

- Modify: `packages/core-common/src/extensions/arr-ext.ts:396-467`
- Test: `packages/core-common/tests/extensions/array-extension.spec.ts`

**Step 1: 기존 diffs 테스트 확인**

먼저 기존 diffs 테스트가 있는지 확인. 있다면 그대로 활용 (동작 변경 없으므로).

**Step 2: 구현**

`packages/core-common/src/extensions/arr-ext.ts`의 `diffs` 메서드 수정. 핵심: `uncheckedTarget.remove()` 호출을 제거하고, `uncheckedTargetSet`으로만 관리.

```typescript
diffs<T, P>(
  target: P[],
  options?: {
    keys?: string[];
    excludes?: string[];
  },
): ArrayDiffsResult<T, P>[] {
  const result: ArrayDiffsResult<T, P>[] = [];

  const uncheckedTarget = [...target];
  const uncheckedTargetSet = new Set(uncheckedTarget);
  const hasKeys = options?.keys !== undefined && options.keys.length > 0;
  const excludeOpts = { excludes: options?.excludes };

  // keys 옵션이 있는 경우 target을 keys 기준으로 Map에 미리 인덱싱하여 O(n×m) → O(n+m) 개선
  // 키 값이 같은 target이 여러 개 있을 수 있으므로 배열로 저장
  const keyIndexedTarget = hasKeys
    ? new Map<string, P[]>()
    : undefined;

  if (keyIndexedTarget) {
    for (const targetItem of uncheckedTarget) {
      const keyStr = JSON.stringify(options!.keys!.map((k) => (targetItem as Record<string, unknown>)[k]));
      const arr = keyIndexedTarget.get(keyStr);
      if (arr) {
        arr.push(targetItem);
      } else {
        keyIndexedTarget.set(keyStr, [targetItem]);
      }
    }
  }

  for (const sourceItem of this) {
    // 전체 일치(sameTarget) 우선, 없으면 키 일치(sameKeyTarget) 검색
    let sameTarget: P | undefined;
    let sameKeyTarget: P | undefined;

    // Set 기반 건너뛰기로 이미 매칭된 항목 스킵
    for (const targetItem of uncheckedTarget) {
      if (!uncheckedTargetSet.has(targetItem)) continue;
      if (objEqual(targetItem, sourceItem, excludeOpts)) {
        sameTarget = targetItem;
        break;
      }
    }

    // 전체 일치가 없고 keys 옵션이 있으면 Map에서 O(1) 조회
    if (sameTarget === undefined && keyIndexedTarget) {
      const sourceKeyStr = JSON.stringify(options!.keys!.map((k) => (sourceItem as Record<string, unknown>)[k]));
      const candidates = keyIndexedTarget.get(sourceKeyStr);
      if (candidates && candidates.length > 0) {
        sameKeyTarget = candidates.find((c) => uncheckedTargetSet.has(c));
      }
    }

    if (sameTarget !== undefined) {
      // splice 대신 Set에서만 제거 (O(1))
      uncheckedTargetSet.delete(sameTarget);
    } else if (sameKeyTarget !== undefined) {
      result.push({ source: sourceItem, target: sameKeyTarget });
      uncheckedTargetSet.delete(sameKeyTarget);
    } else {
      result.push({ source: sourceItem, target: undefined });
    }
  }

  // 미매칭 target: Set 기반으로 순회
  for (const uncheckedTargetItem of uncheckedTargetSet) {
    result.push({ source: undefined, target: uncheckedTargetItem });
  }

  return result;
},
```

**Step 3: 테스트 통과 확인**

Run: `pnpm vitest packages/core-common/tests/extensions/array-extension.spec.ts --project=node --run`
Expected: PASS (동작 변경 없음)

**Step 4: 커밋**

```bash
git add packages/core-common/src/extensions/arr-ext.ts
git commit -m "perf(core-common): diffs()에서 splice O(n) 제거, Set 기반 건너뛰기로 변경"
```

---

### Task 6: `obj.ts` — 불필요한 impl 래퍼 제거

**Files:**

- Modify: `packages/core-common/src/utils/obj.ts`

**Step 1: 구현**

4개 함수 쌍의 Impl을 인라인:

1. `objOmit` + `objOmitImpl` (585-597줄):

```typescript
export function objOmit<T extends Record<string, unknown>, K extends keyof T>(item: T, omitKeys: K[]): Omit<T, K> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(item)) {
    if (!omitKeys.includes(key as K)) {
      result[key] = item[key];
    }
  }
  return result as Omit<T, K>;
}
// objOmitImpl 삭제
```

2. `objOmitByFilter` + `objOmitByFilterImpl` (609-621줄):

```typescript
export function objOmitByFilter<T extends Record<string, unknown>>(item: T, omitKeyFn: (key: keyof T) => boolean): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(item)) {
    if (!omitKeyFn(key)) {
      result[key] = item[key];
    }
  }
  return result as T;
}
// objOmitByFilterImpl 삭제
```

3. `objPick` + `objPickImpl` (633-643줄):

```typescript
export function objPick<T extends Record<string, unknown>, K extends keyof T>(item: T, keys: K[]): Pick<T, K> {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    result[key as string] = item[key];
  }
  return result as Pick<T, K>;
}
// objPickImpl 삭제
```

4. `objClearUndefined` + `objClearUndefinedImpl` (779-792줄):

```typescript
export function objClearUndefined<T extends object>(obj: T): T {
  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (record[key] === undefined) {
      delete record[key];
    }
  }
  return obj;
}
// objClearUndefinedImpl 삭제
```

**Step 2: 테스트 통과 확인**

Run: `pnpm vitest packages/core-common/tests/utils/object.spec.ts --project=node --run`
Expected: PASS (동작 변경 없음)

**Step 3: 타입체크**

Run: `pnpm typecheck packages/core-common`
Expected: PASS

**Step 4: 커밋**

```bash
git add packages/core-common/src/utils/obj.ts
git commit -m "refactor(core-common): objOmit/objPick/objOmitByFilter/objClearUndefined impl 래퍼 제거"
```

---

### Task 7: `path.ts` / `primitive.ts` 테스트 추가

**Files:**

- Create: `packages/core-common/tests/utils/path.spec.ts`
- Create: `packages/core-common/tests/utils/primitive.spec.ts`

**Step 1: `path.spec.ts` 작성**

```typescript
import { describe, it, expect } from "vitest";
import { pathJoin, pathBasename, pathExtname } from "@simplysm/core-common";

describe("path utils", () => {
  describe("pathJoin()", () => {
    it("경로 세그먼트를 결합한다", () => {
      expect(pathJoin("a", "b", "c")).toBe("a/b/c");
    });

    it("선행 슬래시를 유지한다", () => {
      expect(pathJoin("/a", "b")).toBe("/a/b");
    });

    it("중복 슬래시를 제거한다", () => {
      expect(pathJoin("a/", "/b/", "/c")).toBe("a/b/c");
    });

    it("빈 세그먼트를 무시한다", () => {
      expect(pathJoin("a", "", "b")).toBe("a/b");
    });

    it("단일 세그먼트를 반환한다", () => {
      expect(pathJoin("a")).toBe("a");
    });

    it("빈 입력은 빈 문자열을 반환한다", () => {
      expect(pathJoin()).toBe("");
    });
  });

  describe("pathBasename()", () => {
    it("파일명을 추출한다", () => {
      expect(pathBasename("a/b/file.txt")).toBe("file.txt");
    });

    it("확장자를 제거한다", () => {
      expect(pathBasename("a/b/file.txt", ".txt")).toBe("file");
    });

    it("일치하지 않는 확장자는 무시한다", () => {
      expect(pathBasename("a/b/file.txt", ".md")).toBe("file.txt");
    });

    it("경로 없는 파일명을 처리한다", () => {
      expect(pathBasename("file.txt")).toBe("file.txt");
    });

    it("빈 문자열은 빈 문자열을 반환한다", () => {
      expect(pathBasename("")).toBe("");
    });
  });

  describe("pathExtname()", () => {
    it("확장자를 추출한다", () => {
      expect(pathExtname("file.txt")).toBe(".txt");
    });

    it("마지막 확장자만 추출한다", () => {
      expect(pathExtname("archive.tar.gz")).toBe(".gz");
    });

    it("확장자 없는 파일은 빈 문자열을 반환한다", () => {
      expect(pathExtname("Makefile")).toBe("");
    });

    it("숨김 파일은 빈 문자열을 반환한다", () => {
      expect(pathExtname(".gitignore")).toBe("");
    });

    it("경로 포함 파일의 확장자를 추출한다", () => {
      expect(pathExtname("a/b/file.ts")).toBe(".ts");
    });

    it("빈 문자열은 빈 문자열을 반환한다", () => {
      expect(pathExtname("")).toBe("");
    });
  });
});
```

**Step 2: `primitive.spec.ts` 작성**

```typescript
import { describe, it, expect } from "vitest";
import { getPrimitiveTypeStr, DateTime, DateOnly, Time, Uuid } from "@simplysm/core-common";

describe("primitive utils", () => {
  describe("getPrimitiveTypeStr()", () => {
    it("string을 반환한다", () => {
      expect(getPrimitiveTypeStr("hello")).toBe("string");
    });

    it("빈 문자열도 string을 반환한다", () => {
      expect(getPrimitiveTypeStr("")).toBe("string");
    });

    it("number를 반환한다", () => {
      expect(getPrimitiveTypeStr(42)).toBe("number");
    });

    it("0도 number를 반환한다", () => {
      expect(getPrimitiveTypeStr(0)).toBe("number");
    });

    it("NaN도 number를 반환한다", () => {
      expect(getPrimitiveTypeStr(NaN)).toBe("number");
    });

    it("boolean을 반환한다", () => {
      expect(getPrimitiveTypeStr(true)).toBe("boolean");
      expect(getPrimitiveTypeStr(false)).toBe("boolean");
    });

    it("DateTime을 반환한다", () => {
      expect(getPrimitiveTypeStr(new DateTime())).toBe("DateTime");
    });

    it("DateOnly를 반환한다", () => {
      expect(getPrimitiveTypeStr(new DateOnly())).toBe("DateOnly");
    });

    it("Time을 반환한다", () => {
      expect(getPrimitiveTypeStr(new Time())).toBe("Time");
    });

    it("Uuid를 반환한다", () => {
      expect(getPrimitiveTypeStr(Uuid.new())).toBe("Uuid");
    });

    it("Uint8Array는 Bytes를 반환한다", () => {
      expect(getPrimitiveTypeStr(new Uint8Array([1, 2]))).toBe("Bytes");
    });

    it("지원하지 않는 타입은 에러를 던진다", () => {
      expect(() => getPrimitiveTypeStr({} as never)).toThrow();
    });
  });
});
```

**Step 3: 테스트 실행**

Run: `pnpm vitest packages/core-common/tests/utils/path.spec.ts packages/core-common/tests/utils/primitive.spec.ts --project=node --run`
Expected: PASS

**Step 4: 커밋**

```bash
git add packages/core-common/tests/utils/path.spec.ts packages/core-common/tests/utils/primitive.spec.ts
git commit -m "test(core-common): path.ts, primitive.ts 테스트 추가"
```

---

### Task 8: 최종 검증

**Step 1: 전체 린트**

Run: `pnpm lint packages/core-common`
Expected: PASS

**Step 2: 전체 타입체크**

Run: `pnpm typecheck packages/core-common`
Expected: PASS

**Step 3: 전체 테스트**

Run: `pnpm vitest packages/core-common --project=node --run`
Expected: PASS
