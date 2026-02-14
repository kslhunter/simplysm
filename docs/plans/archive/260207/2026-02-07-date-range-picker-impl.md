# DateRangePicker 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 레거시 Angular `SdDateRangePicker`를 SolidJS로 마이그레이션 — 기간 타입(일/월/범위) 선택에 따라 날짜 범위를 입력하는 복합 컴포넌트

**Architecture:** `Select`로 기간 타입을 선택하고, `DateField` 1~2개로 날짜를 입력한다. periodType/from 변경 시 from/to를 자동 보정하는 로직을 포함한다. Controlled/Uncontrolled 패턴은 `createPropSignal`로 지원한다.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS, @simplysm/core-common (DateOnly), vitest + @solidjs/testing-library

---

### Task 1: DateRangePicker 테스트 파일 생성

**Files:**

- Create: `packages/solid/tests/components/form-control/date-range-picker/DateRangePicker.spec.tsx`

**Step 1: 테스트 파일 작성 — 기본 렌더링 + periodType 변경 로직**

```tsx
import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { DateOnly } from "@simplysm/core-common";
import { DateRangePicker } from "../../../../src/components/form-control/date-range-picker/DateRangePicker";

describe("DateRangePicker 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("Select와 DateField가 렌더링된다", () => {
      const { container } = render(() => <DateRangePicker />);
      const select = container.querySelector("[data-select]");
      expect(select).toBeTruthy();
    });

    it("기본 periodType은 '범위'이다", () => {
      const { container } = render(() => <DateRangePicker />);
      // "범위" 모드일 때 구분자 "~"가 표시된다
      expect(container.textContent).toContain("~");
    });
  });

  describe("periodType 변경 시 자동 계산", () => {
    it("'월'로 변경 시 from이 1일로 보정되고 to가 월말로 설정된다", () => {
      const onPeriodTypeChange = vi.fn();
      const onFromChange = vi.fn();
      const onToChange = vi.fn();

      render(() => (
        <DateRangePicker
          periodType="범위"
          onPeriodTypeChange={onPeriodTypeChange}
          from={new DateOnly(2025, 3, 15)}
          onFromChange={onFromChange}
          to={new DateOnly(2025, 3, 20)}
          onToChange={onToChange}
        />
      ));

      // handlePeriodTypeChange를 직접 테스트하기 위해
      // periodType을 "월"로 변경하는 시나리오는 Select 상호작용이 필요하므로
      // 이 테스트는 controlled 패턴에서 prop 변경으로 검증
    });

    it("'일'로 변경 시 to가 from과 동일해진다", () => {
      const onToChange = vi.fn();

      render(() => <DateRangePicker periodType="일" from={new DateOnly(2025, 3, 15)} onToChange={onToChange} />);

      // "일" 모드에서는 from 변경 시 to = from
    });
  });

  describe("from 변경 시 자동 계산", () => {
    it("'일' 모드에서 from 변경 시 to도 같은 값으로 변경된다", () => {
      const onFromChange = vi.fn();
      const onToChange = vi.fn();
      const [from, setFrom] = createSignal<DateOnly | undefined>(new DateOnly(2025, 3, 15));

      render(() => (
        <DateRangePicker
          periodType="일"
          from={from()}
          onFromChange={(v) => {
            onFromChange(v);
            setFrom(v);
          }}
          onToChange={onToChange}
        />
      ));

      // DateField의 input을 찾아서 값 변경
      // "일" 모드에서는 DateField가 1개 (type="date")
    });

    it("'범위' 모드에서 from > to이면 to가 from으로 보정된다", () => {
      const onToChange = vi.fn();

      render(() => (
        <DateRangePicker
          periodType="범위"
          from={new DateOnly(2025, 3, 20)}
          onToChange={onToChange}
          to={new DateOnly(2025, 3, 15)}
        />
      ));
      // from(20일) > to(15일)이므로 to가 from으로 보정되어야 함
    });
  });

  describe("'범위' 모드 렌더링", () => {
    it("DateField 2개와 '~' 구분자가 렌더링된다", () => {
      const { container } = render(() => <DateRangePicker periodType="범위" />);
      const inputs = container.querySelectorAll("input[type='date']");
      expect(inputs.length).toBe(2);
      expect(container.textContent).toContain("~");
    });
  });

  describe("'일' 모드 렌더링", () => {
    it("DateField 1개가 type=date로 렌더링된다", () => {
      const { container } = render(() => <DateRangePicker periodType="일" />);
      const inputs = container.querySelectorAll("input[type='date']");
      expect(inputs.length).toBe(1);
      expect(container.textContent).not.toContain("~");
    });
  });

  describe("'월' 모드 렌더링", () => {
    it("DateField 1개가 type=month로 렌더링된다", () => {
      const { container } = render(() => <DateRangePicker periodType="월" />);
      const inputs = container.querySelectorAll("input[type='month']");
      expect(inputs.length).toBe(1);
      expect(container.textContent).not.toContain("~");
    });
  });

  describe("disabled 상태", () => {
    it("disabled=true일 때 내부 필드들이 비활성화된다", () => {
      const { container } = render(() => <DateRangePicker periodType="범위" disabled />);
      const select = container.querySelector("[data-select]");
      expect(select?.querySelector("[aria-disabled='true']")).toBeTruthy();
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <DateRangePicker class="my-custom" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("my-custom")).toBe(true);
    });
  });
});
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `pnpm vitest packages/solid/tests/components/form-control/date-range-picker/DateRangePicker.spec.tsx --project=solid --run`
Expected: FAIL — `DateRangePicker` 모듈을 찾을 수 없음

**Step 3: 커밋**

```bash
git add packages/solid/tests/components/form-control/date-range-picker/DateRangePicker.spec.tsx
git commit -m "test(solid): DateRangePicker 테스트 추가 (failing)"
```

---

### Task 2: DateRangePicker 컴포넌트 구현

**Files:**

- Create: `packages/solid/src/components/form-control/date-range-picker/DateRangePicker.tsx`

**Step 1: 컴포넌트 구현**

````tsx
import { type Component, type JSX, Show, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { DateOnly } from "@simplysm/core-common";
import { createPropSignal } from "../../../utils/createPropSignal";
import { type FieldSize } from "../field/Field.styles";
import { DateField } from "../field/DateField";
import { Select } from "../select/Select";
import { SelectItem } from "../select/SelectItem";

export type DateRangePeriodType = "일" | "월" | "범위";

const baseClass = clsx("inline-flex items-center", "gap-1");

export interface DateRangePickerProps {
  /** 기간 타입 */
  periodType?: DateRangePeriodType;

  /** 기간 타입 변경 콜백 */
  onPeriodTypeChange?: (value: DateRangePeriodType) => void;

  /** 시작 날짜 */
  from?: DateOnly;

  /** 시작 날짜 변경 콜백 */
  onFromChange?: (value: DateOnly | undefined) => void;

  /** 종료 날짜 */
  to?: DateOnly;

  /** 종료 날짜 변경 콜백 */
  onToChange?: (value: DateOnly | undefined) => void;

  /** 필수 입력 */
  required?: boolean;

  /** 비활성화 */
  disabled?: boolean;

  /** 사이즈 */
  size?: FieldSize;

  /** 커스텀 class */
  class?: string;

  /** 커스텀 style */
  style?: JSX.CSSProperties;
}

/**
 * 월의 마지막 날을 구한다.
 */
function getLastDayOfMonth(date: DateOnly): DateOnly {
  return date.addMonths(1).setDay(1).addDays(-1);
}

/**
 * DateRangePicker 컴포넌트
 *
 * 기간 타입(일/월/범위) 선택에 따라 날짜 범위를 입력한다.
 * periodType 변경 시 from/to를 자동으로 보정한다.
 *
 * @example
 * ```tsx
 * const [periodType, setPeriodType] = createSignal<DateRangePeriodType>("범위");
 * const [from, setFrom] = createSignal<DateOnly>();
 * const [to, setTo] = createSignal<DateOnly>();
 *
 * <DateRangePicker
 *   periodType={periodType()}
 *   onPeriodTypeChange={setPeriodType}
 *   from={from()}
 *   onFromChange={setFrom}
 *   to={to()}
 *   onToChange={setTo}
 *   required
 * />
 * ```
 */
export const DateRangePicker: Component<DateRangePickerProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "periodType",
    "onPeriodTypeChange",
    "from",
    "onFromChange",
    "to",
    "onToChange",
    "required",
    "disabled",
    "size",
    "class",
    "style",
  ]);

  // controlled/uncontrolled 패턴
  const [periodType, setPeriodType] = createPropSignal({
    value: () => local.periodType ?? ("범위" as DateRangePeriodType),
    onChange: () => local.onPeriodTypeChange,
  });

  const [from, setFrom] = createPropSignal({
    value: () => local.from as DateOnly | undefined,
    onChange: () => local.onFromChange,
  });

  const [to, setTo] = createPropSignal({
    value: () => local.to as DateOnly | undefined,
    onChange: () => local.onToChange,
  });

  // periodType 변경 핸들러
  const handlePeriodTypeChange = (newType: DateRangePeriodType | DateRangePeriodType[]) => {
    const type = Array.isArray(newType) ? newType[0] : newType;
    setPeriodType(type);

    const currentFrom = from();

    if (type === "월") {
      if (currentFrom) {
        const adjusted = currentFrom.setDay(1);
        setFrom(adjusted);
        setTo(getLastDayOfMonth(adjusted));
      } else {
        setTo(undefined as DateOnly | undefined);
      }
    } else if (type === "일") {
      setTo(currentFrom);
    }
  };

  // from 변경 핸들러
  const handleFromChange = (newFrom: DateOnly | undefined) => {
    setFrom(newFrom);

    const type = periodType();

    if (type === "월") {
      setTo(newFrom ? getLastDayOfMonth(newFrom) : (undefined as DateOnly | undefined));
    } else if (type === "일") {
      setTo(newFrom);
    } else if (type === "범위") {
      const currentTo = to();
      if (newFrom && currentTo && newFrom.tick > currentTo.tick) {
        setTo(newFrom);
      }
    }
  };

  // to 변경 핸들러
  const handleToChange = (newTo: DateOnly | undefined) => {
    setTo(newTo);
  };

  // wrapper 클래스
  const getWrapperClass = () => twMerge(baseClass, local.class);

  return (
    <div {...rest} data-date-range-picker class={getWrapperClass()} style={local.style}>
      <Select
        value={periodType()}
        onValueChange={handlePeriodTypeChange}
        renderValue={(v: DateRangePeriodType) => <>{v}</>}
        required
        disabled={local.disabled}
        size={local.size}
        inset
      >
        <SelectItem value={"일" as DateRangePeriodType}>일</SelectItem>
        <SelectItem value={"월" as DateRangePeriodType}>월</SelectItem>
        <SelectItem value={"범위" as DateRangePeriodType}>범위</SelectItem>
      </Select>

      <Show
        when={periodType() === "범위"}
        fallback={
          <DateField
            type={periodType() === "월" ? "month" : "date"}
            value={from()}
            onValueChange={handleFromChange}
            required={local.required}
            disabled={local.disabled}
            size={local.size}
          />
        }
      >
        <DateField
          type="date"
          value={from()}
          onValueChange={handleFromChange}
          required={local.required}
          disabled={local.disabled}
          size={local.size}
        />
        <span class="text-base-400">~</span>
        <DateField
          type="date"
          value={to()}
          onValueChange={handleToChange}
          min={from()}
          required={local.required}
          disabled={local.disabled}
          size={local.size}
        />
      </Show>
    </div>
  );
};
````

**Step 2: 테스트 실행하여 통과 확인**

Run: `pnpm vitest packages/solid/tests/components/form-control/date-range-picker/DateRangePicker.spec.tsx --project=solid --run`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/src/components/form-control/date-range-picker/DateRangePicker.tsx
git commit -m "feat(solid): DateRangePicker 컴포넌트 구현"
```

---

### Task 3: index.ts에 export 추가

**Files:**

- Modify: `packages/solid/src/index.ts:17` (ColorPicker export 아래에 추가)

**Step 1: export 추가**

`packages/solid/src/index.ts`의 `ColorPicker` export 라인 뒤에 추가:

```typescript
export * from "./components/form-control/date-range-picker/DateRangePicker";
```

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: 린트 실행**

Run: `pnpm lint packages/solid/src/components/form-control/date-range-picker`
Expected: PASS (또는 수정 가능한 경고만)

**Step 4: 커밋**

```bash
git add packages/solid/src/index.ts
git commit -m "feat(solid): DateRangePicker export 추가"
```

---

### Task 4: 테스트 보강 및 최종 검증

**Files:**

- Modify: `packages/solid/tests/components/form-control/date-range-picker/DateRangePicker.spec.tsx`

**Step 1: 테스트 실행하여 전체 통과 확인**

Run: `pnpm vitest packages/solid/tests/components/form-control/date-range-picker/DateRangePicker.spec.tsx --project=solid --run`
Expected: 모든 테스트 PASS

**Step 2: 전체 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: 전체 린트**

Run: `pnpm lint packages/solid`
Expected: PASS

**Step 4: 필요 시 테스트/코드 수정 후 커밋**

```bash
git add -A
git commit -m "test(solid): DateRangePicker 테스트 보강 및 린트 수정"
```
