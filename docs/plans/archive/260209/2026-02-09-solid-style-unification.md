# Solid 패키지 스타일 통일 설계

## 배경

solid 패키지의 40+ 컴포넌트들이 동일한 색상/테두리/사이즈 값을 각자 하드코딩하고 있어 불일치와 중복이 발생하고 있다.

### 현재 문제

- 테두리 색상 4가지 변형이 의미 구분 없이 혼용
- inset 포커스 아웃라인 패턴 3벌 중복 (Field, CheckBox, Select)
- Button hover 배경색이 테마별로 `-50`/`-100` 불일치
- 사이즈 타입이 컴포넌트마다 다름 (`sm|lg` vs `sm|default|lg`)
- `clsx` 백틱/표준 호출/중첩 등 사용 방식 혼재
- 40+ 컴포넌트 중 4개만 `.styles.ts` 분리, 나머지는 인라인

## 결정 사항

| 항목         | 결정                                              |
| ------------ | ------------------------------------------------- |
| 접근 방식    | 공유 `.styles.ts` 파일 (Tailwind @apply 아님)     |
| 추상화 수준  | 원시 토큰 + 복합 패턴, 파일 분리                  |
| 사이즈 타입  | `"sm" \| "lg"` 통일 (prop 없음 = 기본)            |
| 테두리 체계  | 2단계: `borderDefault`, `borderSubtle`            |
| hover 배경   | light: `{theme}-100`, dark: `{theme}-800/30` 통일 |
| hover 토큰화 | `themeTokens` Record로 구조화                     |

## 설계

### 파일 구조

```
packages/solid/src/styles/
  tokens.styles.ts    ← 원시 토큰 (색상, 테두리, 텍스트, 사이즈 타입)
  patterns.styles.ts  ← 복합 패턴 (inset, fieldSurface, inputBase)
```

### tokens.styles.ts

```ts
import clsx from "clsx";

// ── 테두리 ──
export const borderDefault = "border-base-300 dark:border-base-700";
export const borderSubtle = "border-base-200 dark:border-base-800";

// ── 표면 배경 ──
export const bgSurface = "bg-white dark:bg-base-900";

// ── 텍스트 ──
export const textDefault = "text-base-900 dark:text-base-100";
export const textMuted = "text-base-400 dark:text-base-500";
export const textPlaceholder = "placeholder:text-base-400 dark:placeholder:text-base-500";

// ── disabled ──
export const disabledOpacity = "cursor-default opacity-50 pointer-events-none";

// ── 사이즈 ──
export type ComponentSize = "sm" | "lg";
export const paddingSm = "px-1.5 py-0.5";
export const paddingLg = "px-3 py-2";

// ── 테마 ──
export type SemanticTheme = "primary" | "info" | "success" | "warning" | "danger" | "base";

export const themeTokens: Record<
  SemanticTheme,
  {
    solid: string;
    solidHover: string;
    text: string;
    hoverBg: string;
    border: string;
  }
> = {
  primary: {
    solid: "bg-primary-500 text-white",
    solidHover: "hover:bg-primary-600 dark:hover:bg-primary-400",
    text: "text-primary-600 dark:text-primary-400",
    hoverBg: "hover:bg-primary-100 dark:hover:bg-primary-800/30",
    border: "border-primary-300 dark:border-primary-600",
  },
  info: {
    solid: "bg-info-500 text-white",
    solidHover: "hover:bg-info-600 dark:hover:bg-info-400",
    text: "text-info-600 dark:text-info-400",
    hoverBg: "hover:bg-info-100 dark:hover:bg-info-800/30",
    border: "border-info-300 dark:border-info-600",
  },
  success: {
    solid: "bg-success-500 text-white",
    solidHover: "hover:bg-success-600 dark:hover:bg-success-400",
    text: "text-success-600 dark:text-success-400",
    hoverBg: "hover:bg-success-100 dark:hover:bg-success-800/30",
    border: "border-success-300 dark:border-success-600",
  },
  warning: {
    solid: "bg-warning-500 text-white",
    solidHover: "hover:bg-warning-600 dark:hover:bg-warning-400",
    text: "text-warning-600 dark:text-warning-400",
    hoverBg: "hover:bg-warning-100 dark:hover:bg-warning-800/30",
    border: "border-warning-300 dark:border-warning-600",
  },
  danger: {
    solid: "bg-danger-500 text-white",
    solidHover: "hover:bg-danger-600 dark:hover:bg-danger-400",
    text: "text-danger-600 dark:text-danger-400",
    hoverBg: "hover:bg-danger-100 dark:hover:bg-danger-800/30",
    border: "border-danger-300 dark:border-danger-600",
  },
  base: {
    solid: "bg-base-500 text-white",
    solidHover: "hover:bg-base-600 dark:hover:bg-base-400",
    text: "text-base-600 dark:text-base-300",
    hoverBg: "hover:bg-base-100 dark:hover:bg-base-800/30",
    border: "border-base-300 dark:border-base-700",
  },
};
```

### patterns.styles.ts

```ts
import clsx from "clsx";
import { bgSurface, borderDefault, textDefault, textPlaceholder } from "./tokens.styles";

// ── inset 포커스 아웃라인 (focus-within 버전: Field, TextArea) ──
export const insetFocusOutline = clsx(
  "focus-within:[outline-style:solid]",
  "focus-within:outline-1 focus-within:-outline-offset-1",
  "focus-within:outline-primary-400 dark:focus-within:outline-primary-400",
);

// ── inset 포커스 아웃라인 (focus 버전: CheckBox, Select trigger) ──
export const insetFocusOutlineSelf = clsx(
  "focus:[outline-style:solid]",
  "focus:outline-1 focus:-outline-offset-1",
  "focus:outline-primary-400 dark:focus:outline-primary-400",
);

// ── inset 기본 레이아웃 ──
export const insetBase = "w-full rounded-none border-none";

// ── 폼 필드 공통 표면 (배경 + 텍스트 + 테두리 + 포커스) ──
export const fieldSurface = clsx(
  bgSurface,
  textDefault,
  "border",
  borderDefault,
  "rounded",
  "focus-within:border-primary-500",
);

// ── 입력 요소 공통 ──
export const inputBase = clsx("min-w-0 flex-1", "bg-transparent", "outline-none", textPlaceholder);
```

### 적용 예시: Field.styles.ts

**Before:**

```ts
export const fieldBaseClass = clsx(
  "inline-flex items-center",
  "bg-white dark:bg-base-900",
  "text-base-900 dark:text-base-100",
  "border",
  "border-base-300 dark:border-base-700",
  "px-2 py-1",
  "rounded",
  "focus-within:border-primary-500",
  "h-field",
);

export const fieldInsetClass = clsx(
  clsx`w-full rounded-none border-none bg-primary-50 dark:bg-primary-950/30`,
  "focus-within:[outline-style:solid]",
  clsx`focus-within:outline-1 focus-within:-outline-offset-1`,
  clsx`focus-within:outline-primary-400 dark:focus-within:outline-primary-400`,
);
```

**After:**

```ts
import { fieldSurface, insetBase, insetFocusOutline } from "../../styles/patterns.styles";

export const fieldBaseClass = clsx("inline-flex items-center", fieldSurface, "px-2 py-1", "h-field");

export const fieldInsetClass = clsx(insetBase, "bg-primary-50 dark:bg-primary-950/30", insetFocusOutline);
```

### 적용 예시: Button.tsx themeClasses

**Before (~80줄):**

```ts
const themeClasses: Record<ButtonTheme, Record<ButtonVariant, string>> = {
  primary: {
    solid: clsx("bg-primary-500", "hover:bg-primary-600 dark:hover:bg-primary-400", "text-white"),
    outline: clsx("bg-transparent", "hover:bg-primary-50 ...", "text-primary-600 ...", ...),
    ghost: clsx("bg-transparent", "hover:bg-primary-50 ...", "text-primary-600 ..."),
  },
  // × 6 테마 반복
};
```

**After (~20줄):**

```ts
import { themeTokens } from "../../styles/tokens.styles";

const themeClasses: Record<ButtonTheme, Record<ButtonVariant, string>> = Object.fromEntries(
  Object.entries(themeTokens).map(([theme, t]) => [
    theme,
    {
      solid: clsx(t.solid, t.solidHover),
      outline: clsx("bg-transparent", t.hoverBg, t.text, t.border),
      ghost: clsx("bg-transparent", t.hoverBg, t.text),
    },
  ]),
);
```

## 변경 범위

| 항목                        | 변경 내용                                                                |
| --------------------------- | ------------------------------------------------------------------------ |
| **신규 파일**               | `styles/tokens.styles.ts`, `styles/patterns.styles.ts`                   |
| **수정 — 토큰 적용**        | Field.styles.ts, CheckBox.styles.ts, ListItem.styles.ts, Sheet.styles.ts |
| **수정 — themeTokens 적용** | Button.tsx, Label.tsx, Select.tsx, Note.tsx 등 테마 사용 컴포넌트        |
| **수정 — 사이즈 통일**      | Select.tsx (`default` 엔트리 제거, `ComponentSize` 타입 사용)            |
| **수정 — clsx 정리**        | 백틱 → 표준 호출, 중첩 제거                                              |
| **수정 — hover 통일**       | Button.tsx (`-50` → `-100`)                                              |
| **수정 — 테두리 통일**      | CheckBox → `borderDefault`, Modal/Dropdown → `borderSubtle`              |

## 외부 API 영향

- **breaking change 없음**: 모든 컴포넌트의 props 인터페이스 유지
- Select의 `size="default"`만 제거되나, prop 미지정과 동일하므로 실질적 영향 없음
