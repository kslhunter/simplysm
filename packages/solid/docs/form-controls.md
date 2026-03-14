# 폼 컨트롤

## Button

```tsx
import { Button } from "@simplysm/solid";

<Button theme="primary" variant="solid" size="md" onClick={handleClick}>
  저장
</Button>
<Button variant="outline" disabled>취소</Button>
<Button variant="ghost" inset>아이콘 버튼</Button>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `theme` | `"base" \| "primary" \| "success" \| "warning" \| "danger"` | `"base"` | 색상 테마 |
| `variant` | `"solid" \| "outline" \| "ghost"` | `"solid"` | 스타일 변형 |
| `size` | `ComponentSize` | `"md"` | 크기 |
| `inset` | `boolean` | `false` | 테두리 없음 |
| `disabled` | `boolean` | `false` | 비활성화 |

---

## TextInput

```tsx
import { TextInput } from "@simplysm/solid";

<TextInput value={name()} onValueChange={setName} placeholder="이름 입력" />

// 접두사 슬롯
<TextInput value={phone()} onValueChange={setPhone} format="XXX-XXXX-XXXX">
  <TextInput.Prefix>+82</TextInput.Prefix>
</TextInput>
```

| Prop | 타입 | 설명 |
|------|------|------|
| `value` | `string` | 값 |
| `onValueChange` | `(v: string) => void` | 변경 콜백 |
| `type` | `"text" \| "password" \| "email"` | 입력 타입 |
| `format` | `string` | 형식 마스크 (예: `"XXX-XXXX-XXXX"`) |
| `size`, `inset`, `disabled`, `readOnly`, `required` | | 공통 |
| `minLength`, `maxLength`, `pattern` | | 유효성 |
| `validate` | `(v: string) => string \| undefined` | 커스텀 유효성 |
| `lazyValidation` | `boolean` | blur 시 검증 |

---

## NumberInput

```tsx
<NumberInput value={amount()} onValueChange={setAmount} min={0} max={100} />
<NumberInput value={price()} onValueChange={setPrice} useGrouping minimumFractionDigits={2} />
```

| Prop | 타입 | 설명 |
|------|------|------|
| `value` | `number` | 값 |
| `onValueChange` | `(v: number \| undefined) => void` | 변경 콜백 |
| `useGrouping` | `boolean` | 천단위 구분자 (기본: true) |
| `minimumFractionDigits` | `number` | 최소 소수점 자릿수 |
| `min`, `max` | `number` | 범위 |

---

## Textarea

```tsx
<Textarea value={memo()} onValueChange={setMemo} minRows={3} />
```

Alt+Enter로 줄바꿈. `minRows`로 최소 높이 설정.

---

## DatePicker

```tsx
import { DatePicker } from "@simplysm/solid";

<DatePicker value={date()} onValueChange={setDate} />
<DatePicker value={month()} onValueChange={setMonth} unit="month" />
<DatePicker value={year()} onValueChange={setYear} unit="year" />
```

| Prop | 타입 | 설명 |
|------|------|------|
| `value` | `DateOnly` | 값 |
| `onValueChange` | `(v: DateOnly \| undefined) => void` | 변경 콜백 |
| `unit` | `"year" \| "month" \| "date"` | 선택 단위 (기본: `"date"`) |
| `min`, `max` | `DateOnly` | 범위 제한 |

---

## DateTimePicker

```tsx
<DateTimePicker value={dt()} onValueChange={setDt} unit="minute" />
```

`unit`: `"minute"` (기본) 또는 `"second"`

---

## TimePicker

```tsx
<TimePicker value={time()} onValueChange={setTime} />
```

---

## DateRangePicker

기간 유형(일/월/범위) 선택과 시작/종료일 입력을 조합한 날짜 범위 선택기.

```tsx
import { DateRangePicker, type DateRangePeriodType } from "@simplysm/solid";

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
  required
/>
```

| Prop | 타입 | 설명 |
|------|------|------|
| `periodType` | `"day" \| "month" \| "range"` | 기간 유형 |
| `onPeriodTypeChange` | `(v: DateRangePeriodType) => void` | 기간 유형 변경 콜백 |
| `from` | `DateOnly` | 시작일 |
| `onFromChange` | `(v: DateOnly \| undefined) => void` | 시작일 변경 콜백 |
| `to` | `DateOnly` | 종료일 |
| `onToChange` | `(v: DateOnly \| undefined) => void` | 종료일 변경 콜백 |

기간 유형에 따라 자동으로 from/to를 조정한다:
- `"day"`: from = to (동일)
- `"month"`: from = 월 첫째 날, to = 월 마지막 날
- `"range"`: 시작일/종료일 독립 선택

---

## Checkbox / Radio

```tsx
<Checkbox checked={active()} onCheckedChange={setActive}>활성</Checkbox>
<Checkbox checked={agreed()} onCheckedChange={setAgreed} required>약관 동의</Checkbox>

<RadioGroup value={role()} onValueChange={setRole}>
  <Radio value="admin">관리자</Radio>
  <Radio value="user">사용자</Radio>
</RadioGroup>
```

---

## CheckboxGroup

다중 선택을 위한 체크박스 그룹.

```tsx
import { CheckboxGroup } from "@simplysm/solid";

const [selectedTags, setSelectedTags] = createSignal<string[]>([]);

<CheckboxGroup value={selectedTags()} onValueChange={setSelectedTags} required>
  <CheckboxGroup.Item value="frontend">프론트엔드</CheckboxGroup.Item>
  <CheckboxGroup.Item value="backend">백엔드</CheckboxGroup.Item>
  <CheckboxGroup.Item value="devops">DevOps</CheckboxGroup.Item>
</CheckboxGroup>
```

| Prop | 타입 | 설명 |
|------|------|------|
| `value` | `TValue[]` | 선택된 값 배열 |
| `onValueChange` | `(v: TValue[]) => void` | 변경 콜백 |
| `disabled` | `boolean` | 비활성화 |
| `inline` | `boolean` | 가로 배치 |
| `inset` | `boolean` | 테두리 없음 |
| `required` | `boolean` | 최소 1개 선택 필수 |
| `validate` | `(v: TValue[]) => string \| undefined` | 커스텀 유효성 |

---

## Select

```tsx
// 단일 선택 (items 모드)
<Select
  value={selected()}
  onValueChange={setSelected}
  items={options}
  renderValue={(item) => <span>{item.label}</span>}
  itemSearchText={(item) => item.label}
/>

// 다중 선택
<Select
  multiple
  value={selectedList()}
  onValueChange={setSelectedList}
  items={options}
  renderValue={(item) => <span>{item.label}</span>}
  tagDirection="horizontal"
/>

// 트리 구조
<Select
  value={selected()}
  onValueChange={setSelected}
  items={categories}
  itemChildren={(item) => item.children}
  renderValue={(item) => <span>{item.name}</span>}
/>

// Children 모드
<Select value={v()} onValueChange={setV}>
  <Select.Item value="a">옵션 A</Select.Item>
  <Select.Item value="b">옵션 B</Select.Item>
  <Select.Header>그룹 헤더</Select.Header>
</Select>

// ItemTemplate (items 모드에서 드롭다운 렌더링 커스터마이징)
<Select items={users} renderValue={(u) => <span>{u.name}</span>}>
  <Select.ItemTemplate>
    {(item, _index, _depth) => <span>{item.name} ({item.email})</span>}
  </Select.ItemTemplate>
</Select>

// Action (드롭다운 하단 커스텀 액션)
<Select items={users} renderValue={(u) => <span>{u.name}</span>}>
  <Select.Action onClick={handleSearch}>
    <Icon icon={IconSearch} />
  </Select.Action>
</Select>
```

---

## Combobox

```tsx
<Combobox
  value={user()}
  onValueChange={setUser}
  loadItems={async (query) => await searchUsers(query)}
  renderValue={(u) => <span>{u.name}</span>}
  debounceMs={300}
/>

// 커스텀 값 허용
<Combobox
  allowsCustomValue
  parseCustomValue={(text) => ({ id: 0, name: text })}
  loadItems={loadItems}
  renderValue={(v) => <span>{v.name}</span>}
/>
```

---

## ColorPicker

```tsx
<ColorPicker value={color()} onValueChange={setColor} />
// value: "#RRGGBB" 형식
```

---

## RichTextEditor

Tiptap 기반 리치 텍스트 에디터. 서식, 텍스트 스타일, 정렬, 테이블, 이미지, 하이라이트 도구 포함.

```tsx
<RichTextEditor value={html()} onValueChange={setHtml} />
```

---

## Numpad

터치 환경용 숫자 키패드 컴포넌트.

```tsx
import { Numpad } from "@simplysm/solid";

<Numpad value={quantity()} onValueChange={setQuantity} />

// Enter 버튼 + 마이너스 버튼 포함
<Numpad
  value={amount()}
  onValueChange={setAmount}
  withEnterButton
  withMinusButton
  onEnterButtonClick={() => submit()}
  required
/>

// 직접 입력 비활성화 (키패드만 사용)
<Numpad value={code()} onValueChange={setCode} inputDisabled />
```

| Prop | 타입 | 설명 |
|------|------|------|
| `value` | `number` | 값 |
| `onValueChange` | `(v: number \| undefined) => void` | 변경 콜백 |
| `withEnterButton` | `boolean` | Enter 버튼 표시 |
| `withMinusButton` | `boolean` | 마이너스 토글 버튼 표시 |
| `onEnterButtonClick` | `() => void` | Enter 버튼 클릭 콜백 |
| `inputDisabled` | `boolean` | NumberInput 직접 입력 비활성화 |
| `required` | `boolean` | 필수 입력 |
| `size` | `ComponentSize` | 크기 |

---

## StatePreset

필터/설정 상태를 프리셋으로 저장하고 복원하는 컴포넌트. localStorage에 자동 저장된다.

```tsx
import { StatePreset } from "@simplysm/solid";

const [filterState, setFilterState] = createSignal({ status: "active", keyword: "" });

<StatePreset
  storageKey="user-list-filter"
  value={filterState()}
  onValueChange={setFilterState}
/>
```

| Prop | 타입 | 설명 |
|------|------|------|
| `storageKey` | `string` | localStorage 저장 키 |
| `value` | `TValue` | 현재 상태 값 |
| `onValueChange` | `(v: TValue) => void` | 상태 복원 콜백 |
| `size` | `ComponentSize` | 크기 |

프리셋 칩 UI를 제공하며, 클릭으로 복원, 저장(덮어쓰기), 삭제가 가능하다. 삭제/덮어쓰기 시 실행 취소 알림을 표시한다.

---

## ThemeToggle

라이트/다크/시스템 모드 전환 버튼.

```tsx
<ThemeToggle />
```

---

## 유효성 검증

모든 폼 컨트롤은 `validate`, `required`, `lazyValidation` prop을 지원한다.

```tsx
<TextInput
  value={email()}
  onValueChange={setEmail}
  required
  validate={(v) => v.includes("@") ? undefined : "이메일 형식이 아닙니다"}
  lazyValidation  // blur 시 검증
/>
```

`Invalid` 컴포넌트로 검증 에러를 감싸서 표시할 수 있다.
