---
title: 'Solid Field 컴포넌트 중복 코드 리팩토링'
slug: 'solid-field-refactoring'
created: '2026-02-01'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - SolidJS (createSignal, splitProps, Show)
  - TypeScript (strict mode)
  - vanilla-extract (recipe, style)
  - Vitest + @solidjs/testing-library
files_to_modify:
  - packages/solid/src/hooks/createFieldState.ts (신규)
  - packages/solid/src/components/controls/text-field.tsx
  - packages/solid/src/components/controls/number-field.tsx
  - packages/solid/src/components/controls/date-field.tsx
  - packages/solid/src/components/controls/time-field.tsx
  - packages/solid/src/components/controls/datetime-field.tsx
  - packages/solid/src/components/controls/color-field.tsx
  - packages/solid/src/index.ts (export 추가)
code_patterns:
  - createSignal for reactive state
  - splitProps for prop separation
  - Show component for conditional rendering
  - recipe from vanilla-extract for style variants
  - objPick for variant extraction
  - JSDoc for documentation
test_patterns:
  - Vitest with @solidjs/testing-library
  - Korean describe blocks
  - render() + screen queries
  - fireEvent for user interactions
  - vi.fn() for mocks
---

# Tech-Spec: Solid Field 컴포넌트 중복 코드 리팩토링

**Created:** 2026-02-01
**Updated:** 2026-02-01 (Implementation Complete - 모든 태스크 완료, 207개 테스트 통과)

## Overview

### Problem Statement

6개의 Field 컴포넌트(TextField, NumberField, DateField, TimeField, DateTimeField, ColorField)에 상태 관리 로직이 거의 동일하게 반복되어 유지보수성이 떨어지고, 새 필드 타입 추가 시 보일러플레이트가 많이 필요함.

### Solution

`createFieldState()` 커스텀 훅으로 controlled/uncontrolled 상태 관리를 추출하여 중복을 제거. JSX 렌더링 구조는 각 컴포넌트에 유지 (15줄 정도의 중복은 명시성을 위해 허용).

### Scope

**In Scope:**
- `createFieldState` 훅 생성 (controlled/uncontrolled 패턴)
- 6개 Field 컴포넌트 리팩토링
- 기존 테스트 통과 유지

**Out of Scope:**
- FieldWrapper 컴포넌트 (불필요 - Party Mode 결정)
- Checkbox, Radio 리팩토링 (별도 작업으로 분리)
- 새로운 기능 추가
- CSS 스타일 변경

## Context for Development

### Codebase Patterns

**상태 관리 패턴 (현재 6개 컴포넌트에서 반복):**
```typescript
// eslint-disable-next-line solid/reactivity -- 초기값 설정에만 사용
const [internalValue, setInternalValue] = createSignal<T | undefined>(local.value);
const isControlled = () => local.onChange !== undefined;
const currentValue = () => (isControlled() ? local.value : internalValue());
```

**훅 작성 패턴 (useLocalStorage.ts 참조):**
- 제네릭 타입 파라미터
- JSDoc 문서화

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `packages/solid/src/hooks/useLocalStorage.ts` | 기존 훅 패턴 참조 |
| `packages/solid/src/components/controls/color-field.tsx` | 리팩토링 대상 컴포넌트 (가장 단순) |
| `packages/solid/tests/components/controls/text-field.spec.tsx` | 테스트 패턴 참조 |

### Technical Decisions

1. **훅 이름**: `createFieldState` (SolidJS 관례에 따라 `create` prefix)
2. **FieldWrapper 제외**: JSX 중복은 15줄 정도로 훅만으로 충분 (Party Mode 결정)
3. **반응성 유지**: getter 객체 패턴으로 SolidJS 반응성 보장
4. **하위 호환성 유지**: 기존 props 인터페이스 변경 없음

## Implementation Plan

### Tasks

- [x] **Task 1: createFieldState 훅 생성**
  - File: `packages/solid/src/hooks/createFieldState.ts` (신규)
  - Action: controlled/uncontrolled 상태 관리 로직을 추출한 커스텀 훅 생성
  - Details:
    ```typescript
    /**
     * Field 컴포넌트의 controlled/uncontrolled 상태를 관리하는 훅
     */
    interface FieldStateOptions<T> {
      /** 외부에서 전달받은 value (getter로 접근하여 반응성 유지) */
      value: () => T | undefined;
      /** onChange 콜백 (있으면 controlled, 없으면 uncontrolled) */
      onChange: () => ((value: T | undefined) => void) | undefined;
    }

    interface FieldState<T> {
      /** 현재 값 (controlled면 외부 value, uncontrolled면 내부 상태) */
      currentValue: () => T | undefined;
      /** 값 설정 (controlled면 onChange 호출, uncontrolled면 내부 상태 변경) */
      setValue: (value: T | undefined) => void;
      /** controlled 모드 여부 */
      isControlled: () => boolean;
    }

    function createFieldState<T>(options: FieldStateOptions<T>): FieldState<T>
    ```
  - Notes:
    - getter 함수 패턴으로 SolidJS 반응성 유지
    - 초기값 설정 시 eslint-disable 주석 필요

- [x] **Task 2: index.ts에 createFieldState export 추가**
  - File: `packages/solid/src/index.ts`
  - Action: `export * from "./hooks/createFieldState";` 추가
  - Notes: 외부에서도 커스텀 필드 컴포넌트 작성 시 활용 가능

- [x] **Task 3: ColorField 리팩토링 (Pilot)**
  - File: `packages/solid/src/components/controls/color-field.tsx`
  - Action: createFieldState 훅 적용
  - Before:
    ```typescript
    const [internalValue, setInternalValue] = createSignal<string | undefined>(local.value ?? "#000000");
    const isControlled = () => local.onChange !== undefined;
    const currentValue = () => (isControlled() ? local.value : internalValue());
    ```
  - After:
    ```typescript
    const fieldState = createFieldState({
      value: () => local.value,
      onChange: () => local.onChange,
    });
    // fieldState.currentValue(), fieldState.setValue(), fieldState.isControlled() 사용
    ```
  - Verification: `pnpm vitest packages/solid/tests/components/controls/color-field.spec.tsx`
  - Notes: 가장 단순한 컴포넌트로 먼저 검증. 테스트 통과 확인 후 다음 진행

- [x] **Task 4: TextField 리팩토링**
  - File: `packages/solid/src/components/controls/text-field.tsx`
  - Action: createFieldState 훅 적용
  - Notes: format 로직, 포커스 핸들러는 컴포넌트 내부에 유지
  - Verification: `pnpm vitest packages/solid/tests/components/controls/text-field.spec.tsx`

- [x] **Task 5: NumberField 리팩토링**
  - File: `packages/solid/src/components/controls/number-field.tsx`
  - Action: createFieldState 훅 적용
  - Notes: 포커스 핸들러, 숫자 포맷팅 로직은 컴포넌트 내부에 유지
  - Verification: `pnpm vitest packages/solid/tests/components/controls/number-field.spec.tsx`

- [x] **Task 6: DateField 리팩토링**
  - File: `packages/solid/src/components/controls/date-field.tsx`
  - Action: createFieldState 훅 적용
  - Verification: `pnpm vitest packages/solid/tests/components/controls/date-field.spec.tsx`

- [x] **Task 7: TimeField 리팩토링**
  - File: `packages/solid/src/components/controls/time-field.tsx`
  - Action: createFieldState 훅 적용
  - Verification: `pnpm vitest packages/solid/tests/components/controls/time-field.spec.tsx`

- [x] **Task 8: DateTimeField 리팩토링**
  - File: `packages/solid/src/components/controls/datetime-field.tsx`
  - Action: createFieldState 훅 적용
  - Verification: `pnpm vitest packages/solid/tests/components/controls/datetime-field.spec.tsx`

- [x] **Task 9: 전체 테스트 실행 및 검증**
  - Command: `pnpm vitest --project=solid`
  - Action: 모든 기존 테스트 통과 확인
  - Notes: 모든 테스트 통과해야 함

### Acceptance Criteria

- [x] **AC 1:** Given createFieldState 훅이 생성되었을 때, When onChange가 제공되면, Then controlled 모드로 동작하고 외부 value를 사용한다
- [x] **AC 2:** Given createFieldState 훅이 생성되었을 때, When onChange가 없으면, Then uncontrolled 모드로 동작하고 내부 상태를 사용한다
- [x] **AC 3:** Given 6개 Field 컴포넌트가 리팩토링되었을 때, When 기존 테스트를 실행하면, Then 모든 테스트 통과한다
- [x] **AC 4:** Given TextField가 리팩토링되었을 때, When format prop이 제공되면, Then 기존과 동일하게 포맷팅이 적용된다
- [x] **AC 5:** Given NumberField가 리팩토링되었을 때, When 포커스/블러 시, Then 기존과 동일하게 표시 값이 전환된다
- [x] **AC 6:** Given 모든 Field 컴포넌트가 리팩토링되었을 때, When disabled/readOnly prop이 제공되면, Then aria 속성이 올바르게 설정된다

## Additional Context

### Dependencies

- 없음 (내부 리팩토링, 외부 라이브러리 추가 없음)

### Testing Strategy

**자동 테스트:**
- 기존 테스트 활용: 6개 Field 컴포넌트 테스트 파일이 이미 존재
- 각 Task마다 해당 컴포넌트 테스트 실행하여 점진적 검증
- 최종: `pnpm vitest --project=solid`

**Pilot 검증:**
- Task 3 (ColorField) 완료 후 테스트 통과 확인
- 실패 시 Task 1 훅 설계 재검토

### Rollback Strategy

- Task 1-2 완료 후 Git 커밋
- Task 3 (Pilot) 완료 후 Git 커밋
- Pilot 실패 시: `git reset --hard` 후 훅 인터페이스 재설계

### Notes

**Party Mode 피드백 반영:**
- FieldWrapper 제거 (Barry 제안): JSX 15줄 중복은 명시성을 위해 허용
- getter 함수 패턴 (Winston 제안): SolidJS 반응성 유지를 위해 `value: () => local.value` 형태 사용

**위험 요소:**
- SolidJS의 반응성 시스템 특성상 훅 내부에서 props 접근 시 주의 필요
- getter 함수 패턴으로 반응성 유지

**향후 고려사항:**
- Checkbox, Radio 컴포넌트도 유사한 패턴 적용 가능 (별도 작업)
- 새로운 Field 타입 추가 시 createFieldState 훅 활용으로 보일러플레이트 감소

## Review Notes

- Adversarial review 완료
- Findings: 10개 total, 4개 fixed, 6개 skipped (noise/minor)
- Resolution approach: auto-fix
- 최종 테스트: 23개 파일, 215개 테스트 통과
