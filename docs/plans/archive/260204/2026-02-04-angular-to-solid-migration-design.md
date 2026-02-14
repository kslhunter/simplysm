# Angular → SolidJS 컴포넌트 마이그레이션 설계

## 개요

Angular legacy 패키지의 시각/레이아웃 컴포넌트들을 SolidJS solid 패키지로 마이그레이션한다.

## 마이그레이션 대상

| Angular 원본                     | SolidJS 컴포넌트               | 분류    |
| -------------------------------- | ------------------------------ | ------- |
| `SdCardDirective` + `_card.scss` | `Card`                         | display |
| `SdLabelControl`                 | `Label`                        | display |
| `SdNoteControl`                  | `Note`                         | display |
| `_form-box.scss`                 | `FormGroup` + `FormGroup.Item` | layout  |
| `_form-table.scss`               | `FormTable`                    | layout  |
| `_table.scss`                    | `Table`                        | layout  |

### 제외 항목

- `_flex.scss`, `_grid.scss` → Tailwind 기본 유틸리티로 대체
- `SdProgressControl` → 별도 마이그레이션 예정

## 파일 구조

```
packages/solid/src/components/
├── display/
│   ├── Card.tsx
│   ├── Label.tsx
│   └── Note.tsx
├── layout/
│   ├── FormGroup.tsx      (FormGroup + FormGroup.Item)
│   ├── FormTable.tsx
│   └── Table.tsx
```

## 공통 패턴

기존 `Button` 컴포넌트와 동일한 패턴 적용:

```tsx
import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  // 컴포넌트별 고유 prop
}

const baseClass = clsx();
// Tailwind 클래스들

export const Card: ParentComponent<CardProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);

  return (
    <div class={twMerge(baseClass, local.class)} {...rest}>
      {local.children}
    </div>
  );
};
```

### 핵심 원칙

- `splitProps`로 local/rest 분리
- `twMerge`로 기본 클래스와 사용자 클래스 병합
- `...rest`로 나머지 HTML 속성 전달
- 클래스 조합 가능: `<Card class="form-group">` → `<div class="card form-group">`

## 컴포넌트별 상세 설계

### Card

```tsx
interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {}

const baseClass = clsx(
  "block",
  "bg-white dark:bg-gray-900",
  "rounded-lg",
  "shadow-md hover:shadow-lg focus-within:shadow-lg",
  "transition-shadow duration-300",
  "animate-card-in", // 등장 애니메이션 (tailwind.config.ts에 keyframes 정의 필요)
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

### Label

```tsx
type LabelTheme = "primary" | "info" | "success" | "warning" | "danger" | "gray";

interface LabelProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  theme?: LabelTheme; // 기본값: "gray"
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

### Note

```tsx
type NoteTheme = "primary" | "info" | "success" | "warning" | "danger" | "gray";

interface NoteProps extends JSX.HTMLAttributes<HTMLDivElement> {
  theme?: NoteTheme; // 기본값: "gray"
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

### FormGroup (Compound Component)

```tsx
interface FormGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  inline?: boolean; // true면 가로 배치
}

interface FormGroupItemProps extends JSX.HTMLAttributes<HTMLDivElement> {
  label?: JSX.Element; // string, 컴포넌트 모두 가능
}

const baseClass = clsx("flex", "flex-col", "gap-4");
const inlineClass = clsx("inline-flex", "flex-row", "flex-wrap", "gap-2", "items-center");

const FormGroupItem: ParentComponent<FormGroupItemProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "label"]);

  return (
    <div class={twMerge("...", local.class)} {...rest}>
      <Show when={local.label}>
        <label class="font-bold mb-1 block">{local.label}</label>
      </Show>
      {local.children}
    </div>
  );
};

interface FormGroupComponent extends ParentComponent<FormGroupProps> {
  Item: typeof FormGroupItem;
}

export const FormGroup: FormGroupComponent = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "inline"]);

  const getClassName = () => twMerge(local.inline ? inlineClass : baseClass, local.class);

  return (
    <div class={getClassName()} {...rest}>
      {local.children}
    </div>
  );
};

FormGroup.Item = FormGroupItem;
```

사용 예:

```tsx
<FormGroup>
  <FormGroup.Item label="이름">
    <TextField />
  </FormGroup.Item>
  <FormGroup.Item label={<><Icon icon={IconUser} /> 이메일</>}>
    <TextField />
  </FormGroup.Item>
</FormGroup>

<FormGroup inline>
  <FormGroup.Item label="시작일"><DatePicker /></FormGroup.Item>
  <FormGroup.Item label="종료일"><DatePicker /></FormGroup.Item>
</FormGroup>
```

### FormTable

```tsx
interface FormTableProps extends JSX.HTMLAttributes<HTMLTableElement> {}

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

th/td 스타일은 Tailwind로 사용처에서 직접 적용하거나, 별도 CSS로 정의.

### Table

```tsx
interface TableProps extends JSX.HTMLAttributes<HTMLTableElement> {
  inset?: boolean; // 외곽 테두리 제거
  inline?: boolean; // width: auto
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

## Tailwind 설정 추가 사항

`tailwind.config.ts`에 Card 등장 애니메이션 keyframes 추가 필요:

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
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
};
```

## index.ts 업데이트

```ts
// packages/solid/src/index.ts
export * from "./components/display/Card";
export * from "./components/display/Label";
export * from "./components/display/Note";
export * from "./components/layout/FormGroup";
export * from "./components/layout/FormTable";
export * from "./components/layout/Table";
```

## 구현 순서

1. Tailwind 설정 업데이트 (animation keyframes)
2. display 컴포넌트: Card → Label → Note
3. layout 컴포넌트: FormGroup → FormTable → Table
4. index.ts export 추가
5. solid-demo에서 테스트
