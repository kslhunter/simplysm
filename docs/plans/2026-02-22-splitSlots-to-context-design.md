# splitSlots → Context 등록 패턴 전환 설계

## 목표

`splitSlots` (DOM `data-*` 속성 기반 슬롯 분리) → 컴포넌트별 Context 등록 패턴으로 전환.
외부 API 변경 없이 내부 구현만 교체.

## 배경

- `splitSlots`는 SolidJS 생태계에서 사용하지 않는 비표준 패턴
- DOM `data-*` + `instanceof HTMLElement` 검사에 의존하여 취약
- 불필요한 wrapper 요소 생성 (`<div data-dialog-header>` 등)
- 주요 라이브러리(Kobalte, Radix, Ark UI)는 모두 Context 기반 compound component 사용

## 설계 원칙

- **UI 요소 → compound sub-component, 비렌더링 설정 → props** (업계 표준)
- **컴포넌트별 전용 Context** (공유 헬퍼 없음 — Kobalte/Radix 표준)
- 기존 Context가 있는 컴포넌트는 거기에 슬롯 signal 추가
- 기존 Context가 없는 컴포넌트만 새 Context 생성

## 구현 패턴

서브 컴포넌트가 Context에 content를 등록하고 `null` 반환:

```tsx
// 서브 컴포넌트
const DialogHeader: ParentComponent = (props) => {
  const ctx = useContext(DialogSlotsContext)!;
  ctx.setHeader(() => props.children);
  onCleanup(() => ctx.setHeader(undefined));
  return null;
};

// 부모에서 렌더링
<Show when={slots.header()}>
  <h5 class="flex-1 px-4 py-2 text-sm font-bold">{slots.header()}</h5>
</Show>
```

기존 wrapper 요소(`<h5 data-dialog-header>` 등)는 제거되고, 부모가 직접 렌더링.

## 대상 컴포넌트

| 컴포넌트 | 슬롯 | Context 처리 |
|----------|------|-------------|
| Dialog | `header`, `action` | 새 DialogSlotsContext 생성 |
| Dropdown | `trigger`, `content` | 기존 DropdownContext에 추가 |
| Select | `header`, `action`, `itemTemplate` | 기존 SelectContext에 추가 |
| SelectItem | `children` | 기존 SelectContext에 추가 또는 자체 Context |
| Combobox | `itemTemplate` | 기존 ComboboxContext에 추가 |
| TextInput | `prefix` | 새 TextInputContext 생성 |
| NumberInput | `prefix` | 새 NumberInputContext 생성 |
| Kanban.Lane | `title`, `tools` | 기존 KanbanLaneContext에 추가 |
| ListItem | `children` | 기존 ListContext에 추가 또는 자체 Context |

## 삭제 대상

- `packages/solid/src/helpers/splitSlots.ts`
- `packages/solid/tests/helpers/splitSlots.spec.tsx`
- `index.ts`에서 `splitSlots` export 제거
- 각 서브 컴포넌트의 `data-*` wrapper 요소 제거

## 마이그레이션 순서

1. TextInput, NumberInput (슬롯 1개, Context 없음 — 가장 단순)
2. Dialog (슬롯 2개, Context 없음)
3. ListItem, SelectItem (구조적 children)
4. Dropdown, Select, Combobox, Kanban.Lane (기존 Context 확장)
5. `splitSlots` 헬퍼 및 테스트 삭제

## 테스트

- 기존 컴포넌트 테스트 통과 확인 (외부 API 불변)
- `splitSlots.spec.tsx` 삭제
- 데모 페이지 육안 확인
