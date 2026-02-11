# result-parser.ts 2단계 최적화 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `serializeGroupKey` 키 순서 캐싱 및 `JSON.stringify`를 `serializeGroupKey`로 대체하여 처리 속도를 개선한다.

**Architecture:** `serializeGroupKey` 함수에 선택적 `cachedKeyOrder` 파라미터를 추가하고, 호출부에서 캐싱을 관리한다. `JSON.stringify` 호출을 `serializeGroupKey`로 대체한다.

**Tech Stack:** TypeScript, Vitest

---

## Task 1: serializeGroupKey 시그니처 변경

**Files:**

- Modify: `packages/orm-common/src/utils/result-parser.ts:247-250`

**Step 1: 함수 시그니처 변경**

```typescript
// Before
function serializeGroupKey(groupKey: Record<string, unknown>): string {
  const entries = Object.entries(groupKey).sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([k, v]) => `${k}:${v === null ? "null" : String(v)}`).join("|");
}

// After
function serializeGroupKey(groupKey: Record<string, unknown>, cachedKeyOrder?: string[]): string {
  const keys = cachedKeyOrder ?? Object.keys(groupKey).sort((a, b) => a.localeCompare(b));
  return keys.map((k) => `${k}:${groupKey[k] === null ? "null" : String(groupKey[k])}`).join("|");
}
```

**Step 2: 테스트 실행**

Run: `pnpm vitest packages/orm-common/tests/utils/result-parser.spec.ts --run`
Expected: 68 tests PASS

**Step 3: Commit**

```bash
git commit -m "perf(orm-common): serializeGroupKey에 cachedKeyOrder 파라미터 추가"
```

---

## Task 2: groupRecordsRecursively에서 키 순서 캐싱

**Files:**

- Modify: `packages/orm-common/src/utils/result-parser.ts:289-293`

**Step 1: 캐싱 로직 추가**

```typescript
// groupRecordsRecursively 함수 내부, Line 287 이후

// Before
for (const record of records) {
  const groupKey = extractGroupKey(record, childJoinKeys);
  const keyStr = serializeGroupKey(groupKey);
  // ...
}

// After
let groupKeyOrder: string[] | undefined;

for (const record of records) {
  const groupKey = extractGroupKey(record, childJoinKeys);
  if (groupKeyOrder == null) {
    groupKeyOrder = Object.keys(groupKey).sort((a, b) => a.localeCompare(b));
  }
  const keyStr = serializeGroupKey(groupKey, groupKeyOrder);
  // ...
}
```

**Step 2: 테스트 실행**

Run: `pnpm vitest packages/orm-common/tests/utils/result-parser.spec.ts --run`
Expected: 68 tests PASS

**Step 3: Commit**

```bash
git commit -m "perf(orm-common): groupRecordsRecursively에서 키 순서 캐싱"
```

---

## Task 3: JSON.stringify를 serializeGroupKey로 대체

**Files:**

- Modify: `packages/orm-common/src/utils/result-parser.ts:422,426`

**Step 1: Line 422 수정**

```typescript
// Before
existingGroup[hashSetKey] = new Set([JSON.stringify(newJoinData)]);

// After
existingGroup[hashSetKey] = new Set([serializeGroupKey(newJoinData)]);
```

**Step 2: Line 426 수정**

```typescript
// Before
const newHash = JSON.stringify(newJoinData);

// After
const newHash = serializeGroupKey(newJoinData);
```

**Step 3: 테스트 실행**

Run: `pnpm vitest packages/orm-common/tests/utils/result-parser.spec.ts --run`
Expected: 68 tests PASS

**Step 4: Commit**

```bash
git commit -m "perf(orm-common): JSON.stringify를 serializeGroupKey로 대체"
```

---

## Task 4: 최종 검증

**Step 1: 전체 orm-common 테스트**

Run: `pnpm vitest packages/orm-common --run`
Expected: 2440+ tests PASS

**Step 2: 성능 테스트**

Run: `pnpm vitest packages/orm-common/tests/utils/result-parser-perf.spec.ts --run --project=node`
Expected: 모든 테스트 통과, baseline 대비 개선

**Step 3: 타입체크**

Run: `pnpm typecheck packages/orm-common`
Expected: 0 errors

**Step 4: 린트**

Run: `pnpm lint packages/orm-common`
Expected: 0 errors

**Step 5: Commit**

```bash
git commit -m "perf(orm-common): 2단계 최적화 완료" --allow-empty
```

---

## 완료 후 체크리스트

- [ ] 모든 테스트 통과
- [ ] 성능 테스트 baseline 대비 개선 확인
- [ ] 타입체크 통과
- [ ] 린트 통과
- [ ] 4개 커밋 생성
