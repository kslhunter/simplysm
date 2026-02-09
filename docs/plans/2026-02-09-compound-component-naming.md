# 컴파운드 컴포넌트 네이밍 통일 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** solid 패키지의 컴파운드/서브 컴포넌트 네이밍을 성격별 규칙에 따라 통일한다.

**Architecture:** 반복 아이템(UI요소)은 `ParentChild` separate export, 구조 정의/슬롯(설정요소)은 `Parent.Child` dot notation only로 통일. 불일치하는 `Select.Item` alias를 제거하고, `SheetColumn` separate export를 제거한다. CLAUDE.md에 규칙을 문서화한다.

**Tech Stack:** SolidJS, TypeScript

---

### Task 1: Select.Item dot notation alias 제거 — 타입 인터페이스 수정

**Files:**
- Modify: `packages/solid/src/components/form-control/select/Select.tsx:159-164`

**Step 1: SelectComponent 인터페이스에서 Item 제거**

`Select.tsx:159-164`에서 `Item` 속성을 제거한다:

```typescript
// 변경 전
interface SelectComponent {
  <T = unknown>(props: SelectProps<T>): JSX.Element;
  Item: typeof SelectItem;
  Button: typeof SelectButton;
  Header: typeof SelectHeader;
  ItemTemplate: typeof SelectItemTemplate;
}

// 변경 후
interface SelectComponent {
  <T = unknown>(props: SelectProps<T>): JSX.Element;
  Button: typeof SelectButton;
  Header: typeof SelectHeader;
  ItemTemplate: typeof SelectItemTemplate;
}
```

**Step 2: Select.Item 할당문 제거**

`Select.tsx:407`에서 `Select.Item = SelectItem;` 라인을 제거한다.

**Step 3: SelectItem import 제거**

`Select.tsx:9`에서 `import { SelectItem } from "./SelectItem";`를 제거한다. (내부에서 더 이상 사용하지 않음)

**Step 4: 타입체크 실행**

Run: `pnpm typecheck packages/solid`

Expected: `Select.Item` 사용처에서 타입 에러 발생 (demo, test 파일). solid 패키지 내부는 에러 없어야 함.

---

### Task 2: Select.Item → SelectItem — 테스트 코드 수정

**Files:**
- Modify: `packages/solid/tests/components/form/select/Select.spec.tsx`

**Step 1: import 추가**

`Select.spec.tsx:4` 아래에 `SelectItem` import를 추가한다:

```typescript
import { Select } from "../../../../src/components/form-control/select/Select";
import { SelectItem } from "../../../../src/components/form-control/select/SelectItem";
```

**Step 2: Select.Item → SelectItem 전체 치환**

파일 내 모든 `<Select.Item`을 `<SelectItem`으로, `</Select.Item>`을 `</SelectItem>`으로 치환한다.

치환 대상 (16곳):
- 라인 11, 21, 33, 52, 77, 97, 98, 111, 112, 133, 156, 172, 191, 203, 215, 225

**Step 3: 테스트 실행**

Run: `pnpm vitest packages/solid/tests/components/form/select/Select.spec.tsx --project=solid --run`

Expected: 모든 테스트 PASS

---

### Task 3: Select.Item → SelectItem — 데모 코드 수정

**Files:**
- Modify: `packages/solid-demo/src/pages/form-control/SelectPage.tsx`

**Step 1: import에 SelectItem 추가**

`SelectPage.tsx:2`에서 `SelectItem`을 import에 추가:

```typescript
import { Select, SelectItem, Topbar, TopbarContainer } from "@simplysm/solid";
```

**Step 2: Select.Item → SelectItem 전체 치환**

파일 내 모든 `<Select.Item`을 `<SelectItem`으로, `</Select.Item>`을 `</SelectItem>`으로 치환한다.

**Step 3: Select.Item.Children → SelectItem.Children 전체 치환**

파일 내 모든 `<Select.Item.Children>`를 `<SelectItem.Children>`으로, `</Select.Item.Children>`를 `</SelectItem.Children>`으로 치환한다.

**Step 4: 타입체크 실행**

Run: `pnpm typecheck packages/solid-demo`

Expected: PASS

---

### Task 4: SelectItem JSDoc 예제 수정

**Files:**
- Modify: `packages/solid/src/components/form-control/select/SelectItem.tsx:53-64`

**Step 1: JSDoc 내 Select.Item → SelectItem 치환**

```typescript
// 변경 전
 * <Select.Item value={item}>{item.name}</Select.Item>
 *
 * // 중첩 아이템
 * <Select.Item value={parent}>
 *   {parent.name}
 *   <Select.Item.Children>
 *     <Select.Item value={child}>{child.name}</Select.Item>
 *   </Select.Item.Children>
 * </Select.Item>

// 변경 후
 * <SelectItem value={item}>{item.name}</SelectItem>
 *
 * // 중첩 아이템
 * <SelectItem value={parent}>
 *   {parent.name}
 *   <SelectItem.Children>
 *     <SelectItem value={child}>{child.name}</SelectItem>
 *   </SelectItem.Children>
 * </SelectItem>
```

---

### Task 5: SheetColumn separate export 제거

**Files:**
- Modify: `packages/solid/src/index.ts:41`

**Step 1: index.ts에서 SheetColumn export 제거**

`index.ts:41`에서 다음 라인을 제거한다:

```typescript
export * from "./components/data/sheet/SheetColumn";
```

`Sheet.Column`을 통해서만 접근하도록 한다. `SheetColumn` 함수와 `isSheetColumnDef`는 `Sheet.tsx` 내부에서 import하여 사용하므로 내부 동작에 영향 없음.

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/solid`

Expected: PASS (외부에서 `SheetColumn`을 직접 import하는 곳 없음)

**Step 3: solid-demo 타입체크 실행**

Run: `pnpm typecheck packages/solid-demo`

Expected: PASS

---

### Task 6: CLAUDE.md에 컴파운드 컴포넌트 네이밍 규칙 추가

**Files:**
- Modify: `CLAUDE.md` (SolidJS 규칙 섹션 내)

**Step 1: SolidJS 규칙 섹션에 규칙 추가**

`CLAUDE.md`의 `### SolidJS 규칙` 섹션에서 `→ 컴포넌트 수정 전:` 라인 앞에 다음 내용을 추가:

```markdown
**컴파운드 컴포넌트 네이밍 규칙:**

| 성격 | 패턴 | 설명 | 예시 |
|------|------|------|------|
| 반복 아이템 | `ParentChild` (separate export) | 부모 안에서 반복 렌더링되는 독립 UI 요소 | `ListItem`, `SelectItem` |
| 구조 정의 / 템플릿 | `Parent.Child` (dot notation) | 부모의 구조를 선언적으로 설정, 부모 없이 의미 없음 | `Sheet.Column`, `Select.ItemTemplate` |
| 슬롯 | `Parent.Slot` (dot notation) | 부모의 특정 영역에 콘텐츠 배치 | `Select.Header`, `Select.Button`, `ListItem.Children` |
| 레이아웃 파트 | `PrefixPart` (separate export) | 동등한 수준의 레이아웃 구성 파트 | `SidebarContainer`, `SidebarMenu`, `TopbarUser` |

- 반복 아이템은 `index.ts`에서 별도 export, dot notation alias 금지
- 구조 정의/슬롯은 `index.ts`에서 별도 export 금지, `Parent.Child`로만 접근
```

---

### Task 7: 전체 검증

**Step 1: 전체 타입체크**

Run: `pnpm typecheck`

Expected: PASS

**Step 2: 전체 린트**

Run: `pnpm lint packages/solid packages/solid-demo`

Expected: PASS

**Step 3: 테스트 실행**

Run: `pnpm vitest packages/solid/tests --project=solid --run`

Expected: 모든 테스트 PASS

**Step 4: 커밋**

```bash
git add packages/solid/src/components/form-control/select/Select.tsx \
       packages/solid/src/components/form-control/select/SelectItem.tsx \
       packages/solid/src/index.ts \
       packages/solid/tests/components/form/select/Select.spec.tsx \
       packages/solid-demo/src/pages/form-control/SelectPage.tsx \
       CLAUDE.md
git commit -m "refactor(solid): 컴파운드 컴포넌트 네이밍 통일 — Select.Item alias 제거, SheetColumn separate export 제거"
```
