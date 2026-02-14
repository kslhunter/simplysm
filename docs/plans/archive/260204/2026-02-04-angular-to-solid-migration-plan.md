# Angular → SolidJS 컴포넌트 마이그레이션 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Angular legacy 패키지의 시각/레이아웃 컴포넌트(Card, Label, Note, FormGroup, FormTable, Table)를 SolidJS로 마이그레이션한다.

**Architecture:** 기존 Button 컴포넌트의 패턴을 따라 splitProps + twMerge 기반으로 구현. Display 컴포넌트(Card, Label, Note)는 단순 스타일링, Layout 컴포넌트(FormGroup, FormTable, Table)는 구조적 컨테이너 역할. FormGroup은 Compound Components 패턴 사용.

**Tech Stack:** SolidJS, Tailwind CSS, clsx, tailwind-merge, Vitest + @solidjs/testing-library

**참고 파일:**

- 설계 문서: `docs/plans/2026-02-04-angular-to-solid-migration-design.md`
- 컴포넌트 패턴: `packages/solid/src/components/controls/Button.tsx`
- 테스트 패턴: `packages/solid/tests/components/controls/Button.spec.tsx`

---

## Task 1: Tailwind 설정 - Card 애니메이션 추가

**Files:**

- Modify: `packages/solid/tailwind.config.ts:9-25`

**Step 1: 현재 tailwind.config.ts 확인**

Run: `cat packages/solid/tailwind.config.ts`
Expected: theme.extend 섹션 확인

**Step 2: animation과 keyframes 추가**

```ts
// packages/solid/tailwind.config.ts
import colors from "tailwindcss/colors";

const __dirname = new URL(".", import.meta.url).pathname
  .replace(/^\/[^/]+\/@fs/, "") // Vite 가상 경로 제거
  .replace(/index\.ts$/, ""); // re-export 시 index.ts 경로 제거

export default {
  theme: {
    extend: {
      colors: {
        primary: colors.blue,
        info: colors.cyan,
        success: colors.lime,
        warning: colors.amber,
        danger: colors.red,
      },
      zIndex: {
        "sidebar": "100",
        "sidebar-backdrop": "99",
        "dropdown": "1000",
      },
      animation: {
        "card-in": "card-in 0.3s ease-out forwards",
      },
      keyframes: {
        "card-in": {
          from: { opacity: "0", transform: "translateY(-1rem)" },
          to: { opacity: "1", transform: "none" },
        },
      },
    },
  },
  content: [`${__dirname}src/**/*.{ts,tsx}`],
  corePlugins: {
    aspectRatio: false, // Chrome 84 미지원
  },
};
```

**Step 3: 타입체크로 문법 오류 확인**

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

**Step 4: Commit**

```bash
git add packages/solid/tailwind.config.ts
git commit -m "$(cat <<'EOF'
feat(solid): add card-in animation to tailwind config

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Card 컴포넌트 - 테스트 작성

**Files:**

- Create: `packages/solid/tests/components/display/Card.spec.tsx`

**Step 1: 테스트 파일 생성**

```tsx
// packages/solid/tests/components/display/Card.spec.tsx
import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Card } from "../../../src/components/display/Card";

describe("Card 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("children이 Card 내부에 표시된다", () => {
      const { getByText } = render(() => <Card>Card Content</Card>);
      expect(getByText("Card Content")).toBeTruthy();
    });

    it("div 요소로 렌더링된다", () => {
      const { container } = render(() => <Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.tagName).toBe("DIV");
    });
  });

  describe("기본 스타일", () => {
    it("block display가 적용된다", () => {
      const { container } = render(() => <Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.classList.contains("block")).toBe(true);
    });

    it("배경색이 적용된다 (light/dark)", () => {
      const { container } = render(() => <Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.classList.contains("bg-white")).toBe(true);
      expect(card.classList.contains("dark:bg-gray-900")).toBe(true);
    });

    it("rounded-lg border-radius가 적용된다", () => {
      const { container } = render(() => <Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.classList.contains("rounded-lg")).toBe(true);
    });

    it("shadow 스타일이 적용된다", () => {
      const { container } = render(() => <Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.classList.contains("shadow-md")).toBe(true);
      expect(card.classList.contains("hover:shadow-lg")).toBe(true);
      expect(card.classList.contains("focus-within:shadow-lg")).toBe(true);
    });

    it("transition 스타일이 적용된다", () => {
      const { container } = render(() => <Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.classList.contains("transition-shadow")).toBe(true);
      expect(card.classList.contains("duration-300")).toBe(true);
    });

    it("등장 애니메이션이 적용된다", () => {
      const { container } = render(() => <Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.classList.contains("animate-card-in")).toBe(true);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 기존 스타일과 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <Card class="my-custom-class">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.classList.contains("my-custom-class")).toBe(true);
      expect(card.classList.contains("block")).toBe(true);
    });

    it("사용자 정의 class가 기본 스타일을 오버라이드할 수 있다", () => {
      const { container } = render(() => <Card class="rounded-none">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.classList.contains("rounded-none")).toBe(true);
      expect(card.classList.contains("rounded-lg")).toBe(false);
    });
  });

  describe("HTML 속성 전달", () => {
    it("data-* 속성이 전달된다", () => {
      const { container } = render(() => <Card data-testid="test-card">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.getAttribute("data-testid")).toBe("test-card");
    });

    it("id 속성이 전달된다", () => {
      const { container } = render(() => <Card id="my-card">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.id).toBe("my-card");
    });
  });
});
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `pnpm vitest packages/solid/tests/components/display/Card.spec.tsx --project=solid --run`
Expected: FAIL - Card 컴포넌트가 존재하지 않음

---

## Task 3: Card 컴포넌트 - 구현

**Files:**

- Create: `packages/solid/src/components/display/Card.tsx`

**Step 1: Card 컴포넌트 구현**

```tsx
// packages/solid/src/components/display/Card.tsx
import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {}

const baseClass = clsx(
  "block",
  "bg-white dark:bg-gray-900",
  "rounded-lg",
  "shadow-md hover:shadow-lg focus-within:shadow-lg",
  "transition-shadow duration-300",
  "animate-card-in",
);

export const Card: ParentComponent<CardProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);

  return (
    <div class={twMerge(baseClass, local.class)} {...rest}>
      {local.children}
    </div>
  );
};
```

**Step 2: 테스트 실행하여 통과 확인**

Run: `pnpm vitest packages/solid/tests/components/display/Card.spec.tsx --project=solid --run`
Expected: PASS - 모든 테스트 통과

**Step 3: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

**Step 4: Commit**

```bash
git add packages/solid/src/components/display/Card.tsx packages/solid/tests/components/display/Card.spec.tsx
git commit -m "$(cat <<'EOF'
feat(solid): add Card component

- block display with white/dark background
- rounded-lg corners with shadow
- hover/focus-within shadow enhancement
- card-in entrance animation

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Label 컴포넌트 - 테스트 작성

**Files:**

- Create: `packages/solid/tests/components/display/Label.spec.tsx`

**Step 1: 테스트 파일 생성**

```tsx
// packages/solid/tests/components/display/Label.spec.tsx
import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Label } from "../../../src/components/display/Label";

describe("Label 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("children이 Label 내부에 표시된다", () => {
      const { getByText } = render(() => <Label>New</Label>);
      expect(getByText("New")).toBeTruthy();
    });

    it("span 요소로 렌더링된다", () => {
      const { container } = render(() => <Label>Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.tagName).toBe("SPAN");
    });
  });

  describe("기본 스타일", () => {
    it("inline-block display가 적용된다", () => {
      const { container } = render(() => <Label>Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("inline-block")).toBe(true);
    });

    it("흰색 텍스트가 적용된다", () => {
      const { container } = render(() => <Label>Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("text-white")).toBe(true);
    });

    it("px-2 padding이 적용된다", () => {
      const { container } = render(() => <Label>Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("px-2")).toBe(true);
    });

    it("rounded border-radius가 적용된다", () => {
      const { container } = render(() => <Label>Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("rounded")).toBe(true);
    });
  });

  describe("theme 속성", () => {
    it("theme 미지정 시 gray 테마가 기본 적용된다", () => {
      const { container } = render(() => <Label>Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("bg-gray-600")).toBe(true);
      expect(label.classList.contains("dark:bg-gray-500")).toBe(true);
    });

    it("theme=primary일 때 primary 배경이 적용된다", () => {
      const { container } = render(() => <Label theme="primary">Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("bg-primary-500")).toBe(true);
      expect(label.classList.contains("dark:bg-primary-600")).toBe(true);
    });

    it("theme=info일 때 info 배경이 적용된다", () => {
      const { container } = render(() => <Label theme="info">Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("bg-info-500")).toBe(true);
    });

    it("theme=success일 때 success 배경이 적용된다", () => {
      const { container } = render(() => <Label theme="success">Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("bg-success-500")).toBe(true);
    });

    it("theme=warning일 때 warning 배경이 적용된다", () => {
      const { container } = render(() => <Label theme="warning">Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("bg-warning-500")).toBe(true);
    });

    it("theme=danger일 때 danger 배경이 적용된다", () => {
      const { container } = render(() => <Label theme="danger">Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("bg-danger-500")).toBe(true);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 기존 스타일과 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <Label class="my-label">Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.classList.contains("my-label")).toBe(true);
      expect(label.classList.contains("inline-block")).toBe(true);
    });
  });

  describe("HTML 속성 전달", () => {
    it("data-* 속성이 전달된다", () => {
      const { container } = render(() => <Label data-testid="test-label">Tag</Label>);
      const label = container.firstChild as HTMLElement;
      expect(label.getAttribute("data-testid")).toBe("test-label");
    });
  });
});
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `pnpm vitest packages/solid/tests/components/display/Label.spec.tsx --project=solid --run`
Expected: FAIL - Label 컴포넌트가 존재하지 않음

---

## Task 5: Label 컴포넌트 - 구현

**Files:**

- Create: `packages/solid/src/components/display/Label.tsx`

**Step 1: Label 컴포넌트 구현**

```tsx
// packages/solid/src/components/display/Label.tsx
import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export type LabelTheme = "primary" | "info" | "success" | "warning" | "danger" | "gray";

export interface LabelProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  theme?: LabelTheme;
}

const baseClass = clsx("inline-block", "text-white", "px-2", "rounded");

const themeClasses: Record<LabelTheme, string> = {
  primary: "bg-primary-500 dark:bg-primary-600",
  info: "bg-info-500 dark:bg-info-600",
  success: "bg-success-500 dark:bg-success-600",
  warning: "bg-warning-500 dark:bg-warning-600",
  danger: "bg-danger-500 dark:bg-danger-600",
  gray: "bg-gray-600 dark:bg-gray-500",
};

export const Label: ParentComponent<LabelProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "theme"]);

  const getClassName = () => {
    const theme = local.theme ?? "gray";
    return twMerge(baseClass, themeClasses[theme], local.class);
  };

  return (
    <span class={getClassName()} {...rest}>
      {local.children}
    </span>
  );
};
```

**Step 2: 테스트 실행하여 통과 확인**

Run: `pnpm vitest packages/solid/tests/components/display/Label.spec.tsx --project=solid --run`
Expected: PASS - 모든 테스트 통과

**Step 3: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

**Step 4: Commit**

```bash
git add packages/solid/src/components/display/Label.tsx packages/solid/tests/components/display/Label.spec.tsx
git commit -m "$(cat <<'EOF'
feat(solid): add Label component

- inline-block badge/tag display
- 6 theme variants (primary, info, success, warning, danger, gray)
- white text on colored background
- dark mode support

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Note 컴포넌트 - 테스트 작성

**Files:**

- Create: `packages/solid/tests/components/display/Note.spec.tsx`

**Step 1: 테스트 파일 생성**

```tsx
// packages/solid/tests/components/display/Note.spec.tsx
import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Note } from "../../../src/components/display/Note";

describe("Note 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("children이 Note 내부에 표시된다", () => {
      const { getByText } = render(() => <Note>This is a note</Note>);
      expect(getByText("This is a note")).toBeTruthy();
    });

    it("div 요소로 렌더링된다", () => {
      const { container } = render(() => <Note>Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.tagName).toBe("DIV");
    });
  });

  describe("기본 스타일", () => {
    it("block display가 적용된다", () => {
      const { container } = render(() => <Note>Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.classList.contains("block")).toBe(true);
    });

    it("p-3 padding이 적용된다", () => {
      const { container } = render(() => <Note>Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.classList.contains("p-3")).toBe(true);
    });

    it("rounded border-radius가 적용된다", () => {
      const { container } = render(() => <Note>Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.classList.contains("rounded")).toBe(true);
    });
  });

  describe("theme 속성", () => {
    it("theme 미지정 시 gray 테마가 기본 적용된다", () => {
      const { container } = render(() => <Note>Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.classList.contains("bg-gray-100")).toBe(true);
      expect(note.classList.contains("dark:bg-gray-800")).toBe(true);
    });

    it("theme=primary일 때 primary 배경이 적용된다", () => {
      const { container } = render(() => <Note theme="primary">Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.classList.contains("bg-primary-100")).toBe(true);
      expect(note.classList.contains("dark:bg-primary-900/30")).toBe(true);
    });

    it("theme=info일 때 info 배경이 적용된다", () => {
      const { container } = render(() => <Note theme="info">Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.classList.contains("bg-info-100")).toBe(true);
    });

    it("theme=success일 때 success 배경이 적용된다", () => {
      const { container } = render(() => <Note theme="success">Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.classList.contains("bg-success-100")).toBe(true);
    });

    it("theme=warning일 때 warning 배경이 적용된다", () => {
      const { container } = render(() => <Note theme="warning">Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.classList.contains("bg-warning-100")).toBe(true);
    });

    it("theme=danger일 때 danger 배경이 적용된다", () => {
      const { container } = render(() => <Note theme="danger">Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.classList.contains("bg-danger-100")).toBe(true);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 기존 스타일과 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <Note class="my-note">Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.classList.contains("my-note")).toBe(true);
      expect(note.classList.contains("block")).toBe(true);
    });
  });

  describe("HTML 속성 전달", () => {
    it("data-* 속성이 전달된다", () => {
      const { container } = render(() => <Note data-testid="test-note">Content</Note>);
      const note = container.firstChild as HTMLElement;
      expect(note.getAttribute("data-testid")).toBe("test-note");
    });
  });
});
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `pnpm vitest packages/solid/tests/components/display/Note.spec.tsx --project=solid --run`
Expected: FAIL - Note 컴포넌트가 존재하지 않음

---

## Task 7: Note 컴포넌트 - 구현

**Files:**

- Create: `packages/solid/src/components/display/Note.tsx`

**Step 1: Note 컴포넌트 구현**

```tsx
// packages/solid/src/components/display/Note.tsx
import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export type NoteTheme = "primary" | "info" | "success" | "warning" | "danger" | "gray";

export interface NoteProps extends JSX.HTMLAttributes<HTMLDivElement> {
  theme?: NoteTheme;
}

const baseClass = clsx("block", "p-3", "rounded");

const themeClasses: Record<NoteTheme, string> = {
  primary: "bg-primary-100 dark:bg-primary-900/30",
  info: "bg-info-100 dark:bg-info-900/30",
  success: "bg-success-100 dark:bg-success-900/30",
  warning: "bg-warning-100 dark:bg-warning-900/30",
  danger: "bg-danger-100 dark:bg-danger-900/30",
  gray: "bg-gray-100 dark:bg-gray-800",
};

export const Note: ParentComponent<NoteProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "theme"]);

  const getClassName = () => {
    const theme = local.theme ?? "gray";
    return twMerge(baseClass, themeClasses[theme], local.class);
  };

  return (
    <div class={getClassName()} {...rest}>
      {local.children}
    </div>
  );
};
```

**Step 2: 테스트 실행하여 통과 확인**

Run: `pnpm vitest packages/solid/tests/components/display/Note.spec.tsx --project=solid --run`
Expected: PASS - 모든 테스트 통과

**Step 3: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

**Step 4: Commit**

```bash
git add packages/solid/src/components/display/Note.tsx packages/solid/tests/components/display/Note.spec.tsx
git commit -m "$(cat <<'EOF'
feat(solid): add Note component

- block display with light background
- 6 theme variants (primary, info, success, warning, danger, gray)
- p-3 padding with rounded corners
- dark mode support with opacity for colored themes

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: FormGroup 컴포넌트 - 테스트 작성

**Files:**

- Create: `packages/solid/tests/components/layout/FormGroup.spec.tsx`

**Step 1: 테스트 파일 생성**

```tsx
// packages/solid/tests/components/layout/FormGroup.spec.tsx
import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { FormGroup } from "../../../src/components/layout/FormGroup";

describe("FormGroup 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("children이 FormGroup 내부에 표시된다", () => {
      const { getByText } = render(() => <FormGroup>Content</FormGroup>);
      expect(getByText("Content")).toBeTruthy();
    });

    it("div 요소로 렌더링된다", () => {
      const { container } = render(() => <FormGroup>Content</FormGroup>);
      const group = container.firstChild as HTMLElement;
      expect(group.tagName).toBe("DIV");
    });
  });

  describe("기본 스타일 (수직 레이아웃)", () => {
    it("flex flex-col 레이아웃이 적용된다", () => {
      const { container } = render(() => <FormGroup>Content</FormGroup>);
      const group = container.firstChild as HTMLElement;
      expect(group.classList.contains("flex")).toBe(true);
      expect(group.classList.contains("flex-col")).toBe(true);
    });

    it("gap-4가 적용된다", () => {
      const { container } = render(() => <FormGroup>Content</FormGroup>);
      const group = container.firstChild as HTMLElement;
      expect(group.classList.contains("gap-4")).toBe(true);
    });
  });

  describe("inline 속성", () => {
    it("inline=true일 때 가로 레이아웃이 적용된다", () => {
      const { container } = render(() => <FormGroup inline>Content</FormGroup>);
      const group = container.firstChild as HTMLElement;
      expect(group.classList.contains("inline-flex")).toBe(true);
      expect(group.classList.contains("flex-row")).toBe(true);
      expect(group.classList.contains("flex-wrap")).toBe(true);
    });

    it("inline=true일 때 gap-2가 적용된다", () => {
      const { container } = render(() => <FormGroup inline>Content</FormGroup>);
      const group = container.firstChild as HTMLElement;
      expect(group.classList.contains("gap-2")).toBe(true);
    });

    it("inline=true일 때 items-center가 적용된다", () => {
      const { container } = render(() => <FormGroup inline>Content</FormGroup>);
      const group = container.firstChild as HTMLElement;
      expect(group.classList.contains("items-center")).toBe(true);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 기존 스타일과 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <FormGroup class="my-form-group">Content</FormGroup>);
      const group = container.firstChild as HTMLElement;
      expect(group.classList.contains("my-form-group")).toBe(true);
      expect(group.classList.contains("flex")).toBe(true);
    });
  });
});

describe("FormGroup.Item 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("children이 Item 내부에 표시된다", () => {
      const { getByText } = render(() => (
        <FormGroup>
          <FormGroup.Item>Field Content</FormGroup.Item>
        </FormGroup>
      ));
      expect(getByText("Field Content")).toBeTruthy();
    });

    it("div 요소로 렌더링된다", () => {
      const { container } = render(() => (
        <FormGroup>
          <FormGroup.Item>Content</FormGroup.Item>
        </FormGroup>
      ));
      const item = container.querySelector("[data-form-group-item]");
      expect(item?.tagName).toBe("DIV");
    });
  });

  describe("label 속성", () => {
    it("label이 표시된다", () => {
      const { getByText } = render(() => (
        <FormGroup>
          <FormGroup.Item label="Name">Input</FormGroup.Item>
        </FormGroup>
      ));
      expect(getByText("Name")).toBeTruthy();
    });

    it("label이 JSX.Element일 수 있다", () => {
      const { getByText } = render(() => (
        <FormGroup>
          <FormGroup.Item label={<span>Custom Label</span>}>Input</FormGroup.Item>
        </FormGroup>
      ));
      expect(getByText("Custom Label")).toBeTruthy();
    });

    it("label이 없을 때 label 요소가 렌더링되지 않는다", () => {
      const { container } = render(() => (
        <FormGroup>
          <FormGroup.Item>Input</FormGroup.Item>
        </FormGroup>
      ));
      expect(container.querySelector("label")).toBeNull();
    });
  });

  describe("label 스타일", () => {
    it("label에 font-bold가 적용된다", () => {
      const { container } = render(() => (
        <FormGroup>
          <FormGroup.Item label="Name">Input</FormGroup.Item>
        </FormGroup>
      ));
      const label = container.querySelector("label");
      expect(label?.classList.contains("font-bold")).toBe(true);
    });

    it("label에 mb-1이 적용된다", () => {
      const { container } = render(() => (
        <FormGroup>
          <FormGroup.Item label="Name">Input</FormGroup.Item>
        </FormGroup>
      ));
      const label = container.querySelector("label");
      expect(label?.classList.contains("mb-1")).toBe(true);
    });

    it("label에 block display가 적용된다", () => {
      const { container } = render(() => (
        <FormGroup>
          <FormGroup.Item label="Name">Input</FormGroup.Item>
        </FormGroup>
      ));
      const label = container.querySelector("label");
      expect(label?.classList.contains("block")).toBe(true);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 Item에 적용된다", () => {
      const { container } = render(() => (
        <FormGroup>
          {/* eslint-disable-next-line tailwindcss/no-custom-classname */}
          <FormGroup.Item class="my-item">Content</FormGroup.Item>
        </FormGroup>
      ));
      const item = container.querySelector("[data-form-group-item]");
      expect(item?.classList.contains("my-item")).toBe(true);
    });
  });
});
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `pnpm vitest packages/solid/tests/components/layout/FormGroup.spec.tsx --project=solid --run`
Expected: FAIL - FormGroup 컴포넌트가 존재하지 않음

---

## Task 9: FormGroup 컴포넌트 - 구현

**Files:**

- Create: `packages/solid/src/components/layout/FormGroup.tsx`

**Step 1: FormGroup 컴포넌트 구현**

```tsx
// packages/solid/src/components/layout/FormGroup.tsx
import { type JSX, type ParentComponent, Show, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface FormGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  inline?: boolean;
}

export interface FormGroupItemProps extends JSX.HTMLAttributes<HTMLDivElement> {
  label?: JSX.Element;
}

const baseClass = clsx("flex", "flex-col", "gap-4");
const inlineClass = clsx("inline-flex", "flex-row", "flex-wrap", "gap-2", "items-center");

const FormGroupItem: ParentComponent<FormGroupItemProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "label"]);

  return (
    <div class={twMerge(local.class)} data-form-group-item {...rest}>
      <Show when={local.label}>
        <label class="block font-bold mb-1">{local.label}</label>
      </Show>
      {local.children}
    </div>
  );
};

interface FormGroupComponent extends ParentComponent<FormGroupProps> {
  Item: typeof FormGroupItem;
}

const FormGroupBase: ParentComponent<FormGroupProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "inline"]);

  const getClassName = () => twMerge(local.inline ? inlineClass : baseClass, local.class);

  return (
    <div class={getClassName()} {...rest}>
      {local.children}
    </div>
  );
};

export const FormGroup = FormGroupBase as FormGroupComponent;
FormGroup.Item = FormGroupItem;
```

**Step 2: 테스트 실행하여 통과 확인**

Run: `pnpm vitest packages/solid/tests/components/layout/FormGroup.spec.tsx --project=solid --run`
Expected: PASS - 모든 테스트 통과

**Step 3: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

**Step 4: Commit**

```bash
git add packages/solid/src/components/layout/FormGroup.tsx packages/solid/tests/components/layout/FormGroup.spec.tsx
git commit -m "$(cat <<'EOF'
feat(solid): add FormGroup compound component

- vertical layout (flex-col gap-4) by default
- horizontal layout (inline-flex flex-row) with inline prop
- FormGroup.Item with optional label
- label styled with font-bold mb-1 block

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: FormTable 컴포넌트 - 테스트 작성

**Files:**

- Create: `packages/solid/tests/components/layout/FormTable.spec.tsx`

**Step 1: 테스트 파일 생성**

```tsx
// packages/solid/tests/components/layout/FormTable.spec.tsx
import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { FormTable } from "../../../src/components/layout/FormTable";

describe("FormTable 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("children이 FormTable 내부에 표시된다", () => {
      const { container } = render(() => (
        <FormTable>
          <tbody>
            <tr>
              <td>Content</td>
            </tr>
          </tbody>
        </FormTable>
      ));
      expect(container.querySelector("td")?.textContent).toBe("Content");
    });

    it("table 요소로 렌더링된다", () => {
      const { container } = render(() => <FormTable>Content</FormTable>);
      const table = container.firstChild as HTMLElement;
      expect(table.tagName).toBe("TABLE");
    });
  });

  describe("기본 스타일", () => {
    it("border-separate가 적용된다", () => {
      const { container } = render(() => <FormTable>Content</FormTable>);
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("border-separate")).toBe(true);
    });

    it("border-spacing-0이 적용된다", () => {
      const { container } = render(() => <FormTable>Content</FormTable>);
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("border-spacing-0")).toBe(true);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 기존 스타일과 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <FormTable class="my-form-table">Content</FormTable>);
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("my-form-table")).toBe(true);
      expect(table.classList.contains("border-separate")).toBe(true);
    });
  });

  describe("HTML 속성 전달", () => {
    it("data-* 속성이 전달된다", () => {
      const { container } = render(() => <FormTable data-testid="test-table">Content</FormTable>);
      const table = container.firstChild as HTMLElement;
      expect(table.getAttribute("data-testid")).toBe("test-table");
    });
  });
});
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `pnpm vitest packages/solid/tests/components/layout/FormTable.spec.tsx --project=solid --run`
Expected: FAIL - FormTable 컴포넌트가 존재하지 않음

---

## Task 11: FormTable 컴포넌트 - 구현

**Files:**

- Create: `packages/solid/src/components/layout/FormTable.tsx`

**Step 1: FormTable 컴포넌트 구현**

```tsx
// packages/solid/src/components/layout/FormTable.tsx
import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface FormTableProps extends JSX.HTMLAttributes<HTMLTableElement> {}

const baseClass = clsx("border-separate", "border-spacing-0");

export const FormTable: ParentComponent<FormTableProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);

  return (
    <table class={twMerge(baseClass, local.class)} {...rest}>
      {local.children}
    </table>
  );
};
```

**Step 2: 테스트 실행하여 통과 확인**

Run: `pnpm vitest packages/solid/tests/components/layout/FormTable.spec.tsx --project=solid --run`
Expected: PASS - 모든 테스트 통과

**Step 3: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

**Step 4: Commit**

```bash
git add packages/solid/src/components/layout/FormTable.tsx packages/solid/tests/components/layout/FormTable.spec.tsx
git commit -m "$(cat <<'EOF'
feat(solid): add FormTable component

- table with border-separate border-spacing-0
- minimal styling, th/td styled at usage site

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Table 컴포넌트 - 테스트 작성

**Files:**

- Create: `packages/solid/tests/components/layout/Table.spec.tsx`

**Step 1: 테스트 파일 생성**

```tsx
// packages/solid/tests/components/layout/Table.spec.tsx
import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Table } from "../../../src/components/layout/Table";

describe("Table 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("children이 Table 내부에 표시된다", () => {
      const { container } = render(() => (
        <Table>
          <tbody>
            <tr>
              <td>Content</td>
            </tr>
          </tbody>
        </Table>
      ));
      expect(container.querySelector("td")?.textContent).toBe("Content");
    });

    it("table 요소로 렌더링된다", () => {
      const { container } = render(() => <Table>Content</Table>);
      const table = container.firstChild as HTMLElement;
      expect(table.tagName).toBe("TABLE");
    });
  });

  describe("기본 스타일", () => {
    it("w-full이 적용된다", () => {
      const { container } = render(() => <Table>Content</Table>);
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("w-full")).toBe(true);
    });

    it("border-separate가 적용된다", () => {
      const { container } = render(() => <Table>Content</Table>);
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("border-separate")).toBe(true);
    });

    it("border-spacing-0이 적용된다", () => {
      const { container } = render(() => <Table>Content</Table>);
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("border-spacing-0")).toBe(true);
    });

    it("테두리 스타일이 적용된다", () => {
      const { container } = render(() => <Table>Content</Table>);
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("border-r")).toBe(true);
      expect(table.classList.contains("border-b")).toBe(true);
      expect(table.classList.contains("border-gray-300")).toBe(true);
      expect(table.classList.contains("dark:border-gray-600")).toBe(true);
    });
  });

  describe("inset 속성", () => {
    it("inset=true일 때 외곽 테두리가 제거된다", () => {
      const { container } = render(() => <Table inset>Content</Table>);
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("border-r-0")).toBe(true);
      expect(table.classList.contains("border-b-0")).toBe(true);
    });
  });

  describe("inline 속성", () => {
    it("inline=true일 때 w-auto가 적용된다", () => {
      const { container } = render(() => <Table inline>Content</Table>);
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("w-auto")).toBe(true);
      expect(table.classList.contains("w-full")).toBe(false);
    });
  });

  describe("속성 조합", () => {
    it("inset과 inline이 동시에 적용될 수 있다", () => {
      const { container } = render(() => (
        <Table inset inline>
          Content
        </Table>
      ));
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("border-r-0")).toBe(true);
      expect(table.classList.contains("border-b-0")).toBe(true);
      expect(table.classList.contains("w-auto")).toBe(true);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 기존 스타일과 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <Table class="my-table">Content</Table>);
      const table = container.firstChild as HTMLElement;
      expect(table.classList.contains("my-table")).toBe(true);
      expect(table.classList.contains("border-separate")).toBe(true);
    });
  });

  describe("HTML 속성 전달", () => {
    it("data-* 속성이 전달된다", () => {
      const { container } = render(() => <Table data-testid="test-table">Content</Table>);
      const table = container.firstChild as HTMLElement;
      expect(table.getAttribute("data-testid")).toBe("test-table");
    });
  });
});
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `pnpm vitest packages/solid/tests/components/layout/Table.spec.tsx --project=solid --run`
Expected: FAIL - Table 컴포넌트가 존재하지 않음

---

## Task 13: Table 컴포넌트 - 구현

**Files:**

- Create: `packages/solid/src/components/layout/Table.tsx`

**Step 1: Table 컴포넌트 구현**

```tsx
// packages/solid/src/components/layout/Table.tsx
import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface TableProps extends JSX.HTMLAttributes<HTMLTableElement> {
  inset?: boolean;
  inline?: boolean;
}

const baseClass = clsx(
  "w-full",
  "border-separate",
  "border-spacing-0",
  "border-r border-b border-gray-300 dark:border-gray-600",
);

const insetClass = clsx("border-r-0", "border-b-0");
const inlineClass = clsx("w-auto");

export const Table: ParentComponent<TableProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "inset", "inline"]);

  const getClassName = () => twMerge(baseClass, local.inset && insetClass, local.inline && inlineClass, local.class);

  return (
    <table class={getClassName()} {...rest}>
      {local.children}
    </table>
  );
};
```

**Step 2: 테스트 실행하여 통과 확인**

Run: `pnpm vitest packages/solid/tests/components/layout/Table.spec.tsx --project=solid --run`
Expected: PASS - 모든 테스트 통과

**Step 3: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

**Step 4: Commit**

```bash
git add packages/solid/src/components/layout/Table.tsx packages/solid/tests/components/layout/Table.spec.tsx
git commit -m "$(cat <<'EOF'
feat(solid): add Table component

- w-full with border-separate border-spacing-0
- right and bottom border with gray color
- inset prop removes outer borders
- inline prop sets w-auto
- dark mode border support

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: index.ts export 추가

**Files:**

- Modify: `packages/solid/src/index.ts`

**Step 1: export 문 추가**

```ts
// packages/solid/src/index.ts (기존 내용에 추가)
export * from "./components/controls/Button";
export * from "./components/data/List";
export * from "./components/data/ListContext";
export * from "./components/data/ListItem";
export * from "./components/disclosure/Collapse";
export * from "./components/display/Card";
export * from "./components/display/Icon";
export * from "./components/display/Label";
export * from "./components/display/Note";
export * from "./components/layout/FormGroup";
export * from "./components/layout/FormTable";
export * from "./components/layout/Table";
export * from "./components/navigation/Sidebar";
export * from "./components/navigation/SidebarContainer";
export * from "./components/navigation/SidebarContext";
export * from "./components/navigation/SidebarMenu";
export * from "./components/navigation/SidebarUser";
export * from "./components/navigation/Topbar";
export * from "./components/navigation/TopbarContainer";
export * from "./components/navigation/TopbarMenu";
export * from "./components/navigation/TopbarUser";
export * from "./components/overlay/Dropdown";
export * from "./contexts/ConfigContext";
export * from "./contexts/usePersisted";
export { ripple } from "./directives/ripple";
export { createPropSignal } from "./hooks/createPropSignal";
export { useRouterLink } from "./hooks/useRouterLink";
export { mergeStyles } from "./utils/mergeStyles";
```

**Step 2: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

**Step 3: Commit**

```bash
git add packages/solid/src/index.ts
git commit -m "$(cat <<'EOF'
feat(solid): export new display and layout components

- Card, Label, Note from display/
- FormGroup, FormTable, Table from layout/

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: 전체 테스트 실행 및 린트

**Files:**

- None (검증만)

**Step 1: 전체 solid 테스트 실행**

Run: `pnpm vitest packages/solid --project=solid --run`
Expected: PASS - 모든 테스트 통과

**Step 2: 린트 실행**

Run: `pnpm lint packages/solid`
Expected: 에러 없음 (또는 --fix로 수정 가능한 경고만)

**Step 3: 린트 수정 (필요시)**

Run: `pnpm lint packages/solid --fix`
Expected: 자동 수정 완료

**Step 4: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

**Step 5: Commit (린트 수정이 있는 경우)**

```bash
git add -A
git commit -m "$(cat <<'EOF'
style(solid): fix lint issues

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: solid-demo에서 시각적 테스트

**Files:**

- Modify: `packages/solid-demo/src/App.tsx` (또는 적절한 데모 페이지)

**Step 1: solid-demo 실행**

Run: `pnpm watch solid solid-demo` (별도 터미널)
Expected: http://localhost:40080 에서 데모 앱 실행

**Step 2: 데모 페이지에 컴포넌트 추가 (임시)**

데모 페이지에서 새 컴포넌트들을 사용하여 시각적으로 확인:

```tsx
import { Card, Label, Note, FormGroup, FormTable, Table } from "@simplysm/solid";

// Card 테스트
<Card class="p-4">
  <h2>Card Title</h2>
  <p>Card content goes here</p>
</Card>

// Label 테스트
<div class="flex gap-2">
  <Label>Default</Label>
  <Label theme="primary">Primary</Label>
  <Label theme="success">Success</Label>
  <Label theme="danger">Danger</Label>
</div>

// Note 테스트
<Note theme="info">This is an info note</Note>
<Note theme="warning">This is a warning note</Note>

// FormGroup 테스트
<FormGroup>
  <FormGroup.Item label="Name">
    <input type="text" class="border p-1" />
  </FormGroup.Item>
  <FormGroup.Item label="Email">
    <input type="email" class="border p-1" />
  </FormGroup.Item>
</FormGroup>

// Table 테스트
<Table>
  <thead>
    <tr>
      <th class="border-l border-t border-gray-300 p-2">Header 1</th>
      <th class="border-l border-t border-gray-300 p-2">Header 2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="border-l border-t border-gray-300 p-2">Cell 1</td>
      <td class="border-l border-t border-gray-300 p-2">Cell 2</td>
    </tr>
  </tbody>
</Table>
```

**Step 3: 브라우저에서 시각적 확인**

- Card: 흰색 배경, 그림자, 등장 애니메이션
- Label: 각 테마별 배경색
- Note: 연한 배경색
- FormGroup: 수직 레이아웃, 라벨 볼드
- Table: 테두리 표시

**Step 4: 시각적 확인 완료 후 데모 코드 제거 또는 유지**

데모 목적으로 유지하거나 제거 결정

---

## 완료 체크리스트

- [ ] Task 1: Tailwind 설정 - card-in 애니메이션 추가
- [ ] Task 2-3: Card 컴포넌트 (테스트 → 구현)
- [ ] Task 4-5: Label 컴포넌트 (테스트 → 구현)
- [ ] Task 6-7: Note 컴포넌트 (테스트 → 구현)
- [ ] Task 8-9: FormGroup 컴포넌트 (테스트 → 구현)
- [ ] Task 10-11: FormTable 컴포넌트 (테스트 → 구현)
- [ ] Task 12-13: Table 컴포넌트 (테스트 → 구현)
- [ ] Task 14: index.ts export 추가
- [ ] Task 15: 전체 테스트 및 린트
- [ ] Task 16: solid-demo 시각적 테스트
