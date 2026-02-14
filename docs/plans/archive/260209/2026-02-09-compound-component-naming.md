# 컴파운드 컴포넌트 Dot Notation 통일 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** solid 패키지의 모든 서브 컴포넌트를 dot notation(`Parent.Child`)으로 통일하고, separate export를 제거한다.

**Architecture:** 각 부모 컴포넌트에 compound component 인터페이스를 추가하고, 서브 컴포넌트를 dot notation으로 할당한 뒤, `index.ts`에서 서브 컴포넌트의 별도 export를 제거한다. 테스트/데모 코드에서 모든 사용처를 업데이트한다.

**Tech Stack:** SolidJS, TypeScript

---

### Task 1: Select.Item dot notation 복원

이전 커밋에서 `Select.Item` alias를 제거하고 `SelectItem` separate export로 변경했으나, 방향이 바뀌어 dot notation으로 되돌린다.

**Files:**

- Modify: `packages/solid/src/components/form-control/select/Select.tsx`
- Modify: `packages/solid/src/index.ts:6`
- Modify: `packages/solid/tests/components/form/select/Select.spec.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/SelectPage.tsx`
- Modify: `packages/solid-demo/src/pages/layout/FormTablePage.tsx`
- Modify: `packages/solid-demo/src/pages/layout/FormGroupPage.tsx`

**Step 1: SelectComponent 인터페이스에 Item 복원**

`Select.tsx:159-164`에서 `Item`을 다시 추가한다:

```typescript
interface SelectComponent {
  <T = unknown>(props: SelectProps<T>): JSX.Element;
  Item: typeof SelectItem;
  Button: typeof SelectButton;
  Header: typeof SelectHeader;
  ItemTemplate: typeof SelectItemTemplate;
}
```

**Step 2: Select.Item 할당문 복원**

`Select.tsx` 파일 끝 부분에 `Select.Item = SelectItem;`을 추가한다 (Select.Button 위에):

```typescript
Select.Item = SelectItem;
Select.Button = SelectButton;
Select.Header = SelectHeader;
Select.ItemTemplate = SelectItemTemplate;
```

**Step 3: Select.tsx JSDoc 예제 복원**

JSDoc 내 `SelectItem` → `Select.Item`으로 변경:

```typescript
 * <Select value={selected()} onValueChange={setSelected} renderValue={(v) => v.name}>
 *   <Select.Item value={item1}>{item1.name}</Select.Item>
 *   <Select.Item value={item2}>{item2.name}</Select.Item>
 * </Select>
```

**Step 4: index.ts에서 SelectItem export 제거**

`index.ts:6`에서 다음 라인을 제거:

```typescript
export * from "./components/form-control/select/SelectItem";
```

**Step 5: 테스트 코드 수정**

`Select.spec.tsx`에서:

1. `import { SelectItem }` 라인 제거
2. 모든 `<SelectItem` → `<Select.Item`, `</SelectItem>` → `</Select.Item>` 치환

**Step 6: 데모 코드 수정**

`SelectPage.tsx`에서:

1. import에서 `SelectItem` 제거
2. 모든 `<SelectItem` → `<Select.Item`, `</SelectItem>` → `</Select.Item>` 치환
3. 모든 `<SelectItem.Children>` → `<Select.Item.Children>`, `</SelectItem.Children>` → `</Select.Item.Children>` 치환

`FormTablePage.tsx`에서:

1. import에서 `SelectItem` 제거
2. 모든 `<SelectItem` → `<Select.Item`, `</SelectItem>` → `</Select.Item>` 치환

`FormGroupPage.tsx`에서:

1. import에서 `SelectItem` 제거
2. 모든 `<SelectItem` → `<Select.Item`, `</SelectItem>` → `</Select.Item>` 치환

**Step 7: SelectItem.tsx JSDoc 수정**

`SelectItem.tsx:53-64`의 JSDoc 내 `SelectItem` → `Select.Item`으로 변경:

```typescript
 * <Select.Item value={item}>{item.name}</Select.Item>
 *
 * // 중첩 아이템
 * <Select.Item value={parent}>
 *   {parent.name}
 *   <Select.Item.Children>
 *     <Select.Item value={child}>{child.name}</Select.Item>
 *   </Select.Item.Children>
 * </Select.Item>
```

**Step 8: 타입체크 및 테스트**

Run: `pnpm typecheck packages/solid packages/solid-demo`

Expected: PASS

Run: `pnpm vitest packages/solid/tests/components/form/select/Select.spec.tsx --project=solid --run`

Expected: PASS

---

### Task 2: ListItem → List.Item dot notation 전환

**Files:**

- Modify: `packages/solid/src/components/data/list/List.tsx`
- Modify: `packages/solid/src/components/data/list/ListItem.tsx`
- Modify: `packages/solid/src/index.ts:38`
- Modify: `packages/solid/tests/components/data/List.spec.tsx`
- Modify: `packages/solid-demo/src/pages/data/ListPage.tsx`

**Step 1: List.tsx에 compound component 인터페이스 추가**

`List.tsx`에서 `ListItem`을 import하고, `ListComponent` 인터페이스를 추가하고, export를 변경한다.

import 추가 (파일 상단):

```typescript
import { ListItem } from "./ListItem";
```

`export const List: ParentComponent<ListProps>` 를 다음과 같이 변경:

```typescript
interface ListComponent extends ParentComponent<ListProps> {
  Item: typeof ListItem;
}

// 기존 구현을 ListBase로 이름 변경
const ListBase: ParentComponent<ListProps> = (props) => {
  // ... 기존 코드 그대로
};

export const List = ListBase as ListComponent;
List.Item = ListItem;
```

주의: `ListBase` 내부에서 `ListContext.Provider`를 사용하므로, 기존 구현의 함수명만 변경하면 된다.

**Step 2: List.tsx JSDoc 예제 업데이트**

```typescript
 * <List>
 *   <List.Item>Item 1</List.Item>
 *   <List.Item>Item 2</List.Item>
 * </List>
 *
 * <List inset>
 *   <List.Item>Inset style item</List.Item>
 * </List>
```

**Step 3: ListItem.tsx JSDoc 예제 업데이트**

JSDoc 내 `<ListItem` → `<List.Item`, `<ListItem.Children>` → `<List.Item.Children>` 치환.

**Step 4: index.ts에서 ListItem export 제거**

`index.ts:38`에서 다음 라인을 제거:

```typescript
export * from "./components/data/list/ListItem";
```

**Step 5: 테스트 코드 수정**

`List.spec.tsx`에서:

1. `import { ListItem }` 라인 제거
2. 모든 `<ListItem` → `<List.Item`, `</ListItem>` → `</List.Item>` 치환
3. 모든 `<ListItem.Children>` → `<List.Item.Children>`, `</ListItem.Children>` → `</List.Item.Children>` 치환

**Step 6: 데모 코드 수정**

`ListPage.tsx`에서:

1. import에서 `ListItem` 제거
2. 모든 `<ListItem` → `<List.Item`, `</ListItem>` → `</List.Item>` 치환
3. 모든 `<ListItem.Children>` → `<List.Item.Children>`, `</ListItem.Children>` → `</List.Item.Children>` 치환

**Step 7: 타입체크 및 테스트**

Run: `pnpm typecheck packages/solid packages/solid-demo`

Expected: PASS

Run: `pnpm vitest packages/solid/tests/components/data/List.spec.tsx --project=solid --run`

Expected: PASS

---

### Task 3: Sidebar 계열 → Sidebar.Container / Sidebar.Menu / Sidebar.User

**Files:**

- Modify: `packages/solid/src/components/layout/sidebar/Sidebar.tsx`
- Modify: `packages/solid/src/index.ts:25,27,28`
- Modify: `packages/solid/tests/components/layout/Sidebar*.spec.tsx` (4개)
- Modify: `packages/solid-demo/src/pages/layout/SidebarPage.tsx`
- Modify: `packages/solid-demo/src/pages/layout/TopbarPage.tsx`
- Modify: `packages/solid-demo/src/pages/layout/MobileLayoutDemoPage.tsx`

**Step 1: Sidebar.tsx에 compound component 인터페이스 추가**

import 추가:

```typescript
import { SidebarContainer } from "./SidebarContainer";
import { SidebarMenu } from "./SidebarMenu";
import { SidebarUser } from "./SidebarUser";
```

`export const Sidebar: ParentComponent<SidebarProps>` 를 다음과 같이 변경:

```typescript
interface SidebarComponent extends ParentComponent<SidebarProps> {
  Container: typeof SidebarContainer;
  Menu: typeof SidebarMenu;
  User: typeof SidebarUser;
}

// 기존 구현을 SidebarBase로 이름 변경
const SidebarBase: ParentComponent<SidebarProps> = (props) => {
  // ... 기존 코드 그대로
};

export const Sidebar = SidebarBase as SidebarComponent;
Sidebar.Container = SidebarContainer;
Sidebar.Menu = SidebarMenu;
Sidebar.User = SidebarUser;
```

**Step 2: Sidebar.tsx JSDoc 예제 업데이트**

```typescript
 * <Sidebar>
 *   <Sidebar.User menus={userMenus}>
 *     <span>사용자</span>
 *   </Sidebar.User>
 *   <Sidebar.Menu menus={menuItems} />
 * </Sidebar>
```

**Step 3: index.ts에서 separate export 제거**

`index.ts`에서 다음 3줄을 제거:

```typescript
export * from "./components/layout/sidebar/SidebarContainer";
export * from "./components/layout/sidebar/SidebarMenu";
export * from "./components/layout/sidebar/SidebarUser";
```

`SidebarContext`는 독립 Context이므로 export 유지.

**Step 4: 테스트 코드 수정**

각 테스트 파일에서:

1. `import { SidebarContainer }` → `Sidebar` import에서 접근
2. `import { SidebarMenu }` → 제거
3. `import { SidebarUser }` → 제거
4. `<SidebarContainer` → `<Sidebar.Container`, `</SidebarContainer>` → `</Sidebar.Container>` 치환
5. `<SidebarMenu` → `<Sidebar.Menu`, `</SidebarMenu>` → `</Sidebar.Menu>` 치환
6. `<SidebarUser` → `<Sidebar.User`, `</SidebarUser>` → `</Sidebar.User>` 치환

**Step 5: 데모 코드 수정**

`SidebarPage.tsx`, `TopbarPage.tsx`, `MobileLayoutDemoPage.tsx`에서:

1. import에서 `SidebarContainer`, `SidebarMenu`, `SidebarUser` 제거 (Sidebar import 유지)
2. `<SidebarContainer` → `<Sidebar.Container`, `</SidebarContainer>` → `</Sidebar.Container>` 치환
3. `<SidebarMenu` → `<Sidebar.Menu` 치환 (self-closing이므로 닫는 태그 없음)
4. `<SidebarUser` → `<Sidebar.User`, `</SidebarUser>` → `</Sidebar.User>` 치환

**Step 6: 타입체크**

Run: `pnpm typecheck packages/solid packages/solid-demo`

Expected: PASS

---

### Task 4: Topbar 계열 → Topbar.Container / Topbar.Menu / Topbar.User

**Files:**

- Modify: `packages/solid/src/components/layout/topbar/Topbar.tsx`
- Modify: `packages/solid/src/index.ts:30,31,32`
- Modify: `packages/solid-demo/src/pages/` 하위 **거의 모든 페이지** (TopbarContainer/Topbar import)

**Step 1: Topbar.tsx에 compound component 인터페이스 추가**

import 추가:

```typescript
import { TopbarContainer } from "./TopbarContainer";
import { TopbarMenu } from "./TopbarMenu";
import { TopbarUser } from "./TopbarUser";
```

`export const Topbar: ParentComponent<TopbarProps>` 를 다음과 같이 변경:

```typescript
interface TopbarComponent extends ParentComponent<TopbarProps> {
  Container: typeof TopbarContainer;
  Menu: typeof TopbarMenu;
  User: typeof TopbarUser;
}

// 기존 구현을 TopbarBase로 이름 변경
const TopbarBase: ParentComponent<TopbarProps> = (props) => {
  // ... 기존 코드 그대로
};

export const Topbar = TopbarBase as TopbarComponent;
Topbar.Container = TopbarContainer;
Topbar.Menu = TopbarMenu;
Topbar.User = TopbarUser;
```

**Step 2: Topbar.tsx JSDoc 예제 업데이트**

```typescript
 * <Topbar>
 *   <h1 class="text-lg font-bold">앱 이름</h1>
 *   <Topbar.Menu menus={menuItems} />
 *   <div class="flex-1" />
 *   <Topbar.User menus={userMenus}>사용자</Topbar.User>
 * </Topbar>
```

**Step 3: index.ts에서 separate export 제거**

`index.ts`에서 다음 3줄을 제거:

```typescript
export * from "./components/layout/topbar/TopbarContainer";
export * from "./components/layout/topbar/TopbarMenu";
export * from "./components/layout/topbar/TopbarUser";
```

**Step 4: 데모 코드 수정 — 전체 검색 후 치환**

`packages/solid-demo/src/` 하위 모든 `.tsx` 파일에서:

1. import에서 `TopbarContainer` 제거 (`Topbar` import 유지)
2. import에서 `TopbarMenu` 제거
3. import에서 `TopbarUser` 제거
4. `<TopbarContainer` → `<Topbar.Container`, `</TopbarContainer>` → `</Topbar.Container>` 치환
5. `<TopbarMenu` → `<Topbar.Menu` 치환
6. `<TopbarUser` → `<Topbar.User`, `</TopbarUser>` → `</Topbar.User>` 치환

주의: `TopbarContainer`는 거의 모든 데모 페이지에서 사용되므로 누락 없이 전수 검색 필요.

검색: `grep -rn "TopbarContainer\|TopbarMenu\|TopbarUser" packages/solid-demo/src/`

**Step 5: 타입체크**

Run: `pnpm typecheck packages/solid packages/solid-demo`

Expected: PASS

---

### Task 5: CLAUDE.md 규칙 업데이트

**Files:**

- Modify: `CLAUDE.md`

**Step 1: 기존 컴파운드 컴포넌트 네이밍 규칙 테이블을 다음으로 교체**

`CLAUDE.md`의 `### SolidJS 규칙` 섹션에서 기존 "컴파운드 컴포넌트 네이밍 규칙" 블록을 다음으로 교체:

```markdown
**컴파운드 컴포넌트 네이밍 규칙:**

모든 서브 컴포넌트는 dot notation(`Parent.Child`)으로만 접근한다.

- 부모 컴포넌트에 `interface ParentComponent { Child: typeof ChildComponent }` 인터페이스 정의
- `Parent.Child = ChildComponent;` 할당
- `index.ts`에서 서브 컴포넌트의 별도 export 금지 (부모만 export)
- 사용 시 부모만 import: `import { Select } from "@simplysm/solid"`
- 예시: `Select.Item`, `Select.Button`, `List.Item`, `Sheet.Column`, `Sidebar.Container`, `Topbar.Menu`
```

---

### Task 6: 전체 검증

**Step 1: 전체 타입체크**

Run: `pnpm typecheck`

Expected: PASS

**Step 2: 전체 린트**

Run: `pnpm lint packages/solid packages/solid-demo`

Expected: PASS (기존 에러 외 신규 에러 없음)

**Step 3: 테스트 실행**

Run: `pnpm vitest packages/solid/tests --project=solid --run`

Expected: 기존 실패 외 신규 실패 없음

**Step 4: 커밋**

```bash
git add -A
git commit -m "refactor(solid): 모든 서브 컴포넌트를 dot notation으로 통일"
```
