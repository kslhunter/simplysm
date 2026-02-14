# Solid 패키지 코드 리뷰 개선사항 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 코드 리뷰에서 도출된 6건의 개선사항을 구현하여 타입 안전성, 접근성, API 일관성을 향상시킨다.

**Architecture:** Select의 discriminated union 분리, NumberField 불필요한 props 제거, Modal 접근성/UX 개선, DateRangePicker 국제화 지원, clsx 사용 통일. 각 변경은 독립적이며 순서 무관하게 적용 가능.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS, clsx, Vitest

---

## Task 1: NumberField에서 min/max/step props 제거

**Files:**

- Modify: `packages/solid/src/components/form-control/field/NumberField.tsx`
- Modify: `packages/solid/tests/components/form-control/field/NumberField.spec.tsx`

**Step 1: Props 인터페이스에서 min/max/step 제거**

`NumberField.tsx`에서 `NumberFieldProps` 인터페이스의 다음 3개 prop 정의를 삭제:

```typescript
// 삭제 대상 (38-45줄)
  /** 최소값 */
  min?: number;

  /** 최대값 */
  max?: number;

  /** 증감 단위 */
  step?: number;
```

**Step 2: splitProps에서 min/max/step 제거**

`NumberField.tsx:172`의 `splitProps` 호출에서 `"min"`, `"max"`, `"step"` 제거:

```typescript
// 변경 전
const [local, rest] = splitProps(mergedProps, [
  "value",
  "onValueChange",
  "comma",
  "minDigits",
  "min",
  "max",
  "step",
  "placeholder",
  "title",
  "disabled",
  "readonly",
  "error",
  "size",
  "inset",
  "class",
  "style",
]);

// 변경 후
const [local, rest] = splitProps(mergedProps, [
  "value",
  "onValueChange",
  "comma",
  "minDigits",
  "placeholder",
  "title",
  "disabled",
  "readonly",
  "error",
  "size",
  "inset",
  "class",
  "style",
]);
```

**Step 3: input 요소에서 min/max/step 속성 제거**

standalone input (약 294-296줄)과 inset input (약 327-329줄) 양쪽에서 제거:

```typescript
// 삭제 대상 (두 곳 모두)
              min={local.min}
              max={local.max}
              step={local.step}
```

**Step 4: 테스트에서 min/max/step 관련 케이스 삭제**

`NumberField.spec.tsx`에서 `describe("step, min, max 속성", ...)` 블록 전체 삭제 (약 139-160줄):

```typescript
// 삭제 대상
  describe("step, min, max 속성", () => {
    it("step 속성을 지원한다", async () => { ... });
    it("min 속성을 지원한다", async () => { ... });
    it("max 속성을 지원한다", async () => { ... });
  });
```

**Step 5: 테스트 실행**

```bash
pnpm vitest packages/solid/tests/components/form-control/field/NumberField.spec.tsx --project=solid --run
```

Expected: 모든 테스트 PASS (삭제한 3개 제외)

**Step 6: 타입체크**

```bash
pnpm typecheck packages/solid
```

Expected: 에러 없음

**Step 7: 커밋**

```bash
git add packages/solid/src/components/form-control/field/NumberField.tsx packages/solid/tests/components/form-control/field/NumberField.spec.tsx
git commit -m "refactor(solid): NumberField에서 동작하지 않는 min/max/step props 제거

type=\"text\" input에서 min/max/step HTML 속성은 효과 없음.
validation은 외부에서 error prop으로 처리하는 설계에 맞춤.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Modal에 ARIA 속성 추가

**Files:**

- Modify: `packages/solid/src/components/disclosure/Modal.tsx`
- Modify: `packages/solid/tests/components/disclosure/Modal.spec.tsx`

**Step 1: dialog div에 ARIA 속성 추가**

`Modal.tsx`의 dialog div (약 505-515줄)에 3개 속성 추가:

```tsx
// 변경 전
<div
  ref={(el) => { dialogRef = el; }}
  data-modal-dialog
  tabIndex={0}
  class={twMerge(dialogBaseClass(), local.class)}
  style={dialogStyle()}
  onFocus={handleDialogFocus}
  onTransitionEnd={handleTransitionEnd}
>

// 변경 후
<div
  ref={(el) => { dialogRef = el; }}
  role="dialog"
  aria-modal={local.float ? undefined : true}
  aria-label={local.title}
  data-modal-dialog
  tabIndex={0}
  class={twMerge(dialogBaseClass(), local.class)}
  style={dialogStyle()}
  onFocus={handleDialogFocus}
  onTransitionEnd={handleTransitionEnd}
>
```

**Step 2: splitProps에 float, title가 이미 포함되어 있는지 확인**

`local.float`와 `local.title`이 splitProps에서 추출되고 있는지 확인. 이미 추출되어 있으면 추가 변경 불필요.

**Step 3: ARIA 속성 테스트 추가**

`Modal.spec.tsx`에 테스트 추가:

```typescript
describe("접근성", () => {
  it("role=dialog와 aria-modal 속성이 설정된다", async () => {
    const { getByRole } = render(() => (
      <Modal open={true} title="테스트 모달">
        <p>내용</p>
      </Modal>
    ));

    const dialog = getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "테스트 모달");
  });

  it("float 모드에서는 aria-modal이 설정되지 않는다", async () => {
    const { getByRole } = render(() => (
      <Modal open={true} title="플로팅" float>
        <p>내용</p>
      </Modal>
    ));

    const dialog = getByRole("dialog");
    expect(dialog).not.toHaveAttribute("aria-modal");
  });
});
```

**Step 4: 테스트 실행**

```bash
pnpm vitest packages/solid/tests/components/disclosure/Modal.spec.tsx --project=solid --run
```

Expected: 모든 테스트 PASS

**Step 5: 커밋**

```bash
git add packages/solid/src/components/disclosure/Modal.tsx packages/solid/tests/components/disclosure/Modal.spec.tsx
git commit -m "feat(solid): Modal에 role=dialog, aria-modal, aria-label 추가

스크린 리더가 모달을 대화상자로 인식할 수 있도록 ARIA 속성 추가.
float 모드는 non-modal이므로 aria-modal 생략.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Modal closeOnEscape 기본값을 true로 변경

**Files:**

- Modify: `packages/solid/src/components/disclosure/Modal.tsx`
- Modify: `packages/solid/tests/components/disclosure/Modal.spec.tsx`

**Step 1: closeOnEscape 기본값 변경**

`Modal.tsx`에서 closeOnEscape 체크 로직 변경 (약 214줄):

```typescript
// 변경 전
if (!local.closeOnEscape) return;

// 변경 후
if (local.closeOnEscape === false) return;
```

이렇게 하면 `closeOnEscape`가 `undefined`(미지정)일 때 기본 동작이 "닫힘"으로 변경됩니다.

**Step 2: JSDoc 기본값 설명 업데이트**

Props 인터페이스의 `closeOnEscape` JSDoc 수정:

```typescript
// 변경 전
  /** Escape 키로 닫기 */
  closeOnEscape?: boolean;

// 변경 후
  /** Escape 키로 닫기 (기본값: true) */
  closeOnEscape?: boolean;
```

**Step 3: 기존 테스트 수정**

`Modal.spec.tsx`에서 기본값 관련 테스트가 있다면 수정. 기존 "closeOnEscape=true일 때 Escape로 닫힌다" 테스트는 유지하되, 기본값(미지정) 시에도 닫히는 테스트 추가:

```typescript
it("기본적으로 Escape 키로 닫힌다", async () => {
  const onOpenChange = vi.fn();
  render(() => (
    <Modal open={true} title="테스트" onOpenChange={onOpenChange}>
      <p>내용</p>
    </Modal>
  ));

  await userEvent.keyboard("{Escape}");
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

it("closeOnEscape=false일 때 Escape로 닫히지 않는다", async () => {
  const onOpenChange = vi.fn();
  render(() => (
    <Modal open={true} title="테스트" closeOnEscape={false} onOpenChange={onOpenChange}>
      <p>내용</p>
    </Modal>
  ));

  await userEvent.keyboard("{Escape}");
  expect(onOpenChange).not.toHaveBeenCalled();
});
```

**Step 4: 테스트 실행**

```bash
pnpm vitest packages/solid/tests/components/disclosure/Modal.spec.tsx --project=solid --run
```

Expected: 모든 테스트 PASS

**Step 5: 커밋**

```bash
git add packages/solid/src/components/disclosure/Modal.tsx packages/solid/tests/components/disclosure/Modal.spec.tsx
git commit -m "feat(solid): Modal closeOnEscape 기본값을 true로 변경

업계 표준(Material UI, Radix, Headless UI)에 맞춰 Escape 키로 닫기를
기본 활성화. closeOnEscape={false}로 명시적 비활성화 가능.

BREAKING CHANGE: closeOnEscape 미지정 시 기본 동작이 닫힘으로 변경

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: DateRangePicker periodLabels prop 추가

**Files:**

- Modify: `packages/solid/src/components/form-control/date-range-picker/DateRangePicker.tsx`
- Modify: `packages/solid/tests/components/form-control/date-range-picker/DateRangePicker.spec.tsx`

**Step 1: Props 인터페이스에 periodLabels 추가**

`DateRangePicker.tsx`의 `DateRangePickerProps`에 추가:

```typescript
/** 기간 타입 라벨 (기본값: { day: "일", month: "월", range: "범위" }) */
periodLabels?: Partial<Record<DateRangePeriodType, string>>;
```

**Step 2: splitProps에 periodLabels 추가**

splitProps 호출에 `"periodLabels"` 추가.

**Step 3: 기본값 정의 및 하드코딩 교체**

컴포넌트 함수 내에서 기본값과 병합:

```typescript
const labels = (): Record<DateRangePeriodType, string> => ({
  day: "일",
  month: "월",
  range: "범위",
  ...local.periodLabels,
});
```

하드코딩된 라벨 교체:

```typescript
// 변경 전 (renderValue, 약 167줄)
renderValue={(v: DateRangePeriodType) => <>{({ day: "일", month: "월", range: "범위" })[v]}</>}

// 변경 후
renderValue={(v: DateRangePeriodType) => <>{labels()[v]}</>}
```

```typescript
// 변경 전 (SelectItem, 약 173-175줄)
<SelectItem value={"day" as DateRangePeriodType}>일</SelectItem>
<SelectItem value={"month" as DateRangePeriodType}>월</SelectItem>
<SelectItem value={"range" as DateRangePeriodType}>범위</SelectItem>

// 변경 후
<SelectItem value={"day" as DateRangePeriodType}>{labels().day}</SelectItem>
<SelectItem value={"month" as DateRangePeriodType}>{labels().month}</SelectItem>
<SelectItem value={"range" as DateRangePeriodType}>{labels().range}</SelectItem>
```

**Step 4: 테스트 추가**

`DateRangePicker.spec.tsx`에 추가:

```typescript
it("periodLabels로 라벨을 커스터마이즈할 수 있다", async () => {
  const { getByText } = render(() => (
    <DateRangePicker
      periodLabels={{ day: "Day", month: "Month", range: "Range" }}
    />
  ));

  // Select를 열어 라벨 확인
  expect(getByText("Day")).toBeInTheDocument();
});
```

**Step 5: 테스트 실행**

```bash
pnpm vitest packages/solid/tests/components/form-control/date-range-picker/DateRangePicker.spec.tsx --project=solid --run
```

Expected: 모든 테스트 PASS

**Step 6: 타입체크**

```bash
pnpm typecheck packages/solid
```

Expected: 에러 없음

**Step 7: 커밋**

```bash
git add packages/solid/src/components/form-control/date-range-picker/DateRangePicker.tsx packages/solid/tests/components/form-control/date-range-picker/DateRangePicker.spec.tsx
git commit -m "feat(solid): DateRangePicker에 periodLabels prop 추가

기간 타입 라벨을 커스터마이즈 가능하게 변경.
기본값은 기존 한국어 라벨(일/월/범위) 유지.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Select discriminated union 타입 분리

**Files:**

- Modify: `packages/solid/src/components/form-control/select/Select.tsx`
- Modify: `packages/solid/tests/components/form/select/Select.spec.tsx`

**Step 1: SelectBaseProps에서 value/onValueChange/multiple을 분리**

`Select.tsx`에서 현재 `SelectBaseProps`의 `value`, `onValueChange`, `multiple`을 별도 인터페이스로 분리:

```typescript
// 변경 전
interface SelectBaseProps<T> {
  value?: T | T[];
  onValueChange?: (value: T | T[]) => void;
  multiple?: boolean;
  // ... 나머지 공통 props
}

// 변경 후
interface SelectCommonProps<T> {
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  size?: FieldSize;
  inset?: boolean;
  multiDisplayDirection?: "row" | "column";
  hideSelectAll?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
}

interface SelectSingleBaseProps<T> extends SelectCommonProps<T> {
  multiple?: false;
  value?: T;
  onValueChange?: (value: T) => void;
}

interface SelectMultipleBaseProps<T> extends SelectCommonProps<T> {
  multiple: true;
  value?: T[];
  onValueChange?: (value: T[]) => void;
}
```

**Step 2: SelectProps union 재구성**

기존의 `SelectWithItemsProps` / `SelectWithChildrenProps` 패턴을 유지하면서 single/multiple을 조합:

```typescript
type SelectWithItemsProps<T> = (SelectSingleBaseProps<T> | SelectMultipleBaseProps<T>) & {
  items: T[];
  getChildren?: (item: T) => T[] | undefined;
  renderValue?: (item: T) => JSX.Element;
  children?: never;
};

type SelectWithChildrenProps<T> = (SelectSingleBaseProps<T> | SelectMultipleBaseProps<T>) & {
  items?: never;
  getChildren?: never;
  renderValue: (value: T) => JSX.Element;
  children: JSX.Element;
};

type SelectProps<T> = SelectWithItemsProps<T> | SelectWithChildrenProps<T>;
```

**Step 3: 내부 value 처리 로직 수정**

내부에서 `T | T[]` 캐스팅을 사용하는 부분을 수정. 내부적으로는 여전히 `T | T[]`로 처리하되, 외부 API 타입만 분리. 내부에서는 `local.value`와 `local.onValueChange`에 접근할 때 타입 가드 또는 내부 타입 캐스팅 사용.

> 참고: 내부 구현에서의 캐스팅은 외부 API 타입 안전성과 별개이므로, 내부 구현은 최소한으로 변경합니다.

**Step 4: 테스트 수정**

`Select.spec.tsx`에서 `as string[]` 등의 불필요한 캐스팅 제거:

```typescript
// 변경 전
onValueChange={(v) => setValue(v as string[])}

// 변경 후 (multiple={true}이므로 자동 추론)
onValueChange={(v) => setValue(v)}
```

**Step 5: 테스트 실행**

```bash
pnpm vitest packages/solid/tests/components/form/select/ --project=solid --run
```

Expected: 모든 테스트 PASS

**Step 6: 타입체크**

```bash
pnpm typecheck packages/solid
```

Expected: 에러 없음. DateRangePicker 등 내부 사용처도 확인.

**Step 7: 커밋**

```bash
git add packages/solid/src/components/form-control/select/Select.tsx packages/solid/tests/components/form/select/Select.spec.tsx
git commit -m "refactor(solid): Select의 value 타입을 discriminated union으로 분리

multiple 여부에 따라 value와 onValueChange 타입이 자동 추론되도록 개선.
- multiple?: false → value?: T, onValueChange?: (v: T) => void
- multiple: true → value?: T[], onValueChange?: (v: T[]) => void

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: clsx 태그드 템플릿을 함수 호출로 통일

**Files:** (14개 파일)

- Modify: `packages/solid/src/components/form-control/select/Select.tsx`
- Modify: `packages/solid/src/components/form-control/field/Field.styles.ts`
- Modify: `packages/solid/src/components/form-control/checkbox/CheckBox.styles.ts`
- Modify: `packages/solid/src/components/form-control/Button.tsx`
- Modify: `packages/solid/src/components/form-control/ThemeToggle.tsx`
- Modify: `packages/solid/src/components/data/list/List.tsx`
- Modify: `packages/solid/src/components/data/list/ListItem.styles.ts`
- Modify: `packages/solid/src/components/data/list/ListItem.tsx`
- Modify: `packages/solid/src/components/data/Pagination.tsx`
- Modify: `packages/solid/src/components/layout/sidebar/Sidebar.tsx`
- Modify: `packages/solid/src/components/layout/sidebar/SidebarContainer.tsx`
- Modify: `packages/solid/src/components/layout/sidebar/SidebarUser.tsx`
- Modify: `packages/solid/src/components/layout/topbar/TopbarContainer.tsx`
- Modify: `packages/solid/src/components/layout/FormGroup.tsx`

**변환 규칙:**

```typescript
// 변경 전: 태그드 템플릿
const cls = clsx`inline-flex items-center gap-2`;

// 변경 후: 함수 호출, 의미 단위별 분리
const cls = clsx("inline-flex items-center gap-2");
```

여러 의미 단위가 섞인 긴 문자열은 분리:

```typescript
// 변경 전
const cls = clsx`bg-transparent text-info-600 hover:bg-info-50 dark:text-info-400 dark:hover:bg-info-800/30`;

// 변경 후
const cls = clsx("bg-transparent text-info-600", "hover:bg-info-50", "dark:text-info-400 dark:hover:bg-info-800/30");
```

`clsx()` 안에 중첩된 `clsx\`\``도 함수 호출로 변환:

```typescript
// 변경 전
const cls = clsx(clsx`inline-flex items-center`, "gap-2");

// 변경 후
const cls = clsx("inline-flex items-center", "gap-2");
```

**Step 1: 14개 파일에서 clsx 태그드 템플릿을 함수 호출로 변환**

각 파일을 열어 `clsx\`...\``패턴을`clsx("...")` 패턴으로 변환. 의미 단위별 분리를 적용.

파일별로 순서대로 처리:

1. `Field.styles.ts` (8곳)
2. `CheckBox.styles.ts` (5곳)
3. `Select.tsx` (10곳)
4. `List.tsx` (4곳)
5. `ListItem.styles.ts` (3곳)
6. `ListItem.tsx` (1곳)
7. `Button.tsx` (3곳)
8. `ThemeToggle.tsx` (2곳)
9. `Pagination.tsx` (1곳)
10. `Sidebar.tsx` (1곳)
11. `SidebarContainer.tsx` (1곳)
12. `SidebarUser.tsx` (2곳)
13. `TopbarContainer.tsx` (1곳)
14. `FormGroup.tsx` (3곳)

**Step 2: 린트 확인**

```bash
pnpm lint packages/solid
```

Expected: 새로운 에러 없음

**Step 3: 타입체크**

```bash
pnpm typecheck packages/solid
```

Expected: 에러 없음

**Step 4: 관련 테스트 실행**

```bash
pnpm vitest --project=solid --run
```

Expected: 모든 테스트 PASS (clsx 변환은 기능 변경 없으므로)

**Step 5: 커밋**

```bash
git add packages/solid/src/
git commit -m "style(solid): clsx 태그드 템플릿을 함수 호출로 통일

14개 파일에서 clsx\`...\` 태그드 템플릿을 clsx(\"...\") 함수 호출로 변환.
CLAUDE.md의 '의미 단위별 분리' 규칙에 맞춰 일관된 스타일 적용.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: 최종 검증

**Step 1: 전체 타입체크**

```bash
pnpm typecheck packages/solid
```

Expected: 에러 없음

**Step 2: 전체 린트**

```bash
pnpm lint packages/solid
```

Expected: 에러 없음

**Step 3: 전체 테스트**

```bash
pnpm vitest --project=solid --run
```

Expected: 모든 테스트 PASS

**Step 4: 데모 앱 동작 확인 (수동)**

```bash
pnpm dev
```

브라우저에서 Select, NumberField, Modal, DateRangePicker 컴포넌트가 정상 동작하는지 확인.
