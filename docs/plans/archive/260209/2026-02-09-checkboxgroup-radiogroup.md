# CheckBoxGroup / RadioGroup 설계

> 작성일: 2026-02-09

## 개요

Angular의 `sd-checkbox-group` / `sd-checkbox-group-item`을 SolidJS로 마이그레이션.
동일 패턴으로 RadioGroup도 함께 구현.

## 구조

- `CheckBoxGroup` + `CheckBoxGroup.Item` — 다중 선택, `value: T[]`
- `RadioGroup` + `RadioGroup.Item` — 단일 선택, `value: T`
- 각각 독립 compound component (CheckBox/Radio의 서브 컴포넌트가 아님)
- Item 내부에서 기존 `<CheckBox>` / `<Radio>` 컴포넌트를 재사용

## API

### CheckBoxGroup

```tsx
<CheckBoxGroup
  value={selectedFruits()}
  onValueChange={setSelectedFruits}
  disabled={false}
  size="sm"
  theme="primary"
  inline
  inset
  class="gap-4"
>
  <CheckBoxGroup.Item value="apple">사과</CheckBoxGroup.Item>
  <CheckBoxGroup.Item value="banana">바나나</CheckBoxGroup.Item>
  <CheckBoxGroup.Item value="cherry" disabled>
    체리
  </CheckBoxGroup.Item>
</CheckBoxGroup>
```

**CheckBoxGroup Props:**
| Prop | Type | 설명 |
|------|------|------|
| `value` | `T[]` | 선택된 값 배열 |
| `onValueChange` | `(v: T[]) => void` | 값 변경 콜백 |
| `disabled` | `boolean` | 전체 비활성화 |
| `size` | `CheckBoxSize` | 내부 CheckBox 기본 크기 |
| `theme` | `CheckBoxTheme` | 내부 CheckBox 기본 테마 |
| `inline` | `boolean` | 내부 CheckBox 기본 inline |
| `inset` | `boolean` | 내부 CheckBox 기본 inset |
| `class` | `string` | 컨테이너 클래스 |
| `children` | `JSX.Element` | CheckBoxGroup.Item들 |

**CheckBoxGroup.Item Props:**
| Prop | Type | 설명 |
|------|------|------|
| `value` | `T` (required) | 이 항목의 값 |
| `disabled` | `boolean` | 개별 비활성화 |
| `children` | `JSX.Element` | 라벨 |

### RadioGroup

동일 구조, 차이점:

- `value: T` (단일 값)
- `onValueChange: (v: T) => void`
- Item 내부에서 `<Radio>` 렌더링

## 내부 구현

### Context 기반 부모-자식 통신

```tsx
interface CheckBoxGroupContext<T> {
  value: () => T[];
  toggle: (item: T) => void;
  disabled: () => boolean;
  size: () => CheckBoxSize | undefined;
  theme: () => CheckBoxTheme | undefined;
  inline: () => boolean;
  inset: () => boolean;
}
```

- `CheckBoxGroup`: `createContext`로 Context 제공. `createPropSignal`로 `value` 관리
- `CheckBoxGroup.Item`: `useContext`로 Context 읽기. `<CheckBox value={selected()} onValueChange={() => ctx.toggle(props.value)}>`

### RadioGroup Context

```tsx
interface RadioGroupContext<T> {
  value: () => T | undefined;
  select: (item: T) => void;
  disabled: () => boolean;
  size: () => CheckBoxSize | undefined;
  theme: () => CheckBoxTheme | undefined;
  inline: () => boolean;
  inset: () => boolean;
}
```

## 레이아웃

- 그룹 컨테이너: `inline-flex` 기본
- 배치(방향, gap 등)는 사용자가 `class` prop으로 직접 조절
- 그룹의 `size`, `theme`, `inline`, `inset`은 내부 CheckBox/Radio의 기본값으로 작동
- Item에서 개별 override 불가 (그룹 설정을 따름, disabled만 Item 레벨 override)

## 파일 구조

```
packages/solid/src/components/form-control/checkbox/
  CheckBox.tsx          (기존)
  CheckBox.styles.ts    (기존)
  Radio.tsx             (기존)
  CheckBoxGroup.tsx     (신규)
  RadioGroup.tsx        (신규)
```

## index.ts export

```tsx
export { CheckBoxGroup } from "./components/form-control/checkbox/CheckBoxGroup";
export { RadioGroup } from "./components/form-control/checkbox/RadioGroup";
```

서브 컴포넌트는 부모를 통해서만 접근 (`CheckBoxGroup.Item`, `RadioGroup.Item`).
