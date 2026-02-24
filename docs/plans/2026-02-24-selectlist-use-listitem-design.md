# SelectList 내부 `<button>` → `List.Item` 교체

## 목표

`SelectList.tsx`에서 수동으로 구현된 `<button>` 아이템들을 `List.Item` 컴포넌트로 교체하여 코드 중복을 제거한다.

## 변경 파일

- `packages/solid/src/components/form-control/select-list/SelectList.tsx`

## 변경 내용

### 1. import 제거

- `listItemBaseClass`, `listItemSelectedClass`, `listItemContentClass`, `listItemDisabledClass` (from `ListItem.styles`)
- `ripple` (from `../../../directives/ripple`)
- `void ripple` 문

### 2. "미지정" 항목

`<button>` → `<List.Item>`으로 교체:

```tsx
<List.Item
  selected={local.value === undefined}
  disabled={local.disabled}
  onClick={() => handleSelect(undefined)}
>
  <span class={textMuted}>미지정</span>
</List.Item>
```

### 3. 일반 아이템

`<button>` → `<List.Item>`으로 교체:

```tsx
<List.Item
  selected={item === local.value}
  disabled={local.disabled}
  onClick={() => handleSelect(item)}
>
  {renderItem(item, index())}
</List.Item>
```

## 근거

`List.Item`이 내부적으로 ripple, `data-list-item`, `role="treeitem"`, `aria-*`, `tabIndex`, `listItemContentClass` wrapping을 전부 처리하므로 수동 코드가 불필요하다.
