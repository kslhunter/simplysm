# Field 컴포넌트 설계

Angular의 `sd-textfield` 컴포넌트를 SolidJS로 이전하기 위한 설계 문서.

## 개요

value 타입별로 컴포넌트를 분리하여 TypeScript 타입 안전성을 확보하고, 각 타입에 맞는 props를 제공한다.

## 컴포넌트 목록

| 컴포넌트      | value 타입 | type prop              | 주요 props                          |
| ------------- | ---------- | ---------------------- | ----------------------------------- |
| TextField     | `string`   | text, password, email  | format, autocomplete                |
| NumberField   | `number`   | -                      | min, max, step, useComma, minDigits |
| DateField     | `DateOnly` | year, month, date      | min, max                            |
| DateTimeField | `DateTime` | datetime, datetime-sec | min, max                            |
| TimeField     | `Time`     | time, time-sec         | min, max                            |
| ColorField    | `string`   | -                      | -                                   |

## 파일 구조

```
packages/solid/src/components/form-control/
├── text-field/
│   └── TextField.tsx
├── number-field/
│   └── NumberField.tsx
├── date-field/
│   └── DateField.tsx
├── datetime-field/
│   └── DateTimeField.tsx
├── time-field/
│   └── TimeField.tsx
└── color-field/
    └── ColorField.tsx
```

## 공통 Props

```typescript
interface FieldBaseProps<T> {
  // 상태
  value?: T;
  onChange?: (value: T | undefined) => void;
  disabled?: boolean;
  readonly?: boolean;

  // 유효성 (외부에서 주입)
  error?: string;

  // 스타일
  size?: "sm" | "lg";
  inset?: boolean;

  // HTML 속성
  placeholder?: string;
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
}
```

## 컴포넌트별 Props

### TextField

```typescript
interface TextFieldProps extends FieldBaseProps<string> {
  type?: "text" | "password" | "email"; // 기본값: "text"
  format?: string; // text 타입 전용, 예: "XXX-XXXX-XXXX"
  autocomplete?: string;
}
```

### NumberField

```typescript
interface NumberFieldProps extends FieldBaseProps<number> {
  min?: number;
  max?: number;
  step?: number;
  useComma?: boolean; // 기본값: true
  minDigits?: number;
}
```

### DateField

```typescript
interface DateFieldProps extends FieldBaseProps<DateOnly> {
  type?: "year" | "month" | "date"; // 기본값: "date"
  min?: DateOnly;
  max?: DateOnly;
}
```

### DateTimeField

```typescript
interface DateTimeFieldProps extends FieldBaseProps<DateTime> {
  type?: "datetime" | "datetime-sec"; // 기본값: "datetime"
  min?: DateTime;
  max?: DateTime;
}
```

### TimeField

```typescript
interface TimeFieldProps extends FieldBaseProps<Time> {
  type?: "time" | "time-sec"; // 기본값: "time"
  min?: Time;
  max?: Time;
}
```

### ColorField

```typescript
interface ColorFieldProps extends FieldBaseProps<string> {
  // 특별한 추가 props 없음
}
```

## 렌더링 구조

성능 최적화를 위해 항상 div를 렌더링하고, 편집 가능할 때만 input을 표시.

```tsx
<div class={containerClass}>
  <div
    class={contentClass}
    style={{
      visibility: !props.readonly && !props.disabled && props.inset ? "hidden" : undefined,
      display: !props.inset && !props.readonly && !props.disabled ? "none" : undefined,
    }}
  >
    {displayValue()}
  </div>

  <Show when={!props.readonly && !props.disabled}>
    <input ... />
  </Show>
</div>
```

### 레이아웃

**기본 (inset이 아닐 때):**

- 편집 가능: input만 표시, div는 hidden
- readonly/disabled: div만 표시, input 없음

**inset일 때 (테이블 내 사용):**

- div와 input이 겹쳐서 표시 (input은 absolute)
- 편집 가능: div는 visibility hidden (크기 유지), input 표시
- readonly/disabled: div만 표시, input 없음

## 값 변환 로직

### NumberField

```typescript
// string → number (입력 시)
"1,234.56" → 1234.56
"123." → 변환 안 함 (입력 중)
"abc" → 변환 안 함 (무효)

// number → string (표시 시)
1234.56 → "1,234.56" (useComma=true)
1234.56 → "1234.56" (useComma=false)
```

### DateField

```typescript
// string → DateOnly
"2024-01-15" → DateOnly.parse("2024-01-15")

// DateOnly → string (HTML input용)
type="year"  → "2024"
type="month" → "2024-01"
type="date"  → "2024-01-15"
```

### DateTimeField

```typescript
// string → DateTime
"2024-01-15T14:30" → DateTime.parse(...)

// DateTime → string
type="datetime"     → "2024-01-15T14:30"
type="datetime-sec" → "2024-01-15T14:30:45"
```

### TimeField

```typescript
// string → Time
"14:30" → Time.parse("14:30")

// Time → string
type="time"     → "14:30"
type="time-sec" → "14:30:45"
```

### TextField (format)

```typescript
// format="XXX-XXXX-XXXX" 일 때
// 내부 value: "01012345678"
// 표시: "010-1234-5678"
```

## 스타일 (Tailwind)

```typescript
// 기본 스타일
const baseClass = clsx(
  "relative",
  "border border-neutral-300 dark:border-neutral-600",
  "rounded",
  "bg-white dark:bg-neutral-950",
);

// 크기
const sizeClasses = {
  sm: "px-1.5 py-0.5",
  default: "px-2 py-1",
  lg: "px-3 py-2",
};

// 상태
const disabledClass = "bg-neutral-200 dark:bg-neutral-800 text-neutral-400";
const errorClass = "border-danger-500";
const insetClass = "border-none rounded-none bg-transparent";
```

## 사용 예시

### 기본 사용

```tsx
// TextField
const [name, setName] = createSignal<string>();
<TextField value={name()} onChange={setName} placeholder="이름" />;

// NumberField
const [price, setPrice] = createSignal<number>();
<NumberField value={price()} onChange={setPrice} step={100} useComma />;

// DateField
const [birthDate, setBirthDate] = createSignal<DateOnly>();
<DateField type="date" value={birthDate()} onChange={setBirthDate} />;

// TimeField
const [startTime, setStartTime] = createSignal<Time>();
<TimeField type="time-sec" value={startTime()} onChange={setStartTime} />;
```

### 외부 Validation

```tsx
const [email, setEmail] = createSignal<string>();
const emailError = () => {
  const v = email();
  if (!v) return "필수 입력입니다";
  if (!v.includes("@")) return "이메일 형식이 아닙니다";
  return undefined;
};

<TextField type="email" value={email()} onChange={setEmail} error={emailError()} />;
```

### 테이블 내 사용 (inset)

```tsx
<Table>
  <tbody>
    <tr>
      <td>
        <NumberField inset value={qty()} onChange={setQty} />
      </td>
      <td>
        <DateField inset type="date" value={date()} onChange={setDate} />
      </td>
    </tr>
  </tbody>
</Table>
```

## 핵심 설계 결정

1. **value 타입별 분리** - TypeScript 타입 안전성
2. **Validation은 외부** - `error?: string` prop만 제공
3. **div + input 패턴** - 테이블 셀 크기 조절, 성능 최적화
4. **스타일링** - Button과 동일 패턴 (size, inset)
5. **onChange** - `(value: T | undefined) => void`
