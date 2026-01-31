---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
  - 5
  - 6
  - 7
  - 8
lastStep: 8
status: 'complete'
completedAt: '2026-02-01'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - docs/index.md
  - docs/architecture.md
  - docs/technology-stack.md
  - docs/component-inventory.md
  - docs/api-contracts.md
  - docs/source-tree-analysis.md
  - docs/development-guide.md
workflowType: 'architecture'
project_name: 'simplysm'
user_name: '김석래'
date: '2026-02-01'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
sd-angular에서 마이그레이션할 35개 이상의 UI 컴포넌트를 7개 카테고리로 구성:
- Form Controls (17개): 사용자 입력을 받는 핵심 컴포넌트
- Layout (2개): 페이지 구조 배치
- Navigation (5개): 앱 네비게이션 UI
- Data Display (5개): 데이터 표시 (Sheet가 가장 복잡)
- Overlay (4개): 모달, 토스트 등 오버레이 UI
- Visual (3개): 시각적 피드백 컴포넌트
- Configuration (3개): 앱 전역 설정 및 테마

**Non-Functional Requirements:**
- Performance: 16ms 렌더링, 1,000행+ 가상 스크롤 (Sheet)
- Compatibility: SolidJS 1.9+, 최신 브라우저, 기존 컴포넌트 호환
- Bundle Size: tree-shaking, 미사용 컴포넌트 번들 제외
- Maintainability: 완전한 TypeScript 타입, 독립적 테스트 가능

**Scale & Complexity:**
- Primary domain: UI Component Library (browser target)
- Complexity level: Medium
- Estimated architectural components: ~35 MVP 컴포넌트

### Technical Constraints & Dependencies

- **기존 인프라**: vanilla-extract 스타일 시스템 이미 구축됨
- **패턴 준수**: 기존 solid 패키지의 폴더 구조 및 API 패턴
- **프레임워크**: SolidJS 네이티브 패턴 (createSignal, createEffect, createMemo)
- **스타일링**: atoms, themeVars 기반 일관된 스타일
- **제외 항목**: features/data-view

### Cross-Cutting Concerns Identified

| 관심사 | 영향 범위 | 아키텍처 고려사항 |
|--------|----------|------------------|
| 스타일 시스템 | 모든 컴포넌트 | vanilla-extract + themeVars 일관성 |
| 접근성 | 모든 입력 컴포넌트 | 키보드 네비게이션, ARIA 속성 |
| 반응형 | UI 전체 | 520px 브레이크포인트 |
| 유효성 검사 | 폼 컴포넌트 | invalid directive 통합 |
| 테마 | 모든 컴포넌트 | 다크/라이트 모드 지원 |

## Technology Stack (Brownfield)

### Primary Technology Domain

UI Component Library (browser target) - 기존 @simplysm/solid 패키지 확장

### Existing Infrastructure

이 프로젝트는 Brownfield 프로젝트로 새로운 starter template이 필요하지 않습니다. 기존 기술 스택을 그대로 활용합니다.

**Language & Runtime:**
- TypeScript 5.9.3 (strict mode)
- Node.js 20.x+
- Browser target (DOM 포함)

**Framework:**
- SolidJS 1.9.11
- @solidjs/router 0.15.x (optional)

**Styling Solution:**
- vanilla-extract 1.18.0
- @vanilla-extract/recipes 0.5.7
- @vanilla-extract/sprinkles 1.6.5

**Build Tooling:**
- Vite 7.3.1 (개발 서버 + 번들링)
- esbuild 0.27.2 (트랜스파일링)
- pnpm workspace (모노레포 관리)

**Testing Framework:**
- Vitest 4.0.18
- Playwright 1.58.0 (브라우저 테스트)
- vite-plugin-solid (SolidJS 테스트)

**Code Quality:**
- ESLint 9.39.2 + @simplysm/eslint-plugin
- Prettier 3.8.1

### Architectural Decisions Already Established

| 결정 영역 | 확정된 선택 | 근거 |
|----------|------------|------|
| 컴포넌트 구조 | `components/{category}/{component}.tsx` | 기존 패턴 준수 |
| 스타일 파일 | `{component}.css.ts` (동일 폴더) | vanilla-extract 관례 |
| Export | `index.ts`에서 통합 export | tree-shaking 지원 |
| Props 패턴 | `interface {Component}Props` | TypeScript 관례 |
| 상태 관리 | createSignal, createEffect | SolidJS 네이티브 |
| 테마 | ThemeContext + themeVars | 기존 구현 활용 |

**Note:** 마이그레이션 작업은 기존 solid 패키지의 폴더 구조와 패턴을 그대로 따릅니다.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
모든 critical 결정은 기존 인프라에서 이미 확정됨 - 마이그레이션은 기존 패턴 준수

**Important Decisions (Shape Architecture):**
- 컴포넌트 API 설계 패턴
- Angular → SolidJS 패턴 변환 규칙
- Busy 상태 관리 개선 방식

**Deferred Decisions (Post-MVP):**
- Growth Features (kanban, barcode, calendar 등)
- 추가 접근성 개선

### Frontend Architecture

#### Component API Design

| 결정 | 선택 | 근거 |
|------|------|------|
| Props 타입 | `interface {Component}Props` | 기존 패턴, TypeScript 관례 |
| 값 바인딩 | `value`/`onChange` 패턴 | SolidJS 관례, controlled component |
| 크기 옵션 | `size?: "sm" \| "md" \| "lg"` | 기존 solid 컴포넌트 패턴 |
| 비활성화 | `disabled?: boolean` | HTML 표준 속성 |
| 유효성 | `invalid?: boolean` + `invalidMessage?: string` | 기존 invalid directive 활용 |

#### State Management

| 결정 | 선택 | 근거 |
|------|------|------|
| 로컬 상태 | `createSignal` | SolidJS 네이티브 |
| 파생 상태 | `createMemo` | SolidJS 네이티브 |
| 부수 효과 | `createEffect` | SolidJS 네이티브 |
| 전역 상태 | Context API | ThemeContext, ConfigContext 패턴 |
| Busy 상태 | Context 기반 전역 상태 | PRD 요구사항 (Suspense 또는 Context) |

#### Angular → SolidJS 변환 규칙

| Angular 패턴 | SolidJS 패턴 | 비고 |
|-------------|-------------|------|
| `@Input()` | Props interface | TypeScript interface로 정의 |
| `@Output()` | callback props (`on{Event}`) | `onChange`, `onClick` 등 |
| `[(ngModel)]` | `value` + `onChange` | Controlled component |
| `*ngIf` | `<Show when={...}>` | SolidJS 조건부 렌더링 |
| `*ngFor` | `<For each={...}>` | SolidJS 리스트 렌더링 |
| `@ViewChild` | `ref` prop | createRef 또는 callback ref |
| `ngOnInit` | `onMount` | SolidJS lifecycle |
| `ngOnDestroy` | `onCleanup` | SolidJS lifecycle |
| RxJS Observable | createSignal + createEffect | 반응형 상태 |

### Styling Architecture

| 결정 | 선택 | 근거 |
|------|------|------|
| 스타일 파일 | `{component}.css.ts` | vanilla-extract 관례 |
| 테마 변수 | `themeVars` import | 기존 시스템 활용 |
| 유틸리티 | `atoms` (sprinkles) | 기존 시스템 활용 |
| 변형 스타일 | `recipe` | vanilla-extract/recipes |
| 단위 | `rem` only | CLAUDE.md 규칙 (em 금지) |

### Testing Strategy

| 결정 | 선택 | 근거 |
|------|------|------|
| 단위 테스트 | Vitest + @solidjs/testing-library | 기존 설정 |
| 브라우저 테스트 | Playwright | 기존 설정 |
| 테스트 파일 위치 | `packages/solid/tests/` | 기존 구조 |
| 테스트 패턴 | `{component}.spec.tsx` | 기존 관례 |

### Decision Impact Analysis

**Implementation Sequence:**
1. Form Controls (기본 입력 컴포넌트) - 다른 컴포넌트의 의존성
2. Layout (Dock, Card) - 페이지 구조 기반
3. Navigation (Tab, Sidebar, Topbar) - 앱 구조
4. Overlay (Modal, Toast, Dropdown) - 사용자 피드백
5. Data (List) - 데이터 표시
6. Visual (Progress, Note, Label) - 시각적 피드백
7. Sheet - 가장 복잡, 마지막 구현

**Cross-Component Dependencies:**
- 모든 폼 컴포넌트 → invalid directive 공유
- 모든 컴포넌트 → themeVars, atoms 공유
- Dropdown → Select, DateField, TimeField에서 사용
- Busy → 전역 Context로 Modal, Sheet 등에서 활용

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
AI 에이전트 간 일관성을 위해 아래 패턴을 반드시 준수

### Naming Patterns

**File Naming Conventions:**
```
컴포넌트 파일: kebab-case.tsx (예: text-field.tsx, date-field.tsx)
스타일 파일: kebab-case.css.ts (예: text-field.css.ts)
컨텍스트 파일: PascalCase.tsx (예: ThemeContext.tsx)
훅 파일: camelCase.ts (예: useLocalStorage.ts)
디렉티브 파일: kebab-case.ts (예: ripple.ts)
```

**Code Naming Conventions:**
```typescript
// 컴포넌트: PascalCase
export function TextField(props: TextFieldProps) { ... }

// Props 인터페이스: {Component}Props
export interface TextFieldProps { ... }

// 함수/변수: camelCase
const [inputValue, setInputValue] = createSignal("");

// CSS 클래스: camelCase (vanilla-extract)
export const textFieldStyle = style({ ... });

// 상수: UPPER_SNAKE_CASE (선택적)
const DEFAULT_SIZE = "md";
```

**Props Naming Conventions:**
```typescript
// 값 바인딩
value?: T;
onChange?: (value: T) => void;

// 불린 속성
disabled?: boolean;
invalid?: boolean;
readonly?: boolean;

// 이벤트 콜백
onClick?: (event: MouseEvent) => void;
onFocus?: (event: FocusEvent) => void;

// 크기/변형
size?: "sm" | "md" | "lg";
theme?: "primary" | "secondary" | "danger";
```

### Structure Patterns

**Component File Structure:**
```
packages/solid/src/
├── components/
│   ├── controls/           # 폼 입력 컴포넌트
│   │   ├── button.tsx
│   │   ├── button.css.ts
│   │   ├── text-field.tsx
│   │   ├── text-field.css.ts
│   │   └── ...
│   ├── data/               # 데이터 표시 컴포넌트
│   ├── navigator/          # 네비게이션 컴포넌트
│   ├── overlay/            # 오버레이 컴포넌트
│   └── layout/             # 레이아웃 컴포넌트 (신규)
├── contexts/               # Context providers
├── directives/             # SolidJS directives
├── hooks/                  # 커스텀 훅
├── styles/                 # 스타일 시스템
│   ├── variables/
│   └── mixins/
└── index.ts                # 통합 export
```

**Component Template:**
```tsx
// text-field.tsx
import { type JSX, splitProps, createSignal } from "solid-js";
import { textFieldStyle, textFieldVariants } from "./text-field.css";

export interface TextFieldProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  invalidMessage?: string;
  size?: "sm" | "md" | "lg";
}

export function TextField(props: TextFieldProps): JSX.Element {
  const [local, others] = splitProps(props, [
    "value",
    "onChange",
    "placeholder",
    "disabled",
    "invalid",
    "invalidMessage",
    "size",
  ]);

  return (
    <input
      class={textFieldVariants({ size: local.size ?? "md" })}
      value={local.value ?? ""}
      onInput={(e) => local.onChange?.(e.currentTarget.value)}
      placeholder={local.placeholder}
      disabled={local.disabled}
      {...others}
    />
  );
}
```

### Format Patterns

**Style File Format:**
```typescript
// text-field.css.ts
import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { themeVars } from "../../styles/variables/theme.css";
import { atoms } from "../../styles/atoms.css";

export const textFieldBase = style({
  padding: "0.5rem",
  borderRadius: themeVars.radius.md,
  border: `1px solid ${themeVars.colors.border}`,
});

export const textFieldVariants = recipe({
  base: textFieldBase,
  variants: {
    size: {
      sm: { fontSize: "0.875rem", padding: "0.25rem 0.5rem" },
      md: { fontSize: "1rem", padding: "0.5rem 0.75rem" },
      lg: { fontSize: "1.125rem", padding: "0.75rem 1rem" },
    },
  },
  defaultVariants: {
    size: "md",
  },
});
```

### Communication Patterns

**Event Callback Patterns:**
```typescript
// 단순 값 변경
onChange?: (value: T) => void;

// 이벤트 객체 필요 시
onClick?: (event: MouseEvent) => void;

// 여러 값 변경
onSelectionChange?: (selection: { id: string; value: T }) => void;
```

**Context Usage Pattern:**
```typescript
// Context 정의
export const BusyContext = createContext<{
  isBusy: Accessor<boolean>;
  setBusy: (busy: boolean) => void;
}>();

// Provider 사용
<BusyContext.Provider value={{ isBusy, setBusy }}>
  {props.children}
</BusyContext.Provider>

// Consumer 사용
const ctx = useContext(BusyContext);
```

### Process Patterns

**Error Handling:**
```typescript
// 유효성 검사 표시
<TextField
  invalid={hasError()}
  invalidMessage={errorMessage()}
/>

// 에러 경계 (optional)
<ErrorBoundary fallback={(err) => <ErrorDisplay error={err} />}>
  <Component />
</ErrorBoundary>
```

**Loading State:**
```typescript
// 로컬 로딩 상태
const [loading, setLoading] = createSignal(false);

// 전역 Busy 상태 (Context 사용)
const { setBusy } = useContext(BusyContext);
setBusy(true);
try {
  await asyncOperation();
} finally {
  setBusy(false);
}
```

### Enforcement Guidelines

**All AI Agents MUST:**
- 파일명은 kebab-case 사용 (예: `date-field.tsx`)
- 컴포넌트명은 PascalCase 사용 (예: `DateField`)
- Props 인터페이스는 `{Component}Props` 패턴 사용
- 스타일 단위는 `rem` 사용 (`em` 금지 - CLAUDE.md)
- 기존 컴포넌트 패턴 참조 후 구현
- `@simplysm/*/src/` 경로 import 금지

**Pattern Enforcement:**
- `pnpm lint`로 코드 스타일 검증
- `pnpm typecheck`로 타입 검증
- 기존 컴포넌트 코드 참조하여 패턴 일관성 유지

### Pattern Examples

**Good Examples:**
```typescript
// ✅ 올바른 import
import { Button } from "@simplysm/solid";

// ✅ 올바른 Props 정의
export interface SelectProps<T> {
  value?: T;
  onChange?: (value: T) => void;
  options: T[];
  disabled?: boolean;
}

// ✅ 올바른 스타일 단위
padding: "1rem"  // rem 사용
```

**Anti-Patterns:**
```typescript
// ❌ 잘못된 import (src 경로 직접 참조)
import { Button } from "@simplysm/solid/src/components/controls/button";

// ❌ 잘못된 스타일 단위
padding: "1em"  // em 사용 금지

// ❌ React 패턴 사용
const [state, setState] = useState("");  // SolidJS에서는 createSignal 사용
```

## Project Structure & Boundaries

### Complete Project Directory Structure

마이그레이션 대상 패키지: `packages/solid/`

```
packages/solid/
├── package.json
├── README.md
├── src/
│   ├── index.ts                    # 통합 export
│   ├── styles.ts                   # 스타일 통합 export
│   │
│   ├── components/
│   │   ├── controls/               # 폼 입력 컴포넌트 (MVP)
│   │   │   ├── button.tsx          # ✅ 기존
│   │   │   ├── button.css.ts
│   │   │   ├── checkbox.tsx        # ✅ 기존
│   │   │   ├── checkbox.css.ts
│   │   │   ├── radio.tsx           # ✅ 기존
│   │   │   ├── radio.css.ts
│   │   │   ├── text-field.tsx      # ✅ 기존
│   │   │   ├── text-field.css.ts
│   │   │   ├── number-field.tsx    # ✅ 기존
│   │   │   ├── number-field.css.ts
│   │   │   ├── date-field.tsx      # ✅ 기존
│   │   │   ├── date-field.css.ts
│   │   │   ├── time-field.tsx      # ✅ 기존
│   │   │   ├── time-field.css.ts
│   │   │   ├── datetime-field.tsx  # ✅ 기존
│   │   │   ├── datetime-field.css.ts
│   │   │   ├── color-field.tsx     # ✅ 기존
│   │   │   ├── color-field.css.ts
│   │   │   ├── anchor.tsx          # 🆕 마이그레이션
│   │   │   ├── anchor.css.ts
│   │   │   ├── textarea.tsx        # 🆕 마이그레이션
│   │   │   ├── textarea.css.ts
│   │   │   ├── select.tsx          # 🆕 마이그레이션
│   │   │   ├── select.css.ts
│   │   │   ├── checkbox-group.tsx  # 🆕 마이그레이션
│   │   │   ├── checkbox-group.css.ts
│   │   │   ├── switch.tsx          # 🆕 마이그레이션
│   │   │   ├── switch.css.ts
│   │   │   ├── date-range.tsx      # 🆕 마이그레이션
│   │   │   ├── date-range.css.ts
│   │   │   ├── range.tsx           # 🆕 마이그레이션 (Slider)
│   │   │   ├── range.css.ts
│   │   │   ├── form.tsx            # 🆕 마이그레이션
│   │   │   └── form.css.ts
│   │   │
│   │   ├── layout/                 # 레이아웃 컴포넌트 (🆕 신규 카테고리)
│   │   │   ├── dock.tsx            # 🆕 마이그레이션
│   │   │   ├── dock.css.ts
│   │   │   ├── card.tsx            # 🆕 마이그레이션
│   │   │   └── card.css.ts
│   │   │
│   │   ├── navigator/              # 네비게이션 컴포넌트
│   │   │   ├── collapse.tsx        # ✅ 기존
│   │   │   ├── collapse.css.ts
│   │   │   ├── collapse-icon.tsx   # ✅ 기존
│   │   │   ├── sidebar*.tsx        # ✅ 기존
│   │   │   ├── topbar*.tsx         # ✅ 기존
│   │   │   ├── tab.tsx             # 🆕 마이그레이션
│   │   │   ├── tab.css.ts
│   │   │   ├── pagination.tsx      # 🆕 마이그레이션
│   │   │   └── pagination.css.ts
│   │   │
│   │   ├── data/                   # 데이터 표시 컴포넌트
│   │   │   ├── list.tsx            # ✅ 기존
│   │   │   ├── list.css.ts
│   │   │   ├── list-item.tsx       # ✅ 기존
│   │   │   ├── sheet.tsx           # 🆕 마이그레이션 (복잡)
│   │   │   └── sheet.css.ts
│   │   │
│   │   ├── overlay/                # 오버레이 컴포넌트
│   │   │   ├── dropdown.tsx        # ✅ 기존
│   │   │   ├── dropdown.css.ts
│   │   │   ├── dropdown-popup.tsx  # ✅ 기존
│   │   │   ├── dropdown-context.tsx# ✅ 기존
│   │   │   ├── modal.tsx           # 🆕 마이그레이션
│   │   │   ├── modal.css.ts
│   │   │   ├── toast.tsx           # 🆕 마이그레이션
│   │   │   └── toast.css.ts
│   │   │
│   │   └── visual/                 # 시각적 피드백 컴포넌트 (🆕 신규 카테고리)
│   │       ├── progress.tsx        # 🆕 마이그레이션
│   │       ├── progress.css.ts
│   │       ├── note.tsx            # 🆕 마이그레이션
│   │       ├── note.css.ts
│   │       ├── label.tsx           # 🆕 마이그레이션
│   │       └── label.css.ts
│   │
│   ├── contexts/                   # Context providers
│   │   ├── ConfigContext.tsx       # ✅ 기존
│   │   ├── ThemeContext.tsx        # ✅ 기존
│   │   └── BusyContext.tsx         # 🆕 신규 (전역 로딩 상태)
│   │
│   ├── directives/                 # SolidJS directives
│   │   ├── ripple.ts               # ✅ 기존
│   │   └── invalid.ts              # ✅ 기존
│   │
│   ├── hooks/                      # 커스텀 훅
│   │   └── useLocalStorage.ts      # ✅ 기존
│   │
│   └── styles/                     # 스타일 시스템
│       ├── global.css.ts           # ✅ 기존
│       ├── atoms.css.ts            # ✅ 기존
│       ├── variables/
│       │   ├── colors.css.ts       # ✅ 기존
│       │   ├── theme.css.ts        # ✅ 기존
│       │   ├── token.css.ts        # ✅ 기존
│       │   └── vars.css.ts         # ✅ 기존
│       └── mixins/
│           └── boolean-transition.css.ts # ✅ 기존
│
└── tests/                          # 테스트 파일
    ├── controls/
    │   ├── button.spec.tsx
    │   ├── text-field.spec.tsx
    │   └── ...
    ├── layout/
    ├── navigator/
    ├── data/
    ├── overlay/
    └── visual/
```

### Architectural Boundaries

**Component Boundaries:**

| 카테고리 | 책임 | 의존성 |
|----------|------|--------|
| controls/ | 사용자 입력 수집 | styles/, directives/, contexts/ |
| layout/ | 페이지 구조 배치 | styles/ |
| navigator/ | 앱 네비게이션 | styles/, contexts/ |
| data/ | 데이터 표시 | styles/, contexts/ |
| overlay/ | 모달/토스트 | styles/, contexts/ |
| visual/ | 시각적 피드백 | styles/ |

**Context Boundaries:**

| Context | 범위 | 사용 컴포넌트 |
|---------|------|--------------|
| ConfigContext | 앱 전역 설정 | 모든 컴포넌트 |
| ThemeContext | 테마 (다크/라이트) | 모든 컴포넌트 |
| BusyContext | 전역 로딩 상태 | Modal, Sheet, 비동기 작업 |

**Style Boundaries:**

| 스타일 레이어 | 범위 | 사용 방법 |
|--------------|------|----------|
| global.css.ts | 전역 리셋/기본 스타일 | 앱 루트에서 import |
| atoms.css.ts | 유틸리티 클래스 | `atoms({ ... })` |
| themeVars | CSS 변수 | `themeVars.colors.primary` |
| recipe | 컴포넌트 변형 | 컴포넌트별 정의 |

### Requirements to Structure Mapping

**Form Controls (FR1-FR17):**
```
components/controls/
├── button.tsx          → FR1 (Button)
├── anchor.tsx          → FR2 (Anchor)
├── text-field.tsx      → FR3 (TextField)
├── textarea.tsx        → FR4 (Textarea)
├── select.tsx          → FR5 (Select)
├── checkbox.tsx        → FR6 (Checkbox)
├── checkbox-group.tsx  → FR7 (CheckboxGroup)
├── switch.tsx          → FR8 (Switch)
├── radio.tsx           → FR9 (Radio)
├── date-field.tsx      → FR10 (DateField)
├── time-field.tsx      → FR11 (TimeField)
├── date-range.tsx      → FR12 (DateRange)
├── number-field.tsx    → FR13 (NumberField)
├── range.tsx           → FR14 (Range/Slider)
├── color-field.tsx     → FR15 (ColorField)
└── form.tsx            → FR16, FR17 (유효성 검사, Form)
```

**Layout (FR18-FR19):**
```
components/layout/
├── dock.tsx            → FR18 (Dock)
└── card.tsx            → FR19 (Card)
```

**Navigation (FR20-FR24):**
```
components/navigator/
├── tab.tsx             → FR20 (Tab)
├── sidebar.tsx         → FR21 (Sidebar)
├── topbar.tsx          → FR22 (Topbar)
├── pagination.tsx      → FR23 (Pagination)
└── collapse.tsx        → FR24 (Collapse)
```

**Data Display (FR25-FR29):**
```
components/data/
├── list.tsx            → FR25 (List)
└── sheet.tsx           → FR26-FR29 (Sheet + 정렬/선택/필터)
```

**Overlay (FR30-FR33):**
```
components/overlay/
├── modal.tsx           → FR30 (Modal)
├── toast.tsx           → FR31 (Toast)
├── dropdown.tsx        → FR32 (Dropdown)
└── contexts/BusyContext.tsx → FR33 (Busy)
```

**Visual (FR34-FR36):**
```
components/visual/
├── progress.tsx        → FR34 (Progress)
├── note.tsx            → FR35 (Note)
└── label.tsx           → FR36 (Label)
```

### Integration Points

**Internal Communication:**
- 컴포넌트 → Context: `useContext(ThemeContext)`
- 컴포넌트 → 컴포넌트: Props를 통한 데이터 전달
- 폼 컴포넌트 → invalid directive: 유효성 표시

**Cross-Component Dependencies:**
```
Select, DateField, TimeField
    └── Dropdown (overlay/)

Sheet
    └── Pagination (navigator/)
    └── Checkbox (controls/)

Modal, Toast
    └── BusyContext (contexts/)
```

### Development Workflow Integration

**개발 서버:**
```bash
pnpm watch solid solid-demo
# solid-demo는 Vite dev server로 실행
```

**테스트:**
```bash
pnpm vitest --project=solid
```

**빌드 검증:**
```bash
pnpm typecheck packages/solid
pnpm lint packages/solid
```

**Export 추가:**
새 컴포넌트 추가 시 `src/index.ts`에 export 추가 필수

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
- TypeScript 5.9.3 + SolidJS 1.9.11 + vanilla-extract 1.18.0: 호환성 검증됨
- 기존 solid 패키지에서 동일 스택 운영 중이므로 충돌 없음
- 모든 의존성이 pnpm workspace에서 관리되어 버전 일관성 보장

**Pattern Consistency:**
- 파일 명명 (kebab-case), 컴포넌트 명명 (PascalCase) 패턴 일관됨
- Props 인터페이스 패턴 (`{Component}Props`) 모든 컴포넌트에 적용
- vanilla-extract 스타일 패턴 (recipe, atoms, themeVars) 일관 적용

**Structure Alignment:**
- 프로젝트 구조가 기존 solid 패키지 구조와 일치
- 신규 카테고리 (layout/, visual/)도 동일 패턴 적용
- 컴포넌트 → 스타일 → Context 의존성 명확

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**

| 카테고리 | FR 수 | 커버리지 | 비고 |
|----------|-------|----------|------|
| Form Controls | 17 | ✅ 100% | controls/ 폴더에 매핑 |
| Layout | 2 | ✅ 100% | layout/ 폴더에 매핑 |
| Navigation | 5 | ✅ 100% | navigator/ 폴더에 매핑 |
| Data Display | 5 | ✅ 100% | data/ 폴더에 매핑 |
| Overlay | 4 | ✅ 100% | overlay/ + contexts/ 매핑 |
| Visual | 3 | ✅ 100% | visual/ 폴더에 매핑 |
| Configuration | 3 | ✅ 100% | contexts/ 폴더에 매핑 |

**Non-Functional Requirements Coverage:**

| NFR | 커버리지 | 아키텍처 지원 |
|-----|----------|--------------|
| Performance (16ms 렌더링) | ✅ | SolidJS fine-grained reactivity |
| Performance (1,000행+ 가상 스크롤) | ✅ | Sheet 컴포넌트 설계에 반영 |
| SolidJS 1.9+ 호환 | ✅ | 기존 인프라 활용 |
| 최신 브라우저 지원 | ✅ | Vite 빌드 타겟 설정 |
| Tree-shaking | ✅ | ESM export + index.ts 구조 |
| TypeScript 타입 | ✅ | strict mode + 인터페이스 정의 |

### Implementation Readiness Validation ✅

**Decision Completeness:**
- 모든 기술 결정이 버전과 함께 문서화됨
- Angular → SolidJS 변환 규칙 명시됨
- 스타일링 패턴 예제 코드 포함

**Structure Completeness:**
- 전체 디렉토리 구조 정의됨
- 기존 컴포넌트 (✅)와 신규 컴포넌트 (🆕) 구분됨
- 모든 FR이 특정 파일에 매핑됨

**Pattern Completeness:**
- 파일/코드/Props 명명 규칙 정의됨
- 컴포넌트 템플릿 코드 제공됨
- 스타일 파일 템플릿 제공됨
- Anti-pattern 예시 포함됨

### Gap Analysis Results

**Critical Gaps:** 없음

**Important Gaps:**
- Sheet 컴포넌트의 상세 가상 스크롤 구현 패턴 (구현 시 정의)
- BusyContext의 상세 API (구현 시 확정)

**Nice-to-Have Gaps:**
- 접근성 (ARIA) 상세 가이드라인 (Post-MVP)
- 컴포넌트별 테스트 시나리오 템플릿

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] 프로젝트 컨텍스트 분석 완료
- [x] 스케일 및 복잡도 평가 완료
- [x] 기술적 제약 사항 식별됨
- [x] 교차 관심사 매핑 완료

**✅ Architectural Decisions**
- [x] 모든 중요 결정 버전과 함께 문서화됨
- [x] 기술 스택 완전히 명시됨
- [x] 통합 패턴 정의됨
- [x] 성능 고려사항 다뤄짐

**✅ Implementation Patterns**
- [x] 명명 규칙 확립됨
- [x] 구조 패턴 정의됨
- [x] 통신 패턴 명시됨
- [x] 프로세스 패턴 문서화됨

**✅ Project Structure**
- [x] 완전한 디렉토리 구조 정의됨
- [x] 컴포넌트 경계 확립됨
- [x] 통합 지점 매핑됨
- [x] 요구사항-구조 매핑 완료

### Architecture Readiness Assessment

**Overall Status:** ✅ READY FOR IMPLEMENTATION

**Confidence Level:** High
- 기존 solid 패키지의 검증된 패턴 재사용
- 명확한 마이그레이션 소스 (sd-angular)
- 기존 인프라 활용으로 리스크 최소화

**Key Strengths:**
- Brownfield 프로젝트로 기존 패턴과 인프라 활용 가능
- SolidJS + vanilla-extract 스택이 이미 안정화됨
- 명확한 Angular → SolidJS 변환 규칙
- 모든 컴포넌트가 특정 파일에 매핑됨

**Areas for Future Enhancement:**
- 접근성 개선 (Post-MVP)
- 컴포넌트 문서화 자동화
- 스토리북 또는 데모 페이지 확장

### Implementation Handoff

**AI Agent Guidelines:**
1. 모든 아키텍처 결정을 문서화된 대로 정확히 따를 것
2. 구현 패턴을 모든 컴포넌트에 일관되게 적용할 것
3. 프로젝트 구조와 경계를 준수할 것
4. 아키텍처 관련 질문은 이 문서를 참조할 것
5. 기존 solid 패키지의 컴포넌트를 참조 구현으로 활용할 것

**First Implementation Priority:**
1. Form Controls 카테고리 (다른 컴포넌트의 의존성)
2. Layout 카테고리 (페이지 구조 기반)
3. 순차적으로 나머지 카테고리 진행
4. Sheet 컴포넌트는 마지막 (가장 복잡)

