# CheckBox / Radio 컴포넌트 마이그레이션 설계

Angular `sd-checkbox`를 SolidJS `CheckBox` + `Radio` 컴포넌트로 마이그레이션한다.

## 파일 구조

```
packages/solid/src/components/form-control/checkbox/
├── CheckBox.tsx           # 체크박스 컴포넌트
├── Radio.tsx              # 라디오 컴포넌트
└── CheckBox.styles.ts     # 공통 스타일
```

## Props

### 공통 타입 (`CheckBox.styles.ts`)

```typescript
type CheckBoxTheme = "primary" | "info" | "success" | "warning" | "danger";
type CheckBoxSize = "sm" | "lg";
```

### CheckBoxProps

```typescript
interface CheckBoxProps {
  value?: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
  size?: CheckBoxSize;
  theme?: CheckBoxTheme; // 기본 "primary"
  inset?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}
```

### RadioProps

```typescript
interface RadioProps {
  value?: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
  size?: CheckBoxSize;
  theme?: CheckBoxTheme; // 기본 "primary"
  inset?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}
```

## 동작 차이

|            | CheckBox                            | Radio                           |
| ---------- | ----------------------------------- | ------------------------------- |
| 클릭       | `true ↔ false` 토글                 | 항상 `true` (해제 불가)         |
| 인디케이터 | 사각형 (`rounded-sm`) + 체크 아이콘 | 원형 (`rounded-full`) + 내부 원 |
| 키보드     | Space로 토글                        | Space로 선택                    |

## 스타일 (`CheckBox.styles.ts`)

### Wrapper

```typescript
const checkBoxBaseClass = clsx(
  "inline-flex items-center gap-2",
  "cursor-pointer",
  "px-2 py-1",
  "h-field",
  "border border-base-300 dark:border-base-700",
  "rounded",
);
```

### 인디케이터

```typescript
const indicatorBaseClass = clsx(
  "flex items-center justify-center shrink-0",
  "w-4 h-4",
  "border border-base-400 dark:border-base-500",
  "bg-white dark:bg-base-900",
  "transition-colors",
);
```

### 테마별 체크 상태

```typescript
const themeCheckedClasses: Record<CheckBoxTheme, string> = {
  primary: clsx("bg-primary-500 border-primary-500", "text-white"),
  info: clsx("bg-info-500 border-info-500", "text-white"),
  success: clsx("bg-success-500 border-success-500", "text-white"),
  warning: clsx("bg-warning-500 border-warning-500", "text-white"),
  danger: clsx("bg-danger-500 border-danger-500", "text-white"),
};
```

### 사이즈/상태

```typescript
const checkBoxSizeClasses = { sm: "h-field-sm px-1.5 py-0.5", lg: "h-field-lg px-3 py-2" };
const checkBoxInsetClass = "rounded-none border-none bg-transparent";
const checkBoxDisabledClass = "opacity-50 pointer-events-none cursor-default";
```

## 렌더링 구조

```
<label use:ripple tabIndex={0}>   ← wrapper
  <div>                            ← 인디케이터
    <Icon /> 또는 <div />          ← 체크: IconCheck, 라디오: 내부 원
  </div>
  <span>{children}</span>          ← 라벨 (없으면 숨김)
</label>
```

## 공유 패턴

- `createPropSignal`로 controlled/uncontrolled 지원
- `use:ripple` 디렉티브
- `role="checkbox"` / `role="radio"` + `aria-checked` 접근성
- children이 없으면 라벨 `<span>` 숨김

## 제외 항목

- `canChangeFn` — 불필요. `onChange`에서 직접 제어 가능
- `contentStyle` prop — 불필요
- Angular의 `inline` prop — Solid에서는 `inset`만 사용

## index.ts export 추가

```typescript
export * from "./components/form-control/checkbox/CheckBox";
export * from "./components/form-control/checkbox/Radio";
export * from "./components/form-control/checkbox/CheckBox.styles";
```
