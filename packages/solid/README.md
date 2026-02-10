# @simplysm/solid

ERP, MES 등 기업용 백오피스 애플리케이션을 위한 SolidJS UI 컴포넌트 라이브러리. 데이터 중심의 폼, 테이블, 사이드바 레이아웃 등 관리 화면에 필요한 컴포넌트를 제공하며, Tailwind CSS 스타일링, 다크 모드, 반응형 레이아웃을 지원한다.

## 설치

```bash
pnpm add @simplysm/solid
```

**Peer Dependencies:**
- `solid-js` ^1.9
- `tailwindcss` ^3.4

**Optional Peer Dependencies:**
- `echarts` ^6.0 -- Echarts 차트 컴포넌트 사용 시

## 설정

### Tailwind CSS

`@simplysm/solid`는 Tailwind CSS preset을 제공한다. 앱의 `tailwind.config.ts`에서 preset으로 등록하면 시맨틱 색상, 필드 크기, z-index 등 커스텀 테마가 자동으로 적용된다.

```typescript
// tailwind.config.ts
import simplysmPreset from "@simplysm/solid/tailwind.config";

export default {
  darkMode: "class",
  presets: [simplysmPreset],
  content: [
    "./src/**/*.{ts,tsx}",
    ...simplysmPreset.content,
  ],
};
```

### Provider 설정

앱 루트에서 `InitializeProvider`와 `ThemeProvider`를 감싸야 한다. `InitializeProvider`는 앱 전역 설정(clientName, storage)을 제공하고, `ThemeProvider`는 다크 모드 상태를 관리한다.

```tsx
import { InitializeProvider, ThemeProvider } from "@simplysm/solid";

function App() {
  return (
    <InitializeProvider config={{ clientName: "my-app" }}>
      <ThemeProvider>
        {/* 앱 내용 */}
      </ThemeProvider>
    </InitializeProvider>
  );
}
```

또는 `ConfigContext.Provider`를 직접 사용할 수도 있다:

```tsx
import { ConfigContext, ThemeProvider } from "@simplysm/solid";

function App() {
  return (
    <ConfigContext.Provider value={{ clientName: "my-app" }}>
      <ThemeProvider>
        {/* 앱 내용 */}
      </ThemeProvider>
    </ConfigContext.Provider>
  );
}
```

### 기본 CSS

엔트리 포인트에서 기본 CSS를 import한다:

```typescript
// entry point (예: index.tsx)
import "@simplysm/solid/base.css";
```

---

## 컴포넌트

### Form Control

#### Button

인터랙티브 버튼 컴포넌트. Material Design ripple 효과 내장.

```tsx
import { Button } from "@simplysm/solid";

<Button theme="primary" variant="solid">확인</Button>
<Button theme="danger" variant="outline" size="sm">삭제</Button>
<Button variant="ghost">취소</Button>
<Button disabled>비활성</Button>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `theme` | `"primary" \| "info" \| "success" \| "warning" \| "danger" \| "base"` | `"base"` | 색상 테마 |
| `variant` | `"solid" \| "outline" \| "ghost"` | `"outline"` | 스타일 변형 |
| `size` | `"sm" \| "lg"` | - | 크기 |
| `inset` | `boolean` | - | 인셋 스타일 (테두리/둥근 모서리 제거) |
| `disabled` | `boolean` | - | 비활성화 |

HTML `<button>` 요소의 모든 표준 속성을 추가로 전달할 수 있다.

---

#### TextInput

텍스트 입력 필드. 포맷 마스크, IME(한글 등) 조합 처리를 지원한다.

```tsx
import { TextInput } from "@simplysm/solid";

// 기본 사용
<TextInput value={name()} onValueChange={setName} placeholder="이름 입력" />

// 비밀번호
<TextInput type="password" />

// 포맷 마스크 (예: 전화번호)
<TextInput format="XXX-XXXX-XXXX" value={phone()} onValueChange={setPhone} />
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `value` | `string` | `""` | 입력 값 |
| `onValueChange` | `(value: string) => void` | - | 값 변경 콜백 |
| `type` | `"text" \| "password" \| "email"` | `"text"` | 입력 타입 |
| `format` | `string` | - | 입력 포맷 (`X`는 문자 자리, 나머지는 구분자) |
| `placeholder` | `string` | - | 플레이스홀더 |
| `disabled` | `boolean` | - | 비활성화 |
| `readonly` | `boolean` | - | 읽기 전용 |
| `error` | `boolean` | - | 에러 상태 (빨간 테두리) |
| `size` | `"sm" \| "lg"` | - | 크기 |
| `inset` | `boolean` | - | 인셋 스타일 |

---

#### NumberInput

숫자 입력 필드. 천단위 콤마, 최소 소수점 자릿수를 지원한다.

```tsx
import { NumberInput } from "@simplysm/solid";

// 기본 사용 (천단위 콤마 자동 적용)
<NumberInput value={amount()} onValueChange={setAmount} />

// 천단위 콤마 없이
<NumberInput value={num()} comma={false} />

// 최소 소수점 2자리
<NumberInput value={price()} minDigits={2} />
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `value` | `number` | - | 입력 값 |
| `onValueChange` | `(value: number \| undefined) => void` | - | 값 변경 콜백 |
| `comma` | `boolean` | `true` | 천단위 콤마 표시 |
| `minDigits` | `number` | - | 최소 소수점 자릿수 |
| `placeholder` | `string` | - | 플레이스홀더 |
| `disabled` | `boolean` | - | 비활성화 |
| `readonly` | `boolean` | - | 읽기 전용 |
| `error` | `boolean` | - | 에러 상태 |
| `size` | `"sm" \| "lg"` | - | 크기 |
| `inset` | `boolean` | - | 인셋 스타일 |

---

#### DatePicker

날짜 입력 필드. year, month, date 단위를 지원하며, `DateOnly` 타입으로 값을 처리한다.

```tsx
import { DatePicker } from "@simplysm/solid";
import { DateOnly } from "@simplysm/core-common";

// 날짜 입력
<DatePicker unit="date" value={date()} onValueChange={setDate} />

// 연월 입력
<DatePicker unit="month" value={monthDate()} onValueChange={setMonthDate} />

// 연도만 입력
<DatePicker unit="year" value={yearDate()} onValueChange={setYearDate} />

// min/max 제한
<DatePicker
  unit="date"
  value={date()}
  onValueChange={setDate}
  min={new DateOnly(2025, 1, 1)}
  max={new DateOnly(2025, 12, 31)}
/>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `value` | `DateOnly` | - | 입력 값 |
| `onValueChange` | `(value: DateOnly \| undefined) => void` | - | 값 변경 콜백 |
| `unit` | `"year" \| "month" \| "date"` | `"date"` | 날짜 단위 |
| `min` | `DateOnly` | - | 최소 날짜 |
| `max` | `DateOnly` | - | 최대 날짜 |
| `disabled` | `boolean` | - | 비활성화 |
| `readonly` | `boolean` | - | 읽기 전용 |
| `error` | `boolean` | - | 에러 상태 |
| `size` | `"sm" \| "lg"` | - | 크기 |
| `inset` | `boolean` | - | 인셋 스타일 |

> `DateTimePicker`와 `TimePicker`도 동일한 패턴으로 날짜시간(`DateTime`) 및 시간(`Time`) 입력을 지원한다.

---

#### DateRangePicker

기간 타입(일/월/범위) 선택에 따라 날짜 범위를 입력하는 컴포넌트. periodType 변경 시 from/to가 자동으로 보정된다.

```tsx
import { DateRangePicker, type DateRangePeriodType } from "@simplysm/solid";
import { createSignal } from "solid-js";
import { DateOnly } from "@simplysm/core-common";

const [periodType, setPeriodType] = createSignal<DateRangePeriodType>("range");
const [from, setFrom] = createSignal<DateOnly>();
const [to, setTo] = createSignal<DateOnly>();

<DateRangePicker
  periodType={periodType()}
  onPeriodTypeChange={setPeriodType}
  from={from()}
  onFromChange={setFrom}
  to={to()}
  onToChange={setTo}
/>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `periodType` | `"day" \| "month" \| "range"` | `"range"` | 기간 타입 |
| `onPeriodTypeChange` | `(value: DateRangePeriodType) => void` | - | 기간 타입 변경 콜백 |
| `from` | `DateOnly` | - | 시작 날짜 |
| `onFromChange` | `(value: DateOnly \| undefined) => void` | - | 시작 날짜 변경 콜백 |
| `to` | `DateOnly` | - | 종료 날짜 |
| `onToChange` | `(value: DateOnly \| undefined) => void` | - | 종료 날짜 변경 콜백 |
| `disabled` | `boolean` | - | 비활성화 |
| `size` | `"sm" \| "lg"` | - | 크기 |
| `periodLabels` | `Partial<Record<DateRangePeriodType, string>>` | `{ day: "일", month: "월", range: "범위" }` | 기간 타입 라벨 |

---

#### Textarea

여러 줄 텍스트 입력 필드. 내용에 따라 자동으로 높이가 조절되며, IME 조합 처리를 지원한다.

```tsx
import { Textarea } from "@simplysm/solid";

<Textarea value={text()} onValueChange={setText} />

// 최소 3줄 높이
<Textarea minRows={3} value={text()} onValueChange={setText} />
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `value` | `string` | `""` | 입력 값 |
| `onValueChange` | `(value: string) => void` | - | 값 변경 콜백 |
| `placeholder` | `string` | - | 플레이스홀더 |
| `minRows` | `number` | `1` | 최소 줄 수 |
| `disabled` | `boolean` | - | 비활성화 |
| `readonly` | `boolean` | - | 읽기 전용 |
| `error` | `boolean` | - | 에러 상태 |
| `size` | `"sm" \| "lg"` | - | 크기 |
| `inset` | `boolean` | - | 인셋 스타일 |

---

#### Select

드롭다운 선택 컴포넌트. items prop 방식과 children(Compound Components) 방식을 모두 지원한다. 단일 선택 및 다중 선택을 지원한다.

```tsx
import { Select } from "@simplysm/solid";

// items 방식 (단순 배열)
<Select
  items={["사과", "바나나", "딸기"]}
  value={fruit()}
  onValueChange={setFruit}
  placeholder="과일 선택"
/>

// children 방식 (Compound Components)
<Select value={fruit()} onValueChange={setFruit} renderValue={(v) => v.name}>
  <Select.Item value={item1}>{item1.name}</Select.Item>
  <Select.Item value={item2}>{item2.name}</Select.Item>
</Select>

// items 방식 + ItemTemplate으로 커스텀 렌더링
<Select items={users} value={selectedUser()} onValueChange={setSelectedUser}>
  <Select.ItemTemplate>
    {(user) => <>{user.name} ({user.email})</>}
  </Select.ItemTemplate>
</Select>

// 다중 선택
<Select items={options} value={selected()} onValueChange={setSelected} multiple />

// 액션 버튼 및 헤더 추가
<Select value={item()} onValueChange={setItem} renderValue={(v) => v.name}>
  <Select.Header><div>커스텀 헤더</div></Select.Header>
  <Select.Action onClick={handleAdd}>+</Select.Action>
  <Select.Item value={item1}>{item1.name}</Select.Item>
</Select>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `value` | `T \| T[]` | - | 선택 값 |
| `onValueChange` | `(value: T \| T[]) => void` | - | 값 변경 콜백 |
| `items` | `T[]` | - | 항목 배열 (items 방식) |
| `getChildren` | `(item: T, index: number, depth: number) => T[] \| undefined` | - | 트리 구조 자식 항목 |
| `renderValue` | `(value: T) => JSX.Element` | - | 값 렌더링 함수 (children 방식에서 필수) |
| `multiple` | `boolean` | `false` | 다중 선택 |
| `multiDisplayDirection` | `"horizontal" \| "vertical"` | `"horizontal"` | 다중 선택 시 표시 방향 |
| `hideSelectAll` | `boolean` | - | 전체 선택 버튼 숨기기 (다중 선택 시) |
| `placeholder` | `string` | - | 플레이스홀더 |
| `disabled` | `boolean` | - | 비활성화 |
| `required` | `boolean` | - | 필수 입력 |
| `size` | `"sm" \| "lg"` | - | 크기 |
| `inset` | `boolean` | - | 인셋 스타일 |

**서브 컴포넌트:**
- `Select.Item` -- 선택 항목
- `Select.Action` -- 우측 액션 버튼
- `Select.Header` -- 드롭다운 상단 커스텀 영역
- `Select.ItemTemplate` -- items 방식일 때 아이템 렌더링 템플릿

---

#### Combobox

비동기 검색과 아이템 선택을 지원하는 자동완성 컴포넌트. 디바운스 처리가 내장되어 있다.

```tsx
import { Combobox } from "@simplysm/solid";

<Combobox
  loadItems={async (query) => {
    const response = await fetch(`/api/search?q=${query}`);
    return response.json();
  }}
  renderValue={(item) => item.name}
  value={selected()}
  onValueChange={setSelected}
  placeholder="검색..."
>
  <Combobox.ItemTemplate>
    {(item) => <>{item.name}</>}
  </Combobox.ItemTemplate>
</Combobox>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `value` | `T` | - | 선택 값 |
| `onValueChange` | `(value: T) => void` | - | 값 변경 콜백 |
| `loadItems` | `(query: string) => Promise<T[]>` | **(필수)** | 아이템 로드 함수 |
| `renderValue` | `(value: T) => JSX.Element` | **(필수)** | 값 렌더링 함수 |
| `debounceMs` | `number` | `300` | 디바운스 딜레이 (ms) |
| `allowCustomValue` | `boolean` | - | 커스텀 값 허용 |
| `parseCustomValue` | `(text: string) => T` | - | 커스텀 값 파싱 함수 |
| `placeholder` | `string` | - | 플레이스홀더 |
| `disabled` | `boolean` | - | 비활성화 |
| `size` | `"sm" \| "lg"` | - | 크기 |
| `inset` | `boolean` | - | 인셋 스타일 |

**서브 컴포넌트:**
- `Combobox.Item` -- 선택 항목
- `Combobox.ItemTemplate` -- 아이템 렌더링 템플릿

---

#### Checkbox / Radio

체크박스 및 라디오 버튼 컴포넌트.

```tsx
import { Checkbox, Radio } from "@simplysm/solid";

<Checkbox value={checked()} onValueChange={setChecked}>동의합니다</Checkbox>
<Checkbox theme="success" value={active()} onValueChange={setActive}>활성화</Checkbox>

<Radio value={option() === "a"} onValueChange={() => setOption("a")}>옵션 A</Radio>
<Radio value={option() === "b"} onValueChange={() => setOption("b")}>옵션 B</Radio>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `value` | `boolean` | `false` | 선택 상태 |
| `onValueChange` | `(value: boolean) => void` | - | 값 변경 콜백 |
| `theme` | `"primary" \| "info" \| "success" \| "warning" \| "danger" \| "base"` | `"primary"` | 색상 테마 |
| `size` | `"sm" \| "lg"` | - | 크기 |
| `disabled` | `boolean` | - | 비활성화 |
| `inset` | `boolean` | - | 인셋 스타일 |
| `inline` | `boolean` | - | 인라인 스타일 |

---

#### CheckboxGroup / RadioGroup

여러 항목에서 복수/단일 선택을 관리하는 그룹 컴포넌트.

```tsx
import { CheckboxGroup, RadioGroup } from "@simplysm/solid";

// 다중 선택
<CheckboxGroup value={selectedColors()} onValueChange={setSelectedColors}>
  <CheckboxGroup.Item value="red">빨강</CheckboxGroup.Item>
  <CheckboxGroup.Item value="green">초록</CheckboxGroup.Item>
  <CheckboxGroup.Item value="blue">파랑</CheckboxGroup.Item>
</CheckboxGroup>

// 단일 선택
<RadioGroup value={size()} onValueChange={setSize}>
  <RadioGroup.Item value="sm">Small</RadioGroup.Item>
  <RadioGroup.Item value="md">Medium</RadioGroup.Item>
  <RadioGroup.Item value="lg">Large</RadioGroup.Item>
</RadioGroup>
```

**CheckboxGroup Props:**

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `value` | `T[]` | `[]` | 선택된 값 배열 |
| `onValueChange` | `(value: T[]) => void` | - | 값 변경 콜백 |
| `theme` | `SemanticTheme` | `"primary"` | 색상 테마 |
| `size` | `"sm" \| "lg"` | - | 크기 |
| `disabled` | `boolean` | - | 전체 비활성화 |
| `inline` | `boolean` | - | 인라인 스타일 |
| `inset` | `boolean` | - | 인셋 스타일 |

**RadioGroup Props:**

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `value` | `T` | - | 선택된 값 |
| `onValueChange` | `(value: T) => void` | - | 값 변경 콜백 |
| `theme` | `SemanticTheme` | `"primary"` | 색상 테마 |
| `size` | `"sm" \| "lg"` | - | 크기 |
| `disabled` | `boolean` | - | 전체 비활성화 |
| `inline` | `boolean` | - | 인라인 스타일 |
| `inset` | `boolean` | - | 인셋 스타일 |

---

#### ColorPicker

색상 선택 컴포넌트.

```tsx
import { ColorPicker } from "@simplysm/solid";

<ColorPicker value={color()} onValueChange={setColor} />
<ColorPicker value={color()} size="sm" disabled />
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `value` | `string` | `"#000000"` | 색상 값 (#RRGGBB 형식) |
| `onValueChange` | `(value: string) => void` | - | 값 변경 콜백 |
| `size` | `"sm" \| "lg"` | - | 크기 |
| `disabled` | `boolean` | - | 비활성화 |

---

#### ThemeToggle

다크/라이트/시스템 테마 순환 토글 버튼. `ThemeProvider` 내부에서 사용해야 한다.

```tsx
import { ThemeToggle } from "@simplysm/solid";

<ThemeToggle />
<ThemeToggle size="sm" />
<ThemeToggle size="lg" />
```

클릭 시 `light -> system -> dark -> light` 순서로 순환하며, 현재 모드에 맞는 아이콘이 표시된다.

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `size` | `"sm" \| "lg"` | - | 버튼 크기 |

---

#### RichTextEditor

Tiptap 기반 리치 텍스트 에디터. 텍스트 서식(볼드, 이탤릭, 취소선), 정렬, 색상, 하이라이트, 테이블, 이미지 삽입을 지원한다.

```tsx
import { RichTextEditor } from "@simplysm/solid";

<RichTextEditor value={html()} onValueChange={setHtml} />
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `value` | `string` | - | HTML 문자열 값 |
| `onValueChange` | `(value: string) => void` | - | 값 변경 콜백 |
| `disabled` | `boolean` | - | 비활성화 |
| `error` | `boolean` | - | 에러 상태 |
| `size` | `"sm" \| "lg"` | - | 크기 |

---

#### Numpad

숫자 키패드 컴포넌트. 터치 기반 숫자 입력이 필요한 환경에서 사용한다.

```tsx
import { Numpad } from "@simplysm/solid";

<Numpad value={amount()} onValueChange={setAmount} />

// ENT/마이너스 버튼 포함
<Numpad
  value={amount()}
  onValueChange={setAmount}
  useEnterButton
  useMinusButton
  onEnterButtonClick={handleSubmit}
/>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `value` | `number` | - | 입력 값 |
| `onValueChange` | `(value: number \| undefined) => void` | - | 값 변경 콜백 |
| `placeholder` | `string` | - | 플레이스홀더 |
| `required` | `boolean` | - | 필수 입력 여부 |
| `inputDisabled` | `boolean` | - | 텍스트 필드 직접 입력 비활성화 |
| `useEnterButton` | `boolean` | - | ENT 버튼 표시 |
| `useMinusButton` | `boolean` | - | - 버튼 표시 |
| `onEnterButtonClick` | `() => void` | - | ENT 클릭 콜백 |
| `size` | `"sm" \| "lg"` | - | 크기 |

---

#### StatePreset

검색 조건 등 화면 상태를 프리셋으로 저장/불러오기 하는 컴포넌트. localStorage에 영속 저장된다.

```tsx
import { StatePreset } from "@simplysm/solid";

<StatePreset
  presetKey="user-search"
  value={searchState()}
  onValueChange={setSearchState}
/>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `presetKey` | `string` | **(필수)** | 프리셋 저장 키 |
| `value` | `T` | **(필수)** | 현재 상태 값 |
| `onValueChange` | `(value: T) => void` | **(필수)** | 상태 복원 콜백 |
| `size` | `"sm" \| "lg"` | - | 크기 |

---

### Navigation

#### Tabs

탭 네비게이션 컴포넌트.

```tsx
import { Tabs } from "@simplysm/solid";

<Tabs value={activeTab()} onValueChange={setActiveTab}>
  <Tabs.Tab value="tab1">탭 1</Tabs.Tab>
  <Tabs.Tab value="tab2">탭 2</Tabs.Tab>
  <Tabs.Tab value="tab3" disabled>탭 3</Tabs.Tab>
</Tabs>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `value` | `string` | - | 선택된 탭 값 |
| `onValueChange` | `(value: string) => void` | - | 탭 변경 콜백 |
| `size` | `"sm" \| "lg"` | - | 크기 |

**서브 컴포넌트:**
- `Tabs.Tab` -- 개별 탭 (`value: string`, `disabled?: boolean`)

---

### Display

#### Card

그림자 효과가 있는 카드 컨테이너.

```tsx
import { Card } from "@simplysm/solid";

<Card>카드 내용</Card>
<Card class="p-4">패딩이 있는 카드</Card>
```

---

#### Tag

인라인 태그/뱃지 컴포넌트.

```tsx
import { Tag } from "@simplysm/solid";

<Tag theme="primary">신규</Tag>
<Tag theme="success">완료</Tag>
<Tag theme="danger">긴급</Tag>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `theme` | `"primary" \| "info" \| "success" \| "warning" \| "danger" \| "base"` | `"base"` | 색상 테마 |

---

#### Alert

블록 레벨 알림/공지 컴포넌트.

```tsx
import { Alert } from "@simplysm/solid";

<Alert theme="info">안내 메시지입니다.</Alert>
<Alert theme="warning">주의가 필요한 사항입니다.</Alert>
<Alert theme="danger">오류가 발생했습니다.</Alert>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `theme` | `"primary" \| "info" \| "success" \| "warning" \| "danger" \| "base"` | `"base"` | 색상 테마 |

---

#### Icon

Tabler Icons 래퍼 컴포넌트. `em` 단위로 주변 텍스트 크기에 비례하여 표시된다.

```tsx
import { Icon } from "@simplysm/solid";
import { IconCheck, IconAlertTriangle } from "@tabler/icons-solidjs";

<Icon icon={IconCheck} />
<Icon icon={IconAlertTriangle} size="2em" />
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `icon` | `Component` | **(필수)** | Tabler icon 컴포넌트 |
| `size` | `string \| number` | `"1.25em"` | 아이콘 크기 |

---

#### Progress

진행률 표시 컴포넌트.

```tsx
import { Progress } from "@simplysm/solid";

<Progress value={0.65} />
<Progress value={0.8} theme="success" size="lg" />

// 커스텀 텍스트
<Progress value={progress()}>
  {Math.round(progress() * 100)}% 완료
</Progress>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `value` | `number` | **(필수)** | 진행률 (0~1) |
| `theme` | `"primary" \| "info" \| "success" \| "warning" \| "danger" \| "base"` | `"primary"` | 색상 테마 |
| `size` | `"sm" \| "lg"` | - | 크기 |
| `inset` | `boolean` | - | 인셋 스타일 |

---

#### Barcode

bwip-js 기반 바코드/QR코드 렌더링 컴포넌트. 100가지 이상의 바코드 타입을 지원한다.

```tsx
import { Barcode } from "@simplysm/solid";

<Barcode type="qrcode" value="https://example.com" />
<Barcode type="code128" value="ABC-12345" />
<Barcode type="ean13" value="4901234567890" />
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `type` | `BarcodeType` | **(필수)** | 바코드 타입 (`"qrcode"`, `"code128"`, `"ean13"` 등) |
| `value` | `string` | - | 바코드 값 |

---

#### Echarts

Apache ECharts 차트 래퍼 컴포넌트. `echarts` peer dependency를 설치해야 사용할 수 있다.

```tsx
import { Echarts } from "@simplysm/solid";

<Echarts
  option={{
    xAxis: { type: "category", data: ["Mon", "Tue", "Wed"] },
    yAxis: { type: "value" },
    series: [{ data: [120, 200, 150], type: "bar" }],
  }}
/>

<Echarts option={chartOption()} loading={isLoading()} />
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `option` | `echarts.EChartsOption` | **(필수)** | ECharts 옵션 객체 |
| `loading` | `boolean` | - | 로딩 상태 표시 |

---

### Layout

#### Sidebar

사이드바 네비게이션. 반응형 지원 (520px 미만에서 모바일 오버레이). 열림/닫힘 상태는 localStorage에 저장된다.

```tsx
import { Sidebar } from "@simplysm/solid";

<Sidebar.Container>
  <Sidebar>
    <Sidebar.User name="홍길동" menus={userMenus}>
      <span>홍길동</span>
    </Sidebar.User>
    <Sidebar.Menu menus={menuItems} />
  </Sidebar>
  <div class="flex flex-1 flex-col">
    <Topbar>
      <h1>앱 이름</h1>
    </Topbar>
    <main class="flex-1 overflow-auto p-4">
      {/* 메인 콘텐츠 */}
    </main>
  </div>
</Sidebar.Container>
```

**서브 컴포넌트:**
- `Sidebar.Container` -- 사이드바와 메인 영역을 감싸는 컨테이너 (필수)
- `Sidebar.Menu` -- 메뉴 항목 목록 (`menus: SidebarMenuItem[]`)
- `Sidebar.User` -- 사용자 정보 영역

---

#### Topbar

상단 네비게이션 바. `Sidebar.Container` 내부에서 사용하면 사이드바 토글 버튼이 자동으로 나타난다.

```tsx
import { Topbar } from "@simplysm/solid";

<Topbar>
  <h1 class="text-lg font-bold">앱 이름</h1>
  <Topbar.Menu menus={menuItems} />
  <div class="flex-1" />
  <Topbar.User menus={userMenus}>사용자</Topbar.User>
</Topbar>
```

**서브 컴포넌트:**
- `Topbar.Container` -- 탑바 아래 메인 콘텐츠를 감싸는 컨테이너
- `Topbar.Menu` -- 메뉴 항목 목록
- `Topbar.User` -- 사용자 메뉴 (드롭다운)

---

#### FormGroup

폼 필드를 라벨과 함께 수직 또는 인라인으로 배치하는 레이아웃 컴포넌트.

```tsx
import { FormGroup, TextInput } from "@simplysm/solid";

// 수직 배치 (기본)
<FormGroup>
  <FormGroup.Item label="이름">
    <TextInput value={name()} onValueChange={setName} />
  </FormGroup.Item>
  <FormGroup.Item label="이메일">
    <TextInput type="email" value={email()} onValueChange={setEmail} />
  </FormGroup.Item>
</FormGroup>

// 인라인 배치
<FormGroup inline>
  <FormGroup.Item label="검색">
    <TextInput value={query()} onValueChange={setQuery} />
  </FormGroup.Item>
  <FormGroup.Item>
    <Button theme="primary">검색</Button>
  </FormGroup.Item>
</FormGroup>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `inline` | `boolean` | `false` | 인라인 배치 모드 |

**서브 컴포넌트:**
- `FormGroup.Item` -- 폼 항목 (`label?: JSX.Element`)

---

#### FormTable

`<table>` 기반 폼 레이아웃. `<th>`에 라벨, `<td>`에 입력 필드를 배치한다.

```tsx
import { FormTable, TextInput, NumberInput } from "@simplysm/solid";

<FormTable>
  <tbody>
    <tr>
      <th>이름</th>
      <td><TextInput value={name()} onValueChange={setName} /></td>
      <th>나이</th>
      <td><NumberInput value={age()} onValueChange={setAge} /></td>
    </tr>
    <tr>
      <th>이메일</th>
      <td colSpan={3}><TextInput type="email" value={email()} onValueChange={setEmail} /></td>
    </tr>
  </tbody>
</FormTable>
```

---

#### Kanban

칸반 보드 레이아웃 컴포넌트.

---

### Data

#### Table

기본 HTML 테이블 래퍼. 테두리, 헤더 배경 등 일관된 스타일을 제공한다.

```tsx
import { Table } from "@simplysm/solid";

<Table>
  <thead>
    <tr><th>이름</th><th>나이</th></tr>
  </thead>
  <tbody>
    <tr><td>홍길동</td><td>30</td></tr>
    <tr><td>김철수</td><td>25</td></tr>
  </tbody>
</Table>

// 인셋 스타일 (외곽 테두리 제거, 부모 컨테이너에 맞춤)
<Table inset>...</Table>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `inset` | `boolean` | - | 인셋 스타일 |

---

#### DataSheet

고급 데이터 테이블 컴포넌트. 정렬, 페이지네이션, 행 선택, 트리 확장, 컬럼 리사이즈, 컬럼 설정, 행 재정렬을 지원한다.

```tsx
import { DataSheet } from "@simplysm/solid";

<DataSheet items={users()} key="user-table">
  <DataSheet.Column key="name" header="이름" sortable>
    {({ item }) => <>{item.name}</>}
  </DataSheet.Column>
  <DataSheet.Column key="age" header="나이" sortable width="80px">
    {({ item }) => <>{item.age}</>}
  </DataSheet.Column>
  <DataSheet.Column key="email" header="이메일">
    {({ item }) => <>{item.email}</>}
  </DataSheet.Column>
</DataSheet>

// 페이지네이션 + 정렬 + 선택
<DataSheet
  items={data()}
  key="data-table"
  page={page()}
  onPageChange={setPage}
  totalPageCount={totalPages()}
  sorts={sorts()}
  onSortsChange={setSorts}
  selectMode="multiple"
  selectedItems={selectedItems()}
  onSelectedItemsChange={setSelectedItems}
>
  {/* columns */}
</DataSheet>
```

**DataSheet Props (주요 항목):**

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `items` | `T[]` | - | 데이터 배열 |
| `key` | `string` | - | 컬럼 설정 저장 키 |
| `inset` | `boolean` | - | 인셋 스타일 |
| `sorts` | `SortingDef[]` | - | 정렬 정의 |
| `onSortsChange` | `(sorts: SortingDef[]) => void` | - | 정렬 변경 콜백 |
| `autoSort` | `boolean` | - | 클라이언트 자동 정렬 |
| `page` | `number` | - | 현재 페이지 (0-based) |
| `onPageChange` | `(page: number) => void` | - | 페이지 변경 콜백 |
| `totalPageCount` | `number` | - | 전체 페이지 수 |
| `selectMode` | `"single" \| "multiple"` | - | 선택 모드 |
| `selectedItems` | `T[]` | - | 선택된 항목 |
| `onSelectedItemsChange` | `(items: T[]) => void` | - | 선택 변경 콜백 |
| `getChildren` | `(item: T, index: number) => T[] \| undefined` | - | 트리 구조 자식 항목 |
| `hideConfigBar` | `boolean` | - | 설정 바 숨기기 |

**DataSheet.Column Props:**

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `key` | `string` | **(필수)** | 컬럼 식별 키 |
| `header` | `string \| string[]` | - | 헤더 텍스트 (배열 시 다단 헤더) |
| `headerContent` | `() => JSX.Element` | - | 커스텀 헤더 렌더링 |
| `summary` | `() => JSX.Element` | - | 합계 행 렌더링 |
| `width` | `string` | - | 컬럼 너비 |
| `fixed` | `boolean` | - | 고정 컬럼 |
| `hidden` | `boolean` | - | 숨김 컬럼 |
| `sortable` | `boolean` | - | 정렬 가능 |
| `resizable` | `boolean` | - | 리사이즈 가능 |
| `children` | `(ctx: { item: T, index: number, depth: number }) => JSX.Element` | **(필수)** | 셀 렌더링 함수 |

---

#### List

트리뷰 스타일 목록 컴포넌트. 키보드 네비게이션을 지원한다.

```tsx
import { List } from "@simplysm/solid";

<List>
  <List.Item>항목 1</List.Item>
  <List.Item>항목 2</List.Item>
  <List.Item>
    부모 항목
    <List.Item.Children>
      <List.Item>자식 항목 1</List.Item>
      <List.Item>자식 항목 2</List.Item>
    </List.Item.Children>
  </List.Item>
</List>

// 인셋 스타일
<List inset>
  <List.Item>Inset 항목</List.Item>
</List>
```

**키보드 네비게이션:**
- `ArrowUp` / `ArrowDown` -- 이전/다음 항목으로 포커스 이동
- `Space` / `Enter` -- 현재 항목 클릭
- `ArrowRight` -- 닫혀있으면 열기, 열려있으면 첫 자식으로 포커스
- `ArrowLeft` -- 열려있으면 닫기, 닫혀있으면 부모로 포커스
- `Home` / `End` -- 첫 번째/마지막 항목으로 포커스

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `inset` | `boolean` | - | 투명 배경 스타일 |

---

#### Pagination

페이지 네비게이션 컴포넌트.

```tsx
import { Pagination } from "@simplysm/solid";

<Pagination
  page={currentPage()}
  onPageChange={setCurrentPage}
  totalPageCount={20}
  displayPageCount={10}
/>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `page` | `number` | **(필수)** | 현재 페이지 (0-based) |
| `onPageChange` | `(page: number) => void` | - | 페이지 변경 콜백 |
| `totalPageCount` | `number` | **(필수)** | 전체 페이지 수 |
| `displayPageCount` | `number` | `10` | 한 번에 표시할 페이지 수 |
| `size` | `"sm" \| "lg"` | - | 크기 |

---

#### Calendar

달력 형태의 데이터 표시 컴포넌트.

```tsx
import { Calendar } from "@simplysm/solid";

<Calendar
  items={events()}
  getItemDate={(event) => event.date}
  renderItem={(event) => <div>{event.title}</div>}
  yearMonth={yearMonth()}
  onYearMonthChange={setYearMonth}
/>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `items` | `T[]` | **(필수)** | 데이터 배열 |
| `getItemDate` | `(item: T, index: number) => DateOnly` | **(필수)** | 항목의 날짜 추출 함수 |
| `renderItem` | `(item: T, index: number) => JSX.Element` | **(필수)** | 항목 렌더링 함수 |
| `yearMonth` | `DateOnly` | - | 표시할 연월 |
| `onYearMonthChange` | `(value: DateOnly) => void` | - | 연월 변경 콜백 |
| `weekStartDay` | `number` | `0` (일요일) | 주 시작 요일 |

---

#### PermissionTable

권한 관리 테이블 컴포넌트.

---

### Disclosure

#### Collapse

콘텐츠 접기/펼치기 애니메이션 컴포넌트. `margin-top` 기반 트랜지션으로 부드러운 열림/닫힘 효과를 제공한다.

```tsx
import { Collapse, Button } from "@simplysm/solid";
import { createSignal } from "solid-js";

const [open, setOpen] = createSignal(false);

<Button
  aria-expanded={open()}
  aria-controls="content"
  onClick={() => setOpen(!open())}
>
  토글
</Button>
<Collapse id="content" open={open()}>
  <p>접히는 내용</p>
</Collapse>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `open` | `boolean` | `false` | 열림 여부 |

`prefers-reduced-motion` 설정 시 애니메이션이 자동으로 비활성화된다.

---

#### Dropdown

포지셔닝이 적용된 드롭다운 팝업. 트리거 요소 또는 절대 좌표 기준으로 위치가 결정된다.

```tsx
import { Dropdown, Button } from "@simplysm/solid";
import { createSignal } from "solid-js";

const [open, setOpen] = createSignal(false);
let triggerRef!: HTMLButtonElement;

<Button ref={triggerRef} onClick={() => setOpen(!open())}>열기</Button>
<Dropdown triggerRef={() => triggerRef} open={open()} onOpenChange={setOpen}>
  <p class="p-3">드롭다운 내용</p>
</Dropdown>

// 컨텍스트 메뉴 (절대 위치)
<Dropdown position={{ x: 100, y: 200 }} open={menuOpen()} onOpenChange={setMenuOpen}>
  <List inset>
    <List.Item>메뉴 항목 1</List.Item>
    <List.Item>메뉴 항목 2</List.Item>
  </List>
</Dropdown>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `triggerRef` | `() => HTMLElement \| undefined` | - | 트리거 요소 참조 (position과 택일) |
| `position` | `{ x: number; y: number }` | - | 절대 위치 (triggerRef와 택일) |
| `open` | `boolean` | - | 열림 상태 |
| `onOpenChange` | `(open: boolean) => void` | - | 상태 변경 콜백 |
| `maxHeight` | `number` | `300` | 최대 높이 (px) |
| `keyboardNav` | `boolean` | - | 키보드 네비게이션 활성화 (Select 등에서 사용) |

---

#### Dialog

모달 다이얼로그 컴포넌트. 드래그 이동, 리사이즈, 플로팅 모드, 전체 화면 모드를 지원한다.

```tsx
import { Dialog, Button } from "@simplysm/solid";
import { createSignal } from "solid-js";

const [open, setOpen] = createSignal(false);

<Button onClick={() => setOpen(true)}>열기</Button>
<Dialog
  title="다이얼로그 제목"
  open={open()}
  onOpenChange={setOpen}
  closeOnBackdrop
  widthPx={600}
>
  <div class="p-4">
    다이얼로그 내용
  </div>
</Dialog>

// 플로팅 모드 (백드롭 없음)
<Dialog
  title="알림"
  open={open()}
  onOpenChange={setOpen}
  float
  position="bottom-right"
>
  <div class="p-4">플로팅 다이얼로그</div>
</Dialog>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `open` | `boolean` | - | 열림 상태 |
| `onOpenChange` | `(open: boolean) => void` | - | 상태 변경 콜백 |
| `title` | `string` | **(필수)** | 모달 제목 |
| `hideHeader` | `boolean` | - | 헤더 숨김 |
| `closable` | `boolean` | `true` | 닫기 버튼 표시 |
| `closeOnBackdrop` | `boolean` | - | 백드롭 클릭으로 닫기 |
| `closeOnEscape` | `boolean` | `true` | Escape 키로 닫기 |
| `resizable` | `boolean` | `false` | 리사이즈 가능 여부 |
| `movable` | `boolean` | `true` | 드래그 이동 가능 여부 |
| `float` | `boolean` | - | 플로팅 모드 (백드롭 없음) |
| `fill` | `boolean` | - | 전체 화면 모드 |
| `widthPx` | `number` | - | 너비 (px) |
| `heightPx` | `number` | - | 높이 (px) |
| `minWidthPx` | `number` | - | 최소 너비 (px) |
| `minHeightPx` | `number` | - | 최소 높이 (px) |
| `position` | `"bottom-right" \| "top-right"` | - | 고정 위치 |
| `headerAction` | `JSX.Element` | - | 헤더 액션 영역 |
| `canDeactivate` | `() => boolean` | - | 닫기 전 확인 함수 |
| `onCloseComplete` | `() => void` | - | 닫기 애니메이션 완료 후 콜백 |

---

### Feedback

#### Notification

알림 시스템. `NotificationProvider`로 감싸고, `useNotification` 훅으로 알림을 발생시킨다.

```tsx
import {
  NotificationProvider,
  NotificationBanner,
  NotificationBell,
  useNotification,
} from "@simplysm/solid";

// 앱 루트에서 Provider 설정
<NotificationProvider>
  <NotificationBanner />
  <header>
    <NotificationBell />
  </header>
  <MyApp />
</NotificationProvider>

// 컴포넌트 내에서 알림 발생
function MyComponent() {
  const notification = useNotification();

  const handleSave = () => {
    notification.success("성공", "저장되었습니다.");
  };

  const handleError = () => {
    notification.danger("오류", "문제가 발생했습니다.", {
      action: { label: "재시도", onClick: handleRetry },
    });
  };

  return <Button onClick={handleSave}>저장</Button>;
}
```

**useNotification API:**

| 메서드 | 시그니처 | 설명 |
|--------|----------|------|
| `info` | `(title: string, message?: string, options?: NotificationOptions) => string` | 정보 알림 |
| `success` | `(title: string, message?: string, options?: NotificationOptions) => string` | 성공 알림 |
| `warning` | `(title: string, message?: string, options?: NotificationOptions) => string` | 경고 알림 |
| `danger` | `(title: string, message?: string, options?: NotificationOptions) => string` | 오류 알림 |
| `update` | `(id: string, updates: Partial<NotificationItem>, options?: { renotify?: boolean }) => void` | 알림 수정 |
| `remove` | `(id: string) => void` | 알림 삭제 |
| `markAsRead` | `(id: string) => void` | 읽음 처리 |
| `markAllAsRead` | `() => void` | 전체 읽음 처리 |
| `dismissBanner` | `() => void` | 배너 닫기 |
| `clear` | `() => void` | 전체 삭제 |

**컴포넌트:**
- `NotificationProvider` -- 알림 상태 관리 Provider
- `NotificationBanner` -- 화면 상단 알림 배너
- `NotificationBell` -- 알림 벨 아이콘 (읽지 않은 알림 수 표시)

---

#### Loading

로딩 오버레이 시스템. `LoadingProvider`로 감싸고, `useLoading` 훅으로 로딩 상태를 제어한다.

```tsx
import {
  LoadingProvider,
  LoadingContainer,
  useLoading,
} from "@simplysm/solid";

// 앱 루트에서 Provider 설정
<LoadingProvider>
  <LoadingContainer />
  <MyApp />
</LoadingProvider>

// 컴포넌트 내에서 로딩 제어
function MyComponent() {
  const loading = useLoading();

  const fetchData = async () => {
    loading.show("데이터를 불러오는 중...");
    try {
      await fetch("/api/data");
    } finally {
      loading.hide();
    }
  };

  return <Button onClick={fetchData}>데이터 불러오기</Button>;
}
```

**useLoading API:**

| 메서드 | 시그니처 | 설명 |
|--------|----------|------|
| `show` | `(message?: string) => void` | 로딩 표시 |
| `hide` | `() => void` | 로딩 숨기기 |
| `setProgress` | `(percent: number \| undefined) => void` | 진행률 설정 |

---

### Print

#### Print / usePrint

브라우저 인쇄 및 PDF 생성 기능. `LoadingProvider`가 필요하다.

```tsx
import { Print, usePrint } from "@simplysm/solid";

function MyComponent() {
  const { toPrinter, toPdf } = usePrint();

  const handlePrint = async () => {
    await toPrinter(
      () => (
        <Print>
          <Print.Page>
            <h1>인쇄 내용</h1>
            <p>페이지 1</p>
          </Print.Page>
          <Print.Page>
            <p>페이지 2</p>
          </Print.Page>
        </Print>
      ),
      { size: "A4", margin: "10mm" },
    );
  };

  const handlePdf = async () => {
    const pdfData = await toPdf(
      () => (
        <Print>
          <Print.Page>
            <h1>PDF 내용</h1>
          </Print.Page>
        </Print>
      ),
      { size: "A4 landscape" },
    );
    // pdfData: Uint8Array
  };

  return (
    <>
      <Button onClick={handlePrint}>인쇄</Button>
      <Button onClick={handlePdf}>PDF 다운로드</Button>
    </>
  );
}
```

**usePrint API:**

| 메서드 | 시그니처 | 설명 |
|--------|----------|------|
| `toPrinter` | `(factory: () => JSX.Element, options?: PrintOptions) => Promise<void>` | 브라우저 인쇄 |
| `toPdf` | `(factory: () => JSX.Element, options?: PrintOptions) => Promise<Uint8Array>` | PDF 생성 |

**PrintOptions:**

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `size` | `string` | `"A4"` | 용지 크기 (`"A4"`, `"A3"`, `"A4 landscape"`, `"210mm 297mm"` 등) |
| `margin` | `string` | `"0"` | 여백 (`"10mm"`, `"1cm"` 등) |

**서브 컴포넌트:**
- `Print.Page` -- 명시적 페이지 분할 (미사용 시 자동 분할)

---

## Context & Hooks

### useTheme

테마(다크/라이트/시스템) 상태에 접근하는 훅. `ThemeProvider` 내부에서 사용해야 한다.

```tsx
import { useTheme } from "@simplysm/solid";

const theme = useTheme();
theme.mode();          // "light" | "dark" | "system"
theme.resolvedTheme(); // "light" | "dark" (system일 때 OS 설정 따름)
theme.setMode("dark");
theme.cycleMode();     // light -> system -> dark -> light
```

| 속성/메서드 | 타입 | 설명 |
|-------------|------|------|
| `mode` | `() => ThemeMode` | 현재 테마 모드 |
| `resolvedTheme` | `() => ResolvedTheme` | 실제 적용 테마 |
| `setMode` | `(mode: ThemeMode) => void` | 테마 모드 설정 |
| `cycleMode` | `() => void` | 다음 모드로 순환 |

---

### usePersisted

localStorage 기반 영속 시그널. `ConfigContext` 내부에서 사용해야 하며, 키는 자동으로 `{clientName}.{key}` 형태로 저장된다. `DateTime`, `DateOnly` 등 `@simplysm/core-common` 커스텀 타입의 직렬화를 지원한다.

```tsx
import { usePersisted } from "@simplysm/solid";

const [value, setValue] = usePersisted("settings.view", "grid");

// loading 상태 (비동기 저장소 사용 시)
const [data, setData, loading] = usePersisted("cache.data", defaultData);
```

| 반환값 | 타입 | 설명 |
|--------|------|------|
| `[0]` | `Accessor<T>` | 값 getter |
| `[1]` | `Setter<T>` | 값 setter |
| `[2]` | `Accessor<boolean>` | 로딩 상태 (비동기 저장소 전용) |

---

### useNotification

알림 시스템 접근 훅. `NotificationProvider` 내부에서 사용해야 한다. 자세한 API는 [Notification](#notification) 섹션 참조.

---

### useLoading

로딩 오버레이 접근 훅. `LoadingProvider` 내부에서 사용해야 한다. 자세한 API는 [Loading](#loading) 섹션 참조.

---

### usePrint

인쇄 및 PDF 생성 훅. `LoadingProvider` 내부에서 사용해야 한다. 자세한 API는 [Print](#print--useprint) 섹션 참조.

---

### useConfig

앱 전역 설정에 접근하는 훅. `ConfigContext.Provider` 또는 `InitializeProvider` 내부에서 사용해야 한다.

```tsx
import { useConfig } from "@simplysm/solid";

const config = useConfig();
console.log(config.clientName); // "my-app"
```

---

### createControllableSignal

Controlled/Uncontrolled 패턴을 자동으로 처리하는 signal hook. `onChange`가 제공되면 controlled 모드, 미제공이면 uncontrolled 모드로 동작한다.

```tsx
import { createControllableSignal } from "@simplysm/solid";

// 컴포넌트 내부에서 사용
const [value, setValue] = createControllableSignal({
  value: () => props.value ?? "",
  onChange: () => props.onValueChange,
});

// 함수형 setter 지원
setValue((prev) => prev + "!");
```

---

### createMountTransition

열림/닫힘 CSS 애니메이션을 위한 mount transition hook. `mounted()`로 DOM 렌더링을 제어하고, `animating()`으로 CSS 클래스를 전환한다.

```tsx
import { createMountTransition } from "@simplysm/solid";

const { mounted, animating, unmount } = createMountTransition(() => open());
```

| 반환값 | 타입 | 설명 |
|--------|------|------|
| `mounted` | `() => boolean` | DOM에 마운트 여부 |
| `animating` | `() => boolean` | 애니메이션 활성 상태 |
| `unmount` | `() => void` | 수동 언마운트 |

---

### createIMEHandler

IME(한글 등) 조합 중 `onValueChange` 호출을 지연하여 한글 입력이 끊기지 않도록 하는 hook.

---

### useRouterLink

`@solidjs/router` 기반 네비게이션 hook. Ctrl/Alt + 클릭(새 탭), Shift + 클릭(새 창)을 자동 처리한다.

```tsx
import { useRouterLink } from "@simplysm/solid";

const navigate = useRouterLink();

<List.Item onClick={navigate({ href: "/home/dashboard" })}>
  대시보드
</List.Item>

// state 전달
<List.Item onClick={navigate({ href: "/users/123", state: { from: "list" } })}>
  사용자
</List.Item>
```

---

### createAppStructure

앱 구조(라우팅, 메뉴, 권한)를 선언적으로 정의하는 유틸리티.

```tsx
import { createAppStructure, type AppStructureItem } from "@simplysm/solid";

const items: AppStructureItem<string>[] = [
  {
    code: "home",
    title: "홈",
    component: HomePage,
    perms: ["use"],
  },
  {
    code: "admin",
    title: "관리",
    children: [
      { code: "users", title: "사용자 관리", component: UsersPage, perms: ["use", "edit"] },
    ],
  },
];

const structure = createAppStructure(items, {
  modules: () => activeModules(),
  basePath: "/app",
});

// structure.routes -- 라우트 배열 (Route 컴포넌트에 전달)
// structure.usableMenus() -- 사이드바 메뉴 배열
// structure.permRecord() -- 권한 레코드 (Record<string, boolean>)
```

---

## Directives

### ripple

Material Design ripple 효과 directive. 클릭 시 물결 효과를 표시한다.

```tsx
import { ripple } from "@simplysm/solid";
// directive 등록을 위한 참조 유지
void ripple;

<button use:ripple={true}>클릭</button>
<button use:ripple={!props.disabled}>조건부 활성화</button>
```

- 내부에 ripple container를 생성하여 부모 요소에 영향 없이 동작
- `prefers-reduced-motion: reduce` 설정 시 자동 비활성화
- 단일 ripple 모드: 새 클릭 시 이전 ripple 제거

---

## Tailwind 테마

`@simplysm/solid`는 Tailwind CSS preset을 통해 다음 커스텀 테마를 제공한다.

### 시맨틱 색상

| 이름 | 기반 색상 | 용도 |
|------|-----------|------|
| `primary` | blue | 주요 액션 |
| `info` | sky | 정보 |
| `success` | green | 성공 |
| `warning` | amber | 경고 |
| `danger` | red | 위험/에러 |
| `base` | zinc | 중립 (배경, 테두리, 보조 텍스트 등) |

> `zinc-*` 직접 사용 대신 `base-*`를 사용한다.

### 커스텀 크기

| 클래스 | 설명 |
|--------|------|
| `h-field` / `size-field` | 기본 필드 높이 (`py-1` 기준) |
| `h-field-sm` / `size-field-sm` | 작은 필드 높이 (`py-0.5` 기준) |
| `h-field-lg` / `size-field-lg` | 큰 필드 높이 (`py-2` 기준) |
| `h-field-inset` / `size-field-inset` | 인셋 필드 높이 (테두리 제외) |
| `h-field-inset-sm` / `size-field-inset-sm` | 작은 인셋 필드 높이 |
| `h-field-inset-lg` / `size-field-inset-lg` | 큰 인셋 필드 높이 |

### z-index 계층

| 클래스 | 값 | 설명 |
|--------|----|------|
| `z-sidebar` | 100 | 사이드바 |
| `z-sidebar-backdrop` | 99 | 사이드바 백드롭 |
| `z-busy` | 500 | 로딩 오버레이 |
| `z-dropdown` | 1000 | 드롭다운 팝업 |
| `z-modal-backdrop` | 1999 | 모달 백드롭 |
| `z-modal` | 2000 | 모달 다이얼로그 |

### 다크 모드

Tailwind의 `class` 전략을 사용한다. `ThemeProvider`가 `<html>` 요소에 `dark` 클래스를 자동으로 토글한다.

```html
<!-- 라이트 모드 -->
<html>
<!-- 다크 모드 -->
<html class="dark">
```

### 스타일 작성 패턴

컴포넌트에서 Tailwind 클래스를 사용할 때 `clsx`로 의미 단위별 그룹핑하고, `twMerge`로 충돌을 해결한다:

```typescript
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

const baseClass = clsx(
  "inline-flex items-center",
  "px-2 py-1",
  "rounded",
  "border border-transparent",
);

const className = twMerge(baseClass, props.class);
```

---

## 데모

`solid-demo` 패키지에서 모든 컴포넌트의 실제 사용 예시를 확인할 수 있다:

```bash
pnpm dev
# http://localhost:40081 (포트는 달라질 수 있음)
```

---

## 라이선스

Apache-2.0
