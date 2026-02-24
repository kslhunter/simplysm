# SelectList List.Item 교체 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** SelectList 내부의 수동 `<button>` 구현을 `List.Item` 컴포넌트로 교체하여 코드 중복 제거

**Architecture:** `List.Item`이 이미 제공하는 ripple, aria, tabIndex, 스타일 클래스를 활용. import 정리로 불필요한 의존성 제거.

**Tech Stack:** SolidJS, List.Item 컴포넌트

---

### Task 1: import 정리 및 `<button>` → `List.Item` 교체

**Files:**
- Modify: `packages/solid/src/components/form-control/select-list/SelectList.tsx:21-30,328-371`

**Step 1: import 제거**

`SelectList.tsx`에서 다음 import들을 제거:

```typescript
// 제거할 import
import {
  listItemBaseClass,
  listItemSelectedClass,
  listItemContentClass,
  listItemDisabledClass,
} from "../../data/list/ListItem.styles";
import { ripple } from "../../../directives/ripple";

// 제거할 문
void ripple;
```

**Step 2: "미지정" 항목 교체**

기존 `<button>` (line 330-346)을 `List.Item`으로 교체:

```tsx
<List.Item
  selected={local.value === undefined}
  disabled={local.disabled}
  onClick={() => handleSelect(undefined)}
>
  <span class={textMuted}>미지정</span>
</List.Item>
```

**Step 3: 일반 아이템 교체**

기존 `<button>` (line 352-368)을 `List.Item`으로 교체:

```tsx
<List.Item
  selected={item === local.value}
  disabled={local.disabled}
  onClick={() => handleSelect(item)}
>
  {renderItem(item, index())}
</List.Item>
```

**Step 4: typecheck 검증**

Run: `pnpm -F @simplysm/solid exec tsc --noEmit`
Expected: PASS (에러 없음)

**Step 5: Commit**

```bash
git add packages/solid/src/components/form-control/select-list/SelectList.tsx
git commit -m "refactor(solid): replace manual <button> with List.Item in SelectList"
```
