# Base 색상 시스템 통일 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** tailwind.config.ts에 `base: colors.zinc`를 추가하고, solid 패키지 내 모든 `zinc-*` 클래스를 `base-*`로 치환하여 색상 체계를 완전히 시맨틱하게 통일한다.

**Architecture:** tailwind의 커스텀 색상 시스템(`extend.colors`)에 `base`를 추가하면, `base-50`~`base-950` 클래스가 자동 생성되어 `zinc-*`와 동일한 값을 가진다. 이를 통해 나중에 회색 팔레트를 변경할 때 config 한 줄만 수정하면 된다. `bg-white`, `text-white`, `bg-black` 등 순수 흑백은 변경하지 않는다.

**Tech Stack:** Tailwind CSS, tailwind-merge, clsx

---

## 변경 규칙

- `zinc-{N}` → `base-{N}` (모든 prefix에 적용: bg, text, border, hover, dark, focus-visible, placeholder 등)
- `bg-white`, `text-white`, `bg-black`, `text-black` 등 순수 흑백은 **변경하지 않음**
- `base.css`의 스크롤바 rgba 값은 Tailwind 클래스가 아니므로 **변경하지 않음**
- 기존 `clsx` 패턴 유지, CLAUDE.md 규칙에 따라 의미 단위별 분리

---

### Task 1: tailwind.config.ts에 base 색상 추가

**Files:**

- Modify: `packages/solid/tailwind.config.ts:17-23`

**Step 1: colors에 base 추가**

```typescript
colors: {
  primary: colors.blue,
  info: colors.cyan,
  success: colors.emerald,
  warning: colors.amber,
  danger: colors.red,
  base: colors.zinc,
},
```

**Step 2: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: PASS

---

### Task 2: base.css의 zinc → base 치환

**Files:**

- Modify: `packages/solid/src/base.css:6,10`

**Step 1: 클래스 치환**

line 6: `@apply bg-white text-zinc-900;` → `@apply bg-white text-base-900;`
line 10: `@apply bg-zinc-950 text-zinc-100;` → `@apply bg-base-950 text-base-100;`

스크롤바의 rgba 값은 변경하지 않는다.

---

### Task 3: Button.tsx의 zinc → base 치환

**Files:**

- Modify: `packages/solid/src/components/form-control/Button.tsx:112-126`

**Step 1: base 테마 클래스 치환**

```typescript
base: {
  solid: clsx(
    "bg-white dark:bg-base-900",
    "hover:bg-base-100 dark:hover:bg-base-700",
    "text-base-900 dark:text-base-100",
    "border border-transparent",
  ),
  outline: clsx(
    "bg-transparent",
    "hover:bg-base-100 dark:hover:bg-base-700",
    "text-base-600 dark:text-base-300",
    "border border-base-300 dark:border-base-700",
  ),
  ghost: clsx("bg-transparent", "hover:bg-base-100 dark:hover:bg-base-700", "text-base-600 dark:text-base-300"),
},
```

---

### Task 4: field/styles.ts의 zinc → base 치환

**Files:**

- Modify: `packages/solid/src/components/form-control/field/Field.styles.ts`

**Step 1: 전체 zinc 치환**

```typescript
export const fieldBaseClass = clsx(
  "inline-flex items-center",
  "bg-white dark:bg-base-900",
  "text-base-900 dark:text-base-100",
  "border",
  "border-base-300 dark:border-base-700",
  "px-2 py-1",
  "rounded",
  "focus-within:border-blue-500",
  "h-field",
);

export const fieldDisabledClass = clsx`bg-base-100 text-base-500 dark:bg-base-800`;
export const fieldReadonlyClass = clsx`bg-base-100 dark:bg-base-800`;

export const fieldInputClass = clsx(
  "min-w-0 flex-1",
  "bg-transparent",
  "outline-none",
  "placeholder:text-base-400 dark:placeholder:text-base-500",
);
```

---

### Task 5: Select.tsx의 zinc → base 치환

**Files:**

- Modify: `packages/solid/src/components/form-control/select/Select.tsx`

**Step 1: triggerBaseClass 치환**

```typescript
const triggerBaseClass = clsx(
  clsx`inline-flex items-center gap-2`,
  "min-w-40",
  clsx`border border-base-300 dark:border-base-700`,
  "rounded",
  clsx`bg-transparent`,
  clsx`hover:bg-base-100 dark:hover:bg-base-700`,
  "cursor-pointer",
  "focus:outline-none",
  "focus-within:border-primary-400 dark:focus-within:border-primary-400",
);
```

**Step 2: triggerDisabledClass 치환**

```typescript
const triggerDisabledClass = clsx`cursor-default bg-base-200 text-base-400 dark:bg-base-800 dark:text-base-500`;
```

**Step 3: SelectButton 내부 클래스 치환**

```typescript
clsx(
  "border-l border-base-300 px-2 dark:border-base-700",
  "font-bold text-primary-500",
  "hover:bg-base-100 dark:hover:bg-base-700",
),
```

**Step 4: renderSelectedValue 내부 치환**

placeholder: `"text-base-400 dark:text-base-500"`
multi tag: `"rounded bg-base-200 px-1 dark:bg-base-600"`

---

### Task 6: Card.tsx의 zinc → base 치환

**Files:**

- Modify: `packages/solid/src/components/display/Card.tsx:9`

**Step 1: 치환**

```typescript
"bg-white dark:bg-base-800",
```

---

### Task 7: Label.tsx의 zinc → base 치환

**Files:**

- Modify: `packages/solid/src/components/display/Label.tsx:24`

**Step 1: 치환**

```typescript
base: "bg-base-600 dark:bg-base-600",
```

---

### Task 8: Note.tsx의 zinc → base 치환

**Files:**

- Modify: `packages/solid/src/components/display/Note.tsx:23`

**Step 1: 치환**

```typescript
base: clsx("bg-base-100 text-base-900", "dark:bg-base-800 dark:text-base-100"),
```

---

### Task 9: Dropdown.tsx의 zinc → base 치환

**Files:**

- Modify: `packages/solid/src/components/disclosure/Dropdown.tsx:398-399`

**Step 1: 치환**

```typescript
"bg-white dark:bg-base-800",
"border border-base-200 dark:border-base-700",
```

---

### Task 10: NotificationBell.tsx의 zinc → base 치환

**Files:**

- Modify: `packages/solid/src/components/feedback/notification/NotificationBell.tsx`

**Step 1: buttonClass 치환**

```typescript
"hover:bg-base-100",
"dark:hover:bg-base-700",
```

**Step 2: 알림 텍스트 치환**

line 104: `"text-sm text-base-500 hover:text-base-700 dark:text-base-400 dark:hover:text-base-300"`
line 115: `"py-8 text-center text-base-500 dark:text-base-400"`
line 129: `"text-sm text-base-600 dark:text-base-400"`
line 133: `"mt-1 text-xs text-base-400"`

---

### Task 11: ThemeToggle.tsx의 zinc → base 치환

**Files:**

- Modify: `packages/solid/src/components/form-control/ThemeToggle.tsx:18-19`

**Step 1: 치환**

```typescript
"text-base-500 dark:text-base-400",
"hover:bg-base-200 dark:hover:bg-base-700",
```

---

### Task 12: Sidebar.tsx의 zinc → base 치환

**Files:**

- Modify: `packages/solid/src/components/layout/sidebar/Sidebar.tsx:17-21`

**Step 1: 치환**

```typescript
"bg-base-100",
"dark:bg-base-900",
"border-r",
"border-base-200",
"dark:border-base-700",
```

---

### Task 13: SidebarUser.tsx의 zinc → base 치환

**Files:**

- Modify: `packages/solid/src/components/layout/sidebar/SidebarUser.tsx`

**Step 1: containerClass 치환**

```typescript
const containerClass = clsx`m-2 flex flex-col overflow-hidden rounded bg-white dark:bg-base-800`;
```

**Step 2: headerClass 치환**

```typescript
"hover:bg-base-100",
"dark:hover:bg-base-700",
```

**Step 3: 헤더 border 치환 (line 80)**

```typescript
open() && "border-b border-b-base-50";
```

---

### Task 14: SidebarMenu.tsx의 zinc → base 치환

**Files:**

- Modify: `packages/solid/src/components/layout/sidebar/SidebarMenu.tsx:27-28`

**Step 1: 치환**

```typescript
"text-base-500",
"dark:text-base-400",
```

---

### Task 15: Topbar.tsx의 zinc → base 치환

**Files:**

- Modify: `packages/solid/src/components/layout/topbar/Topbar.tsx:20-23`

**Step 1: 치환**

```typescript
"dark:bg-base-950",
"border-b",
"border-base-200",
"dark:border-base-700",
```

---

### Task 16: Table.tsx의 zinc → base 치환

**Files:**

- Modify: `packages/solid/src/components/data/Table.tsx:14`

**Step 1: 치환**

```typescript
"border-b border-r border-base-300 dark:border-base-700",
```

---

### Task 17: List.tsx의 zinc → base 치환

**Files:**

- Modify: `packages/solid/src/components/data/list/List.tsx:8`

**Step 1: 치환**

```typescript
const rootClass = clsx`border border-base-300 bg-base-50 p-px dark:border-base-700 dark:bg-base-900`;
```

---

### Task 18: ListItem.styles.ts의 zinc → base 치환

**Files:**

- Modify: `packages/solid/src/components/data/list/ListItem.Field.styles.ts`

**Step 1: baseClass 치환**

```typescript
"focus-visible:bg-base-200 dark:focus-visible:bg-base-700",
"hover:bg-base-500/10 dark:hover:bg-base-700",
```

**Step 2: indentGuideClass 치환**

```typescript
export const listItemIndentGuideClass = clsx`ml-4 w-2 border-l border-base-300 dark:border-base-700`;
```

---

### Task 19: 타입체크 및 린트 검증

**Step 1: 전체 타입체크**

Run: `pnpm typecheck packages/solid packages/solid-demo`
Expected: PASS (에러 0개)

**Step 2: 린트 검사**

Run: `pnpm lint packages/solid packages/solid-demo`
Expected: PASS

**Step 3: zinc 잔여 사용 확인**

`packages/solid/src/` 내에서 zinc 클래스가 남아있지 않은지 확인.
단, `base.css`의 스크롤바 rgba 주석/값은 허용.

---

### Task 20: CLAUDE.md 업데이트

**Files:**

- Modify: `CLAUDE.md`

**Step 1: 커스텀 테마 색상 문서에 base 추가**

colors 섹션에 `base: colors.zinc` 추가 기록.

**Step 2: 컨벤션 업데이트**

zinc 대신 base 사용 규칙 명시.
