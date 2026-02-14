# Icon 컴포넌트 마이그레이션 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** solid 패키지의 기존 아이콘 사용을 Icon 컴포넌트로 마이그레이션하여 기본 크기 1lh 적용

**Architecture:** 내부 아이콘은 Icon 컴포넌트로 래핑하고 size prop으로 기존 크기 유지. 외부에서 전달받는 아이콘은 Icon 컴포넌트로 렌더링하여 기본 크기 1lh 적용.

**Tech Stack:** SolidJS, @tabler/icons-solidjs, Icon 컴포넌트

---

## 크기 변환 참조

| Tailwind        | CSS     | Icon size prop |
| --------------- | ------- | -------------- |
| size-4, w-4 h-4 | 1rem    | `"1rem"`       |
| size-5          | 1.25rem | `"1.25rem"`    |
| size-6          | 1.5rem  | `"1.5rem"`     |

---

### Task 1: Topbar.tsx 마이그레이션

**Files:**

- Modify: `packages/solid/src/components/navigation/Topbar.tsx`

**Step 1: import 변경**

```tsx
// Before
import { IconMenu2 } from "@tabler/icons-solidjs";

// After
import { IconMenu2 } from "@tabler/icons-solidjs";
import { Icon } from "../display/Icon";
```

**Step 2: IconMenu2 사용 부분 변경**

```tsx
// Before (line 68)
<IconMenu2 class="size-6" />

// After
<Icon icon={IconMenu2} size="1.5rem" />
```

**Step 3: 검증**

Run: `pnpm lint packages/solid/src/components/navigation/Topbar.tsx && pnpm typecheck packages/solid`
Expected: 에러 0개

---

### Task 2: TopbarUser.tsx 마이그레이션

**Files:**

- Modify: `packages/solid/src/components/navigation/TopbarUser.tsx`

**Step 1: import 변경**

```tsx
// Before
import { IconChevronDown } from "@tabler/icons-solidjs";

// After
import { IconChevronDown } from "@tabler/icons-solidjs";
import { Icon } from "../display/Icon";
```

**Step 2: IconChevronDown 사용 부분 변경**

```tsx
// Before (line 78)
<IconChevronDown class={clsx("size-4 transition-transform", open() && "rotate-180")} />

// After
<Icon icon={IconChevronDown} size="1rem" class={clsx("transition-transform", open() && "rotate-180")} />
```

**Step 3: 검증**

Run: `pnpm lint packages/solid/src/components/navigation/TopbarUser.tsx && pnpm typecheck packages/solid`
Expected: 에러 0개

---

### Task 3: TopbarMenu.tsx 마이그레이션

**Files:**

- Modify: `packages/solid/src/components/navigation/TopbarMenu.tsx`

**Step 1: import 변경**

```tsx
// Before
import { IconChevronDown, IconDotsVertical, type IconProps } from "@tabler/icons-solidjs";

// After
import { IconChevronDown, IconDotsVertical, type IconProps } from "@tabler/icons-solidjs";
import { Icon } from "../display/Icon";
```

**Step 2: IconDotsVertical 사용 부분 변경 (line 72)**

```tsx
// Before
<IconDotsVertical class="size-5" />

// After
<Icon icon={IconDotsVertical} size="1.25rem" />
```

**Step 3: TopbarMenuButton의 아이콘 렌더링 변경 (line 140)**

```tsx
// Before
{
  props.menu.icon?.({});
}

// After
<Show when={props.menu.icon}>
  <Icon icon={props.menu.icon!} />
</Show>;
```

**Step 4: TopbarMenuButton의 IconChevronDown 변경 (line 143)**

```tsx
// Before
<IconChevronDown class={clsx("size-4 transition-transform", open() && "rotate-180")} />

// After
<Icon icon={IconChevronDown} size="1rem" class={clsx("transition-transform", open() && "rotate-180")} />
```

**Step 5: TopbarMenuDropdownItem의 아이콘 렌더링 변경 (line 190)**

```tsx
// Before
{
  props.menu.icon?.({});
}

// After
<Show when={props.menu.icon}>
  <Icon icon={props.menu.icon!} />
</Show>;
```

**Step 6: 검증**

Run: `pnpm lint packages/solid/src/components/navigation/TopbarMenu.tsx && pnpm typecheck packages/solid`
Expected: 에러 0개

---

### Task 4: ListItem.tsx 마이그레이션

**Files:**

- Modify: `packages/solid/src/components/data/ListItem.tsx`

**Step 1: import 변경**

```tsx
// Before
import { IconChevronDown, type IconProps } from "@tabler/icons-solidjs";

// After
import { IconChevronDown, type IconProps } from "@tabler/icons-solidjs";
import { Icon } from "../display/Icon";
```

**Step 2: selectedIcon 렌더링 변경 (line 224-226)**

```tsx
// Before
<Show when={local.selectedIcon && !hasChildren()}>
  {local.selectedIcon?.({ class: getSelectedIconClassName() })}
</Show>

// After
<Show when={local.selectedIcon && !hasChildren()}>
  <Icon icon={local.selectedIcon!} class={getSelectedIconClassName()} />
</Show>
```

**Step 3: IconChevronDown 변경 (line 229)**

```tsx
// Before
<IconChevronDown class={getChevronClassName()} />

// After
<Icon icon={IconChevronDown} size="1rem" class={getChevronClassName()} />
```

**Step 4: chevronClass에서 크기 제거 (line 34)**

```tsx
// Before
const chevronClass = clsx("w-4", "h-4", "transition-transform", "duration-200", "motion-reduce:transition-none");

// After
const chevronClass = clsx("transition-transform", "duration-200", "motion-reduce:transition-none");
```

**Step 5: 검증**

Run: `pnpm lint packages/solid/src/components/data/ListItem.tsx && pnpm typecheck packages/solid`
Expected: 에러 0개

---

### Task 5: SidebarMenu.tsx 마이그레이션

**Files:**

- Modify: `packages/solid/src/components/navigation/SidebarMenu.tsx`

**Step 1: import 추가**

```tsx
// Before
import type { IconProps } from "@tabler/icons-solidjs";

// After
import type { IconProps } from "@tabler/icons-solidjs";
import { Icon } from "../display/Icon";
```

**Step 2: MenuItem의 아이콘 렌더링 변경 (line 167)**

```tsx
// Before
{
  props.menu.icon?.({});
}

// After
<Show when={props.menu.icon}>
  <Icon icon={props.menu.icon!} />
</Show>;
```

**Step 3: Show import 확인**

이미 `Show`가 import 되어 있음 (line 5)

**Step 4: 검증**

Run: `pnpm lint packages/solid/src/components/navigation/SidebarMenu.tsx && pnpm typecheck packages/solid`
Expected: 에러 0개

---

### Task 6: 전체 검증 및 커밋

**Step 1: 전체 린트 및 타입체크**

Run: `pnpm lint packages/solid && pnpm typecheck packages/solid`
Expected: 에러 0개

**Step 2: 커밋**

```bash
git add packages/solid/src/components/
git commit -m "refactor(solid): 기존 아이콘 사용을 Icon 컴포넌트로 마이그레이션

- Topbar, TopbarUser, TopbarMenu, ListItem, SidebarMenu 마이그레이션
- 내부 아이콘: size prop으로 기존 크기 유지
- 외부 전달 아이콘: Icon 컴포넌트로 렌더링하여 기본 크기 1lh 적용

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```
