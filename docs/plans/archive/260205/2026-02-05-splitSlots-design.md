# splitSlots 유틸리티 설계

## 개요

solid 패키지의 Compound Components 패턴에서 반복되는 slots 처리 코드를 `splitSlots` 유틸리티로 추출한다.

### 해결하려는 문제

1. **코드 중복**: 같은 패턴을 여러 컴포넌트에서 반복 작성
2. **확장성**: 새로운 slot 타입 추가 시 매번 비슷한 코드 작성 필요
3. **타입 안전성**: 제네릭으로 slot 키 타입 추론하여 오타 방지

## API 설계

### 시그니처

```typescript
function splitSlots<K extends string>(
  resolved: { toArray: () => unknown[] },
  keys: readonly K[],
): [Accessor<Record<K, HTMLElement[]>>, Accessor<JSX.Element[]>];
```

### 사용 예시

```typescript
const resolved = children(() => props.children);
const [slots, content] = splitSlots(resolved, ["selectHeader", "selectButton"] as const);

// JSX에서 사용
<div>{slots().selectHeader.single()}</div>
<div>{slots().selectButton}</div>
<div>{content()}</div>
```

### 동작

- `keys`에 지정된 camelCase 이름으로 `data-*` 속성 검사 (dataset은 자동으로 kebab → camelCase 변환)
- 예: `selectHeader` → `data-select-header` 속성을 가진 요소 매칭
- 매칭되는 요소는 해당 키의 배열에 추가
- 매칭되지 않는 요소는 `content`에 추가

### 설계 결정사항

| 항목           | 결정                                | 이유                         |
| -------------- | ----------------------------------- | ---------------------------- |
| 형태           | 유틸 함수 (`splitSlots`)            | `splitProps`와 일관된 네이밍 |
| 타입 안전성    | 제네릭으로 slot 키 추론             | 컴파일 타임 오타 검출        |
| slot 키 네이밍 | 전체 이름 포함 (`listItemChildren`) | 명시적이고 안전함            |
| slot 반환값    | 항상 `HTMLElement[]`                | API 일관성                   |
| 나머지 요소    | 튜플 반환 `[slots, content]`        | `splitProps` 패턴과 일치     |

## 타입 정의

```typescript
type SplitSlotsResult<K extends string> = [Accessor<Record<K, HTMLElement[]>>, Accessor<JSX.Element[]>];
```

**타입 안전성 보장:**

```typescript
const [slots, content] = splitSlots(resolved, ["selectHeader", "selectButton"] as const);

slots().selectHeader; // ✅ OK
slots().selectButton; // ✅ OK
slots().selectFooter; // ❌ 컴파일 에러
```

## 구현

### 파일 위치

```
packages/solid/src/utils/splitSlots.ts
```

### 구현 코드

```typescript
import { Accessor, createMemo } from "solid-js";
import { JSX } from "solid-js/jsx-runtime";

export function splitSlots<K extends string>(
  resolved: { toArray: () => unknown[] },
  keys: readonly K[],
): [Accessor<Record<K, HTMLElement[]>>, Accessor<JSX.Element[]>] {
  const slots = createMemo(() => {
    const arr = resolved.toArray();
    const result = Object.fromEntries(keys.map((k) => [k, []])) as Record<K, HTMLElement[]>;
    const content: JSX.Element[] = [];

    for (const c of arr) {
      if (c instanceof HTMLElement) {
        const matchedKey = keys.find((k) => c.dataset[k] !== undefined);
        if (matchedKey) {
          result[matchedKey].push(c);
          continue;
        }
      }
      content.push(c as JSX.Element);
    }

    return { result, content };
  });

  return [() => slots().result, () => slots().content];
}
```

### Export 추가

`packages/solid/src/index.ts`:

```typescript
// utils
export { mergeStyles } from "./utils/mergeStyles";
export { splitSlots } from "./utils/splitSlots"; // 추가
```

## 마이그레이션

### 대상 컴포넌트

| 컴포넌트         | slot 키                        |
| ---------------- | ------------------------------ |
| `ListItem.tsx`   | `listItemChildren`             |
| `Select.tsx`     | `selectHeader`, `selectButton` |
| `SelectItem.tsx` | `selectItemChildren`           |

### 마이그레이션 예시

**Before:**

```typescript
const resolved = children(() => local.children);
const slots = createMemo(() => {
  const arr = resolved.toArray();
  let childrenSlot: HTMLElement | undefined;
  const content: (typeof arr)[number][] = [];

  for (const c of arr) {
    if (c instanceof HTMLElement && c.dataset["listItemChildren"] !== undefined) {
      childrenSlot = c;
    } else {
      content.push(c);
    }
  }
  return { childrenSlot, content };
});
```

**After:**

```typescript
const resolved = children(() => local.children);
const [slots, content] = splitSlots(resolved, ["listItemChildren"] as const);

// 사용 시
{
  content();
} // 기존: {slots().content}
{
  slots().listItemChildren.single();
} // 기존: {slots().childrenSlot}
```

## 작업 순서

1. `splitSlots.ts` 유틸 생성
2. `index.ts`에 export 추가
3. 각 컴포넌트 마이그레이션
4. 타입체크 및 린트 검증
