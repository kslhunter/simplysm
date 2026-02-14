# Select 컴포넌트 마이그레이션 설계

Angular `sd-select` 컴포넌트를 SolidJS로 마이그레이션하는 설계 문서입니다.

## 요구사항

- 단일/다중 선택 모드
- 계층적 트리 지원
- 추가 버튼 슬롯 (Select.Button)
- children 방식 + items prop 방식 모두 지원
- 커스텀 헤더 슬롯 (Select.Header)

## 1. 컴포넌트 구조 및 API

Compound Components 패턴으로 구성합니다.

### children 방식

```tsx
<Select value={selected()} onValueChange={setSelected} renderValue={(v) => v.name}>
  <Select.Item value={item1}>{item1.name}</Select.Item>
  <Select.Item value={item2}>{item2.name}</Select.Item>
  <Select.Item value={item3}>
    {item3.name} (부모)
    <Select.Item.Children>
      <Select.Item value={item3a}>하위 1</Select.Item>
      <Select.Item value={item3b}>하위 2</Select.Item>
    </Select.Item.Children>
  </Select.Item>
  <Select.Button onClick={handleAdd}>+</Select.Button>
</Select>
```

### items prop 방식

```tsx
<Select value={selected()} onValueChange={setSelected} items={data} getChildren={(item) => item.children}>
  <Select.Header>
    <div>커스텀 헤더</div>
  </Select.Header>
  <Select.ItemTemplate>{(item, index, depth) => <>{item.name}</>}</Select.ItemTemplate>
</Select>
```

### 다중 선택

```tsx
<Select multiple value={selectedList()} onValueChange={setSelectedList} renderValue={(v) => v.name}>
  ...
</Select>
```

### 서브 컴포넌트

- `Select.Item` - 선택 가능한 아이템
- `Select.Item.Children` - 중첩 아이템 컨테이너
- `Select.Button` - 우측 추가 버튼
- `Select.Header` - 드롭다운 상단 커스텀 영역
- `Select.ItemTemplate` - items prop 사용 시 렌더 함수

## 2. Props 정의

### SelectProps (Union 타입으로 items/renderValue 강제)

```tsx
// 공통 props
interface SelectBaseProps<T> {
  value?: T | T[];
  onValueChange?: (value: T | T[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  size?: "sm" | "lg";
  inset?: boolean;
  multiDisplayDirection?: "horizontal" | "vertical";
  hideSelectAll?: boolean;
}

// items 방식: renderValue 선택적
interface SelectWithItemsProps<T> extends SelectBaseProps<T> {
  items: T[];
  getChildren?: (item: T, index: number, depth: number) => T[] | undefined;
  renderValue?: (value: T) => JSX.Element;
}

// children 방식: renderValue 필수
interface SelectWithChildrenProps<T> extends SelectBaseProps<T> {
  items?: never;
  getChildren?: never;
  renderValue: (value: T) => JSX.Element;
}

// Union으로 둘 중 하나 강제
type SelectProps<T> = SelectWithItemsProps<T> | SelectWithChildrenProps<T>;
```

### 선택된 값 표시 우선순위

1. `renderValue`가 있으면 → `renderValue` 사용
2. items 방식이면 → `ItemTemplate` 재사용
3. 둘 다 없으면 → `String(value)` 폴백

### SelectItemProps

```tsx
interface SelectItemProps<T> {
  value: T;
  disabled?: boolean;
}
```

> `hidden` prop은 불필요 - `renderValue`/`ItemTemplate`으로 직접 렌더링하므로 DOM 유지 필요 없음.
> 아이템 숨기기는 `<Show when={...}>`으로 처리.

## 3. Context 구조

기존 `List`/`ListItem`을 내부적으로 재사용합니다.

### Select 내부 구조

```tsx
<div class="select-trigger" onClick={toggleDropdown}>
  {/* 선택된 값 표시 */}
</div>
<Select.Button /> {/* 추가 버튼들 */}

<Dropdown triggerRef={...} open={open()} onOpenChange={setOpen}>
  <Select.Header />

  {/* 기존 List 컴포넌트 재사용 */}
  <List inset>
    <Select.Item value="a">옵션 A</Select.Item>
  </List>
</Dropdown>
```

### SelectContext

```tsx
interface SelectContextValue<T> {
  multiple: () => boolean;
  isSelected: (value: T) => boolean;
  toggleValue: (value: T) => void;
  closeDropdown: () => void;
}

const SelectContext = createContext<SelectContextValue<unknown>>();
export const useSelectContext = () => useContext(SelectContext);
```

### Select.Item 내부

- `ListItem`을 래핑
- `selected={isSelected(props.value)}` 전달
- `onClick`에서 `toggleValue` 호출
- 다중 선택 시 `selectedIcon`으로 체크박스 아이콘 표시

## 4. Dropdown 개선

키보드 네비게이션을 Dropdown 컴포넌트에 추가합니다.

### 팝업이 아래로 열릴 때 (direction: "down")

```
[닫힘, 트리거 포커스]
    ↓ ArrowDown
[열림, 트리거 포커스]
    ↓ ArrowDown
[열림, 첫 아이템 포커스]
    ↓ ArrowDown (List 처리)
    ↑ ArrowUp (List 처리)
[열림, 첫 아이템 포커스]
    ↓ ArrowUp
[열림, 트리거 포커스]
    ↓ ArrowUp
[닫힘]
```

### 팝업이 위로 열릴 때 (direction: "up")

```
[닫힘, 트리거 포커스]
    ↓ ArrowUp
[열림, 트리거 포커스]
    ↓ ArrowUp
[열림, 마지막 아이템 포커스]
    ↓ ArrowUp (List 처리)
    ↑ ArrowDown (List 처리)
[열림, 마지막 아이템 포커스]
    ↓ ArrowDown
[열림, 트리거 포커스]
    ↓ ArrowDown
[닫힘]
```

### 키보드 동작 요약

| 상태 | direction: down         | direction: up           |
| ---- | ----------------------- | ----------------------- |
| 열기 | ArrowDown               | ArrowUp                 |
| 진입 | ArrowDown → 첫 아이템   | ArrowUp → 마지막 아이템 |
| 탈출 | ArrowUp (첫 아이템에서) | ArrowDown (마지막에서)  |
| 닫기 | ArrowUp (트리거에서)    | ArrowDown (트리거에서)  |

> 팝업 방향으로 "들어가고", 반대 방향으로 "나오는" 직관적인 흐름

## 5. 접근성

### ARIA 속성

```tsx
// 트리거
<div
  role="combobox"
  aria-haspopup="listbox"
  aria-expanded={open()}
  aria-disabled={disabled()}
  tabIndex={disabled() ? -1 : 0}
>

// List에 role 전달
<List role="listbox">
  <Select.Item role="option" aria-selected={isSelected()} />
</List>
```

### 키보드 (List에서 상속)

- `ArrowUp/Down`: 이전/다음 아이템 포커스
- `Home/End`: 첫 번째/마지막 아이템
- `ArrowRight`: 중첩 열기 또는 첫 자식으로 이동
- `ArrowLeft`: 중첩 닫기 또는 부모로 이동
- `Space/Enter`: 아이템 선택

### 닫기 (Dropdown에서 상속)

- Escape 키
- 외부 클릭
- 스크롤

## 6. 스타일링

### Select 트리거

```tsx
// 기본
<div
  class={clsx(
    "inline-flex items-center gap-2",
    "min-w-40",
    "border border-neutral-300 dark:border-neutral-600",
    "rounded-md",
    "bg-neutral-50 dark:bg-neutral-900",
    "cursor-pointer",
    "focus-within:border-primary-500",
  )}
>
  <div class="flex-1 py-1 px-2 whitespace-nowrap">{/* 선택된 값 표시 */}</div>
  <div class="opacity-30 hover:opacity-100 pr-2">
    <IconChevronDown />
  </div>
</div>;

// size="sm"
("py-0.5 px-1.5 gap-1.5");

// size="lg"
("py-2 px-3 gap-3");

// disabled
("bg-neutral-200 dark:bg-neutral-800 cursor-default text-neutral-400");

// inset
("border-none rounded-none bg-transparent");
```

### Select.Button

```tsx
<button class={clsx(
  "px-2 border-l border-neutral-300 dark:border-neutral-600",
  "text-primary-500 font-bold",
  "hover:bg-neutral-100 dark:hover:bg-neutral-800",
)}>
```

## 7. 파일 구조

```
packages/solid/src/
├── components/
│   ├── overlay/
│   │   └── Dropdown.tsx          # 개선 (키보드 핸들링 추가)
│   └── form/
│       └── select/
│           ├── Select.tsx        # Select + Select.Button + Select.Header
│           ├── SelectContext.ts
│           └── SelectItem.tsx    # SelectItem + SelectItem.Children
└── index.ts

packages/solid-demo/src/
├── pages/
│   ├── overlay/
│   │   └── DropdownPage.tsx      # 키보드 동작 설명 섹션 추가
│   └── form/
│       └── SelectPage.tsx        # Select 데모
```

## 8. 구현 순서

1. **Dropdown 개선**
   - `Dropdown.tsx`: 키보드 핸들링 로직 구현
   - `DropdownPage.tsx`: 키보드 동작 설명 섹션 추가 (테스트 방법 안내)

2. **SelectContext 생성**
   - `multiple`, `isSelected`, `toggleValue`, `closeDropdown`

3. **Select.tsx 구현**
   - `Select` 메인 컴포넌트
   - `Select.Button` 서브 컴포넌트
   - `Select.Header` 서브 컴포넌트

4. **SelectItem.tsx 구현**
   - `SelectItem` (ListItem 래핑)
   - `SelectItem.Children` 서브 컴포넌트

5. **solid-demo에 SelectPage 추가**
   - 단일/다중 선택
   - items 방식 / children 방식
   - 계층 구조
   - Select.Button, Select.Header 활용

6. **index.ts export 추가**
