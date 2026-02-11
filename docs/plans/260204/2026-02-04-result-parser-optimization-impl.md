# result-parser.ts objClone 제거 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `objClone` 호출을 제거하여 대용량 쿼리 결과 처리 속도를 개선한다.

**Architecture:** `flatToNested`가 이미 새 객체를 생성하므로, 이중 복사인 `objClone` 호출 4곳을 제거/대체한다. Line 304만 얕은 복사(`{ ...record }`)로 대체하고, 나머지 3곳은 참조를 직접 사용한다.

**Tech Stack:** TypeScript, Vitest

---

## Task 1: Line 304 - objClone(record) → { ...record }

**Files:**

- Modify: `packages/orm-common/src/utils/result-parser.ts:304`
- Test: `packages/orm-common/tests/utils/result-parser.spec.ts`

**Step 1: 현재 테스트 통과 확인**

Run: `pnpm vitest packages/orm-common/tests/utils/result-parser.spec.ts --run`
Expected: 34 tests PASS (node + browser 각각)

**Step 2: Line 304 수정**

`packages/orm-common/src/utils/result-parser.ts`의 Line 304:

```typescript
// Before
const newGroup = objClone(record);

// After
const newGroup = { ...record };
```

**Step 3: 테스트 실행하여 통과 확인**

Run: `pnpm vitest packages/orm-common/tests/utils/result-parser.spec.ts --run`
Expected: 34 tests PASS

**Step 4: Commit**

```bash
git add packages/orm-common/src/utils/result-parser.ts
git commit -m "perf(orm-common): Line 304 objClone을 얕은 복사로 대체"
```

---

## Task 2: Line 414 - objClone(newJoinData) 제거

**Files:**

- Modify: `packages/orm-common/src/utils/result-parser.ts:414`

**Step 1: Line 414 수정**

```typescript
// Before
existingGroup[localKey] = objClone(newJoinData);

// After
existingGroup[localKey] = newJoinData;
```

**Step 2: 테스트 실행하여 통과 확인**

Run: `pnpm vitest packages/orm-common/tests/utils/result-parser.spec.ts --run`
Expected: 34 tests PASS

**Step 3: Commit**

```bash
git add packages/orm-common/src/utils/result-parser.ts
git commit -m "perf(orm-common): Line 414 objClone 제거 (isSingle 관계)"
```

---

## Task 3: Line 420 - [objClone(newJoinData)] 제거

**Files:**

- Modify: `packages/orm-common/src/utils/result-parser.ts:420`

**Step 1: Line 420 수정**

```typescript
// Before
existingGroup[localKey] = [objClone(newJoinData)];

// After
existingGroup[localKey] = [newJoinData];
```

**Step 2: 테스트 실행하여 통과 확인**

Run: `pnpm vitest packages/orm-common/tests/utils/result-parser.spec.ts --run`
Expected: 34 tests PASS

**Step 3: Commit**

```bash
git add packages/orm-common/src/utils/result-parser.ts
git commit -m "perf(orm-common): Line 420 objClone 제거 (배열 첫 항목)"
```

---

## Task 4: Line 430 - objClone(newJoinData) 제거

**Files:**

- Modify: `packages/orm-common/src/utils/result-parser.ts:430`

**Step 1: Line 430 수정**

```typescript
// Before
existingJoinData.push(objClone(newJoinData));

// After
existingJoinData.push(newJoinData);
```

**Step 2: 테스트 실행하여 통과 확인**

Run: `pnpm vitest packages/orm-common/tests/utils/result-parser.spec.ts --run`
Expected: 34 tests PASS

**Step 3: Commit**

```bash
git add packages/orm-common/src/utils/result-parser.ts
git commit -m "perf(orm-common): Line 430 objClone 제거 (배열 추가 항목)"
```

---

## Task 5: objClone import 제거 및 최종 검증

**Files:**

- Modify: `packages/orm-common/src/utils/result-parser.ts:1`

**Step 1: import에서 objClone 제거**

```typescript
// Before
import { bytesFromHex, DateOnly, DateTime, objClone, objEqual, Time, Uuid } from "@simplysm/core-common";

// After
import { bytesFromHex, DateOnly, DateTime, objEqual, Time, Uuid } from "@simplysm/core-common";
```

**Step 2: 전체 orm-common 테스트 실행**

Run: `pnpm vitest packages/orm-common --run`
Expected: 2434 tests PASS

**Step 3: 타입체크**

Run: `pnpm typecheck packages/orm-common`
Expected: 0 errors

**Step 4: 린트**

Run: `pnpm lint packages/orm-common`
Expected: 0 errors, 0 warnings

**Step 5: Commit**

```bash
git add packages/orm-common/src/utils/result-parser.ts
git commit -m "perf(orm-common): objClone import 제거 - 1단계 최적화 완료"
```

---

## 완료 후 체크리스트

- [ ] 모든 테스트 통과 (2434개)
- [ ] 타입체크 통과
- [ ] 린트 통과
- [ ] 5개 커밋 생성
