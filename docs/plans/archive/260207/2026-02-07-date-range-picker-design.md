# DateRangePicker 마이그레이션 설계

## 개요

레거시 Angular `SdDateRangePicker`를 SolidJS로 마이그레이션한다.
기간 타입(일/월/범위) 선택에 따라 날짜 범위를 입력하는 복합 컴포넌트.

## 원본

- `.legacy-packages/sd-angular/src/ui/form/input/sd-date-range.picker.ts`

## 파일 구조

```
packages/solid/src/
  components/form-control/date-range-picker/
    DateRangePicker.tsx    ← 신규 생성
  index.ts                 ← export 추가
```

## Props

```typescript
interface DateRangePickerProps {
  // 기간 타입
  periodType?: "일" | "월" | "범위";
  onPeriodTypeChange?: (value: "일" | "월" | "범위") => void;

  // 날짜 범위
  from?: DateOnly;
  onFromChange?: (value: DateOnly | undefined) => void;
  to?: DateOnly;
  onToChange?: (value: DateOnly | undefined) => void;

  // 공통 필드 속성
  required?: boolean;
  disabled?: boolean;
  size?: "sm" | "lg";

  // 스타일
  class?: string;
  style?: JSX.CSSProperties;
}
```

## 설계 결정 사항

- **기간 타입**: "일" / "월" / "범위" 3가지 (레거시 동일)
- **별도 RangeField 없음**: "범위" 모드 시 DateField 2개 + `~` 구분자를 내부에 직접 배치
- **파일 위치**: `date-range-picker/` 별도 디렉토리 (Select + DateField 조합이므로 단순 field가 아님)
- **Controlled 패턴**: periodType, from, to 모두 외부 제어 + 콜백
- **자동 계산 유지**: periodType/from 변경 시 from/to 자동 보정

## 렌더링 구조

```tsx
<div class="inline-flex items-center gap-1">
  <Select value={periodType()} onValueChange={handlePeriodTypeChange} required>
    <Select.Item value="일">일</Select.Item>
    <Select.Item value="월">월</Select.Item>
    <Select.Item value="범위">범위</Select.Item>
  </Select>

  <Show when={periodType() === "범위"} fallback={
    <DateField
      type={periodType() === "월" ? "month" : "date"}
      value={from()}
      onValueChange={handleFromChange}
      ...
    />
  }>
    <DateField value={from()} onValueChange={handleFromChange} ... />
    <span>~</span>
    <DateField value={to()} onValueChange={handleToChange} min={from()} ... />
  </Show>
</div>
```

## 자동 계산 로직

### periodType 변경 시

- **"월"**: from이 있으면 from을 1일로 보정, to를 해당 월 말일로 설정. from이 없으면 to도 undefined.
- **"일"**: to = from

### from 변경 시

- **"월"**: to = from의 월 말일
- **"일"**: to = from
- **"범위"**: from > to이면 to = from

### 콜백 호출

자동 보정된 값도 onFromChange/onToChange를 통해 외부에 알림.

## 사용 예시

```tsx
const [periodType, setPeriodType] = createSignal<"일" | "월" | "범위">("범위");
const [from, setFrom] = createSignal<DateOnly>();
const [to, setTo] = createSignal<DateOnly>();

<DateRangePicker
  periodType={periodType()}
  onPeriodTypeChange={setPeriodType}
  from={from()}
  onFromChange={setFrom}
  to={to()}
  onToChange={setTo}
  required
/>;
```

## 의존 컴포넌트

- `Select` (+ `Select.Item`): 기간 타입 선택
- `DateField`: 날짜 입력
- `createPropSignal`: Controlled/Uncontrolled 패턴 지원
