# Combobox 컴포넌트 설계

## 개요

검색 필터링, 자유 입력, 자동완성을 지원하는 범용 Combobox 컴포넌트.
Select와 별도의 독립 컴포넌트로 구현한다.

## 요구사항

- 단일 선택만 지원
- `loadItems` 비동기 함수로 데이터 로딩 (컴포넌트가 로딩 상태 관리)
- 컴포넌트 내장 디바운스 (기본 300ms, `debounceMs` prop으로 조절)
- `allowCustomValue` prop으로 자유 입력 허용 여부 제어
- Select 스타일 재사용
- 트리거 내 로딩 인디케이터 (chevron 아이콘 대체)
- 결과 없을 때 "검색 결과가 없습니다" 메시지

## 파일 구조

```
packages/solid/src/components/form-control/combobox/
├── Combobox.tsx           # 메인 컴포넌트
├── ComboboxItem.tsx       # 드롭다운 아이템
└── ComboboxContext.ts     # Context
```

## Props 인터페이스

```typescript
interface ComboboxProps<T> {
  // 값 관리
  value?: T;
  onValueChange?: (value: T | undefined) => void;

  // 데이터 로딩
  loadItems: (query: string) => Promise<T[]>;
  debounceMs?: number; // 기본값 300

  // 자유 입력
  allowCustomValue?: boolean;
  parseCustomValue?: (text: string) => T; // 문자열 → T 변환

  // 표시
  renderValue: (value: T) => JSX.Element; // 선택된 값 표시

  // 공통 (Select와 동일)
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  size?: ComponentSize;
  inset?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
}
```

## 서브 컴포넌트

### Combobox.ItemTemplate

Select.ItemTemplate과 동일한 패턴으로 드롭다운 아이템 렌더링.

```tsx
<Combobox loadItems={searchUsers} renderValue={(u) => u.name}>
  <Combobox.ItemTemplate>
    {(user) => (
      <div class="flex items-center gap-2">
        <Avatar src={user.avatar} />
        <span>{user.name}</span>
      </div>
    )}
  </Combobox.ItemTemplate>
</Combobox>
```

## 내부 상태

```typescript
const [open, setOpen] = createSignal(false); // 드롭다운 열림 여부
const [query, setQuery] = createSignal(""); // 입력된 검색어
const [items, setItems] = createSignal<T[]>([]); // 로드된 아이템 목록
const [loading, setLoading] = createSignal(false); // 로딩 중 여부
```

## UI 구조

```tsx
<div data-combobox class={containerClass}>
  {/* 트리거 영역 - Select 스타일 */}
  <div ref={triggerRef} class={triggerClass} onClick={handleTriggerClick}>
    {/* TextInput inset 모드로 입력 처리 */}
    <TextInput
      inset
      value={query()}
      onValueChange={handleInput}
      placeholder={props.placeholder}
      disabled={props.disabled}
      class="flex-1"
    />

    {/* 로딩 스피너 또는 chevron */}
    <Show when={loading()} fallback={<Icon icon={IconChevronDown} />}>
      <Icon icon={IconLoader2} class="animate-spin" />
    </Show>
  </div>

  {/* 드롭다운 */}
  <Dropdown triggerRef={() => triggerRef} open={open()} onOpenChange={setOpen}>
    <Show when={items().length > 0} fallback={<div class={noResultsClass}>검색 결과가 없습니다</div>}>
      <List inset role="listbox">
        <For each={items()}>{(item) => <ComboboxItem item={item} />}</For>
      </List>
    </Show>
  </Dropdown>
</div>
```

## 키보드 네비게이션

- `ArrowDown`: 드롭다운 열기 또는 다음 아이템으로 이동
- `ArrowUp`: 이전 아이템으로 이동
- `Enter`: 포커스된 아이템 선택, 또는 커스텀 값 입력 (allowCustomValue일 때)
- `Escape`: 드롭다운 닫기
- `Tab`: 드롭다운 닫고 포커스 이동

## 재사용 컴포넌트

- `Dropdown` - 드롭다운 UI 및 포지셔닝
- `List` - 아이템 목록 래퍼
- `TextInput` (inset) - 입력 필드, IME 처리 포함
- Select 스타일 토큰 - 트리거 스타일 일관성

## 동작 흐름

1. 트리거 클릭/포커스 → 드롭다운 열림 + `loadItems("")` 호출
2. 텍스트 입력 → 디바운스 후 `loadItems(query)` 호출
3. 아이템 선택 → `onValueChange` 호출, 드롭다운 닫힘
4. `allowCustomValue`일 때 Enter → `parseCustomValue`로 변환 후 `onValueChange` 호출
