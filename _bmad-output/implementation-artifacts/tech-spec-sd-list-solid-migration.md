---
title: 'sd-list SolidJS 마이그레이션'
slug: 'sd-list-solid-migration'
created: '2026-02-02'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - 'SolidJS'
  - '@tabler/icons-solidjs'
  - 'Tailwind CSS'
  - 'clsx'
  - 'tailwind-merge'
  - 'ripple directive'
files_to_modify:
  - 'packages/solid/src/hooks/createPropSignal.ts'
  - 'packages/solid/src/components/data/List.tsx'
  - 'packages/solid/src/components/data/ListItem.tsx'
  - 'packages/solid/src/index.ts'
  - 'packages/solid/package.json'
  - 'packages/solid/tests/hooks/createPropSignal.spec.ts'
  - 'packages/solid/tests/components/data/List.spec.tsx'
code_patterns:
  - 'ParentComponent<Props> 타입'
  - 'splitProps로 local/rest 분리'
  - 'twMerge + clsx 클래스 병합'
  - 'JSX.HTMLAttributes 확장'
  - 'open/onOpenChange controlled 패턴'
  - 'children() 헬퍼로 중첩 컴포넌트 감지'
  - 'use:ripple 디렉티브'
  - 'Component<IconProps> 아이콘 타입'
  - 'createMemo 대신 일반 함수 사용'
test_patterns:
  - 'vitest + @solidjs/testing-library'
  - 'render, screen, fireEvent'
  - '한국어 describe/it 설명'
---

# Tech-Spec: sd-list SolidJS 마이그레이션

**Created:** 2026-02-02

## Overview

### Problem Statement

Angular 기반 `sd-list`, `sd-list-item` 컴포넌트를 SolidJS 패키지로 마이그레이션해야 함. 리스트는 아코디언 레이아웃, 중첩 리스트, 선택 상태 등을 지원하는 네비게이션/데이터 표시용 컴포넌트임.

### Solution

기존 SolidJS 패턴(`Collapse`, `Button`)을 따라 `List`, `ListItem` 컴포넌트 구현. collapse-icon은 `@tabler/icons-solidjs`의 `IconChevronDown`으로 대체하고 rotation 애니메이션 적용.

### Scope

**In Scope:**
- `createPropSignal` hook (`hooks/createPropSignal.ts`) - controlled/uncontrolled 패턴 재사용
- `List.tsx` 컴포넌트 (`inset` prop)
- `ListItem.tsx` 컴포넌트
  - `open` / `onOpenChange`: controlled 패턴 (uncontrolled도 지원, `defaultOpen` prop 없이)
  - `selected`: 선택된 상태 (배경 강조, 볼드)
  - `readonly`: 클릭 비활성화, 일반 색상 유지
  - `disabled`: 사용 불가, 흐려짐 (opacity)
  - `selectedIcon`: `@tabler/icons-solidjs` 컴포넌트 타입
  - 중첩 `<List>` 감지 및 collapse 동작
  - ripple 디렉티브 적용
- collapse-icon: `IconChevronDown` + rotation 애니메이션
- Tailwind CSS 스타일링
- `index.ts` export 추가
- 컴포넌트 테스트

**Out of Scope:**
- `toolTpl` (tool slot) 기능
- 별도의 `CollapseIcon` 컴포넌트 (ListItem 내부에서만 사용)
- `contentClass`, `contentStyle` props

## Context for Development

### Codebase Patterns

**컴포넌트 구조 패턴 (Button.tsx 참조):**
```tsx
import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { ripple } from "../../directives/ripple";

void ripple; // 디렉티브 사용 선언

export interface ListProps extends JSX.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

export const List: ParentComponent<ListProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "inset"]);
  // ...
};
```

**createPropSignal hook (Controlled/Uncontrolled 패턴):**
```tsx
// hooks/createPropSignal.ts
import { createSignal } from "solid-js";

// T가 함수 타입이면 never로 변환 (컴파일 타임 제한)
type NotFunction<T> = T extends (...args: any[]) => any ? never : T;

export function createPropSignal<T>(options: {
  value: () => T & NotFunction<T>;
  onChange: () => ((value: T) => void) | undefined;
}) {
  const [internalValue, setInternalValue] = createSignal<T>(options.value());

  const isControlled = () => options.onChange() !== undefined;
  const value = () => isControlled() ? options.value() : internalValue();
  const setValue = (newValue: T | ((prev: T) => T)) => {
    const resolved = typeof newValue === 'function'
      ? (newValue as (prev: T) => T)(value())
      : newValue;

    if (isControlled()) {
      options.onChange()?.(resolved);
    } else {
      setInternalValue(() => resolved);
    }
  };

  return [value, setValue] as const;
}

// 사용
const [open, setOpen] = createPropSignal({
  value: () => local.open ?? false,
  onChange: () => local.onOpenChange,
});
setOpen(v => !v); // 함수도 지원
```

**중첩 컴포넌트 감지 패턴 (SolidJS 방식):**
```tsx
// SolidJS: 컴포넌트가 한 번만 실행되므로 createMemo 대신 일반 함수 사용
const resolved = children(() => local.children);

// 그냥 함수로 정의 - signal 의존성 자동 추적
const nestedList = () =>
  resolved.toArray().find(c => c instanceof HTMLElement && c.dataset.list !== undefined);

const content = () =>
  resolved.toArray().filter(c => !(c instanceof HTMLElement && c.dataset.list !== undefined));

const hasChildren = () => nestedList() !== undefined;
```

**@tabler/icons-solidjs 사용:**
```tsx
import { IconChevronDown, type IconProps } from "@tabler/icons-solidjs";
import { type Component } from "solid-js";

interface Props {
  selectedIcon?: Component<IconProps>;
}

// 사용
<Show when={local.selectedIcon}>
  {local.selectedIcon?.({ class: "..." })}
</Show>
```

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `.legacy-packages/sd-angular/src/ui/data/list/sd-list.control.ts` | Angular 원본 List |
| `.legacy-packages/sd-angular/src/ui/data/list/sd-list-item.control.ts` | Angular 원본 ListItem |
| `packages/solid/src/components/disclosure/Collapse.tsx` | 기존 Collapse 컴포넌트 |
| `packages/solid/src/components/controls/Button.tsx` | 컴포넌트 구조, ripple 패턴 |
| `packages/solid/src/directives/ripple.ts` | ripple 디렉티브 구현 |
| `.back/260201/solid/src/components/data/list/list.tsx` | 이전 구현 참조 (키보드 네비게이션) |
| `.back/260201/solid/src/components/data/list/list-item.tsx` | 이전 구현 참조 (아이콘, controlled 패턴) |

### Technical Decisions

1. **createPropSignal hook**: controlled/uncontrolled 패턴 재사용, `onOpenChange` 유무로 모드 결정
2. **중첩 리스트 감지**: `data-list` 속성으로 List 컴포넌트 식별
3. **Collapse Icon**: `IconChevronDown` 사용
   - 크기: 텍스트 크기에 맞춤 (`size={16}` 또는 `class="w-4 h-4"`)
   - 닫힌 상태: `rotate-0` (v, 아래 가리킴)
   - 열린 상태: `rotate-90` (<, 왼쪽 가리킴)
   - `transition-transform duration-200 motion-reduce:transition-none`
4. **selectedIcon 타입**: `Component<IconProps>` - Tabler 아이콘 컴포넌트 직접 전달
   - 위치: 레이블 왼쪽에 배치
   - 크기: 텍스트 크기에 맞춤 (`class="w-4 h-4"`)
   - `selected={true}`: primary 색상
   - `selected={false}`: 투명한 색상 (`text-black/30 dark:text-white/30`)
5. **createMemo 사용 금지**: SolidJS는 컴포넌트가 한 번만 실행되므로 일반 함수로 충분
6. **키보드 접근성**:
   - `role="tree"` (List), `role="treeitem"` (ListItem)
   - ArrowUp/Down: 이전/다음 항목 포커스
   - ArrowRight: 닫혀있으면 열기, 열려있으면 첫 자식으로
   - ArrowLeft: 열려있으면 닫기, 닫혀있으면 부모로
   - Home/End: 첫/마지막 항목
   - Space/Enter: 토글

## Implementation Plan

### Tasks

- [x] **Task 1: 의존성 추가**
  - File: `packages/solid/package.json`
  - Action: `dependencies`에 `@tabler/icons-solidjs` 추가
  - Notes: 추가 후 `pnpm install` 실행 필요

- [x] **Task 2: createPropSignal hook 생성**
  - File: `packages/solid/src/hooks/createPropSignal.ts`
  - Action: controlled/uncontrolled 패턴 hook 구현
  - Notes:
    - `onOpenChange` 유무로 controlled 모드 결정
    - 함수형 setter 지원 `setValue(v => !v)`
    - 제네릭 타입 `<T>` 지원
    - `NotFunction<T>` 타입으로 함수 타입 제한 (컴파일 타임 에러)
    - 함수를 저장해야 할 경우 객체로 감싸기: `createPropSignal<{ fn: () => void }>(...)`

- [x] **Task 3: List 컴포넌트 생성**
  - File: `packages/solid/src/components/data/List.tsx`
  - Action: List 컨테이너 컴포넌트 구현
  - Notes:
    - `inset` prop (투명 배경)
    - `data-list` 속성 추가 (중첩 감지용)
    - `role="tree"` 접근성 (최상위), 중첩 List는 `role="group"`
    - 키보드 네비게이션 (ArrowUp/Down/Left/Right, Home/End, Space/Enter)
    - Roving tabindex 패턴: 현재 포커스된 항목만 `tabindex="0"`, 나머지는 `tabindex="-1"`
    - Context로 `level` 전달하여 ListItem의 `aria-level` 계산 (최상위=1)

- [x] **Task 4: ListItem 컴포넌트 생성**
  - File: `packages/solid/src/components/data/ListItem.tsx`
  - Action: ListItem 컴포넌트 구현
  - Notes:
    - Props: `open`, `onOpenChange`, `selected`, `readonly`, `disabled`, `selectedIcon`, `onClick`
    - `createPropSignal` hook 사용
    - `children()` 헬퍼로 중첩 List 감지
    - `Collapse` 컴포넌트로 중첩 리스트 표시
    - `IconChevronDown` + rotation 애니메이션
    - `use:ripple` 디렉티브
    - 헤더 영역은 `<button>` 요소 사용 (기본 키보드/포커스 지원)
    - `focus-visible` 스타일은 `hover`와 동일하게 적용
    - 패딩은 Button과 동일 (`py-1 px-1.5`)
    - 중첩 indent: `aria-level`에 따라 `pl-*` 계산 (예: level 1 = `pl-1.5`, level 2 = `pl-6`, level 3 = `pl-10.5` ...)
    - `role="treeitem"`, `aria-expanded`, `aria-disabled`, `aria-selected`, `aria-level`

- [x] **Task 5: Export 추가**
  - File: `packages/solid/src/index.ts`
  - Action: List, ListItem, createPropSignal export 추가

- [x] **Task 6: createPropSignal 테스트 작성**
  - File: `packages/solid/tests/hooks/createPropSignal.spec.ts`
  - Action: hook 단위 테스트 작성
  - Notes: controlled/uncontrolled 모드, 함수형 setter 테스트

- [x] **Task 7: List/ListItem 테스트 작성**
  - File: `packages/solid/tests/components/data/List.spec.tsx`
  - Action: 컴포넌트 테스트 작성
  - Notes: 렌더링, 중첩 리스트, 키보드 네비게이션, 상태 스타일 테스트

### Acceptance Criteria

**createPropSignal hook:**
- [ ] **AC 1**: Given `onOpenChange`가 제공될 때, when `setValue` 호출, then `onOpenChange`가 호출되고 내부 상태는 변경되지 않음
- [ ] **AC 2**: Given `onOpenChange`가 없을 때, when `setValue` 호출, then 내부 상태가 변경됨
- [ ] **AC 3**: Given `setValue`에 함수를 전달할 때, when 호출, then 이전 값을 인자로 받아 새 값 계산
- [ ] **AC 3-1**: Given `T`가 함수 타입일 때, when `createPropSignal` 호출, then 컴파일 타임 에러 발생 (타입 레벨 검증, `pnpm typecheck`로 확인)

**List 컴포넌트:**
- [ ] **AC 4**: Given List가 렌더링될 때, when `inset={true}`, then 투명 배경 스타일 적용
- [ ] **AC 5**: Given List가 렌더링될 때, when 키보드 ArrowDown, then 다음 항목으로 포커스 이동
- [ ] **AC 6**: Given List가 렌더링될 때, when 키보드 ArrowUp, then 이전 항목으로 포커스 이동
- [ ] **AC 7**: Given List가 렌더링될 때, when 키보드 Home/End, then 첫/마지막 항목으로 포커스 이동
- [ ] **AC 8**: Given List가 렌더링될 때, when 키보드 ArrowRight (닫힌 항목), then 열기
- [ ] **AC 9**: Given List가 렌더링될 때, when 키보드 ArrowRight (열린 항목), then 첫 자식으로 포커스 이동
- [ ] **AC 10**: Given List가 렌더링될 때, when 키보드 ArrowLeft (열린 항목), then 닫기
- [ ] **AC 11**: Given List가 렌더링될 때, when 키보드 ArrowLeft (닫힌 항목), then 부모로 포커스 이동
- [ ] **AC 12**: Given List가 렌더링될 때, when 키보드 Space/Enter, then 현재 항목 토글

**ListItem 컴포넌트:**
- [ ] **AC 13**: Given ListItem에 중첩 List가 있을 때, when 클릭, then collapse 토글 및 `IconChevronDown` 회전 애니메이션
- [ ] **AC 14**: Given `selected={true}`일 때, when 렌더링, then 배경 강조 및 볼드 스타일 적용
- [ ] **AC 15**: Given `readonly={true}`일 때, when 클릭, then 아무 동작 없음 (일반 색상 유지)
- [ ] **AC 16**: Given `disabled={true}`일 때, when 렌더링, then opacity 낮아지고 클릭 불가, `tabindex="-1"` 적용
- [ ] **AC 17**: Given `selectedIcon`이 제공되고 중첩 List가 없을 때, when `selected={true}`, then primary 색상 아이콘 표시
- [ ] **AC 18**: Given `selectedIcon`이 제공되고 중첩 List가 없을 때, when `selected={false}`, then 투명한 색상 아이콘 표시
- [ ] **AC 19**: Given `selectedIcon`이 제공되고 중첩 List가 있을 때, when 렌더링, then 아이콘 숨김
- [ ] **AC 20**: Given ListItem이 렌더링될 때, when `readonly`/`disabled` 아닐 때, then ripple 효과 적용 (`use:ripple={!(local.readonly || local.disabled)}`)
- [ ] **AC 21**: Given ListItem에 중첩 List가 없고 `onClick`이 제공될 때, when 클릭, then `onClick` 핸들러 호출
- [ ] **AC 22**: Given ListItem에 중첩 List가 없을 때, when 렌더링, then chevron(`IconChevronDown`) 숨김

## Additional Context

### Dependencies

- `@tabler/icons-solidjs`: 아이콘 컴포넌트 (package.json에 추가 필요)
- 기존 의존성: `solid-js`, `clsx`, `tailwind-merge` (이미 설치됨)

### Testing Strategy

**Hook 테스트:**
- 파일: `packages/solid/tests/hooks/createPropSignal.spec.ts`
- 프로젝트: `solid` (`pnpm vitest --project=solid`)
- 커버리지: controlled/uncontrolled 모드, 함수형 setter

**컴포넌트 테스트 (vitest + @solidjs/testing-library):**
- 파일: `packages/solid/tests/components/data/List.spec.tsx`
- 실행: `pnpm vitest --project=solid`
- 커버리지: 렌더링, 키보드 네비게이션, 중첩 리스트, controlled/uncontrolled, 상태 스타일

### Notes

- Chrome 84+ 지원 필수
- CSS `aspect-ratio`, `inset`, `:is()`, `:where()` 사용 금지 (Chrome 88+)
- `em` 단위 사용 금지, `rem` 단위로 통일
- `data-list` 속성으로 List 컴포넌트 식별 (중첩 감지용)
- SolidJS: `createMemo` 대부분 불필요 → 그냥 함수로 충분

## Review Notes

**1차 Adversarial Review:**
- Findings: 12개 총, 5개 수정, 7개 무시
- 주요 변경사항:
  - ArrowRight/ArrowLeft AC 추가
  - selectedIcon selected 상태별 스타일 추가
  - Space/Enter AC 추가
  - `layout` prop 제거 (accordion만 유지)
  - createPropSignal 테스트 프로젝트 `solid` 명시

**2차 Adversarial Review:**
- Findings: 10개 총, 5개 수정, 5개 무시
- 주요 변경사항:
  - ArrowUp AC 추가
  - selectedIcon + hasChildren 조건 AC 추가
  - rotation 애니메이션에 `motion-reduce:transition-none` 적용
  - disabled일 때 `tabindex="-1"` 명시
  - Out of Scope에 `contentClass`, `contentStyle` 추가

**3차 Adversarial Review:**
- Findings: 10개 총, 6개 수정, 4개 무시
- 주요 변경사항:
  - `NotFunction<T>` 타입으로 함수 타입 제한 (컴파일 타임 에러)
  - selectedIcon 위치: 레이블 왼쪽
  - ripple 조건부 적용 패턴 명시
  - `aria-selected` 추가
  - 헤더 영역 `<button>` 요소 사용
  - Roving tabindex 패턴 명시

**4차 Adversarial Review:**
- Findings: 10개 총, 8개 수정, 2개 무시
- 주요 변경사항:
  - `onClick` prop 추가 (중첩 List 없을 때)
  - 중첩 List 없으면 chevron 숨김 AC 추가
  - `aria-level` 추가, 중첩 List는 `role="group"`
  - `focus-visible` 스타일은 hover와 동일
  - 아이콘 크기 텍스트에 맞춤 (`w-4 h-4`)
  - Dark mode 색상 지원
  - 패딩 Button과 동일, indent는 aria-level 기반
  - AC 3-1 타입 레벨 검증 명시
