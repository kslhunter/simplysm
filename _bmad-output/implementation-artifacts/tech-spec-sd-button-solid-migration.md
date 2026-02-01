---
title: 'sd-button SolidJS 마이그레이션'
slug: 'sd-button-solid-migration'
created: '2026-02-01'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['SolidJS', 'Tailwind CSS v3.4.19', 'TypeScript']
files_to_modify: ['packages/solid/src/components/controls/Button.tsx', 'packages/solid/src/tailwind-preset.ts', 'packages/solid/package.json']
code_patterns: ['ParentComponent', 'splitProps', 'Tailwind colors alias']
test_patterns: ['vitest + solid-testing-library (추후)']
---

# Tech-Spec: sd-button SolidJS 마이그레이션

**Created:** 2026-02-01

## Overview

### Problem Statement

Angular 기반 sd-button 컴포넌트를 SolidJS로 마이그레이션하여 새로운 Solid 패키지에서 사용할 수 있게 한다.

### Solution

Angular sd-button의 기능을 SolidJS 컴포넌트로 재구현하되, Tailwind CSS v3 표준 방식(`primary: colors.blue` 팔레트 alias)으로 스타일링한다.

### Scope

**In Scope:**
- 테마: primary, info, success, warning, danger, gray (기본값: gray)
- variant: solid, outline (기본값), ghost
- 사이즈: sm, lg
- 상태: inset, disabled
- 스타일링: Tailwind CSS 팔레트 alias 방식
- 다크모드: `dark:` prefix 사용
- API: SolidJS prop 기반

**Out of Scope:**
- inline 속성
- secondary 테마 (필요시 Tailwind 기본 blue, gray 직접 사용)
- Ripple 효과 (추후 구현)

## Context for Development

### Codebase Patterns

- Tailwind 색상 alias: `primary: colors.blue` 방식 (tailwind.config.ts)
- 다크모드: Tailwind `dark:` prefix 표준 사용
- SolidJS 컴포넌트: `ParentComponent`, `splitProps` 패턴

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `.legacy-packages/sd-angular/src/ui/form/button/sd-button.control.ts` | 원본 Angular 컴포넌트 |
| `.legacy-packages/sd-angular/scss/commons/_variables.scss` | Angular 색상/변수 정의 |
| `.legacy-packages/sd-angular/scss/commons/_mixins.scss` | form-control-base 믹스인 |
| `packages/solid/src/components/controls/Button.tsx` | 현재 Solid Button (수정 대상) |
| `packages/solid/src/tailwind-preset.ts` | Tailwind preset (색상 alias 추가) |

### Tailwind 색상 매핑

| 테마 | Tailwind 색상 |
| ---- | ------------- |
| primary | colors.blue |
| info | colors.cyan |
| success | colors.lime |
| warning | colors.amber |
| danger | colors.red |
| gray | colors.gray (기본값) |

### Technical Decisions

- Tailwind CSS v3 표준 색상 alias 방식 사용
- CSS 변수 방식 대신 고정 팔레트 alias 선택 (유지보수 단순화)
- `dark:` prefix로 다크모드 처리

## Implementation Plan

### Tasks

- [x] Task 0: tailwind-merge 패키지 설치
  - File: `packages/solid/package.json`
  - Action: tailwind-merge 의존성 추가
  - Command: `pnpm add tailwind-merge -F @simplysm/solid`

- [x] Task 1: Tailwind preset에 테마 색상 alias 추가
  - File: `packages/solid/src/tailwind-preset.ts`
  - Action: `tailwindcss/colors`에서 색상 import하여 theme.extend.colors에 추가
  - Details:
    ```typescript
    import colors from "tailwindcss/colors";
    // theme.extend.colors에 추가:
    primary: colors.blue,
    info: colors.cyan,
    success: colors.lime,
    warning: colors.amber,
    danger: colors.red,
    // gray는 Tailwind 기본 제공되므로 추가 불필요
    surface: {
      light: colors.white,
      dark: colors.slate[900],
    },
    ```

- [x] Task 2: Button 컴포넌트 Props 인터페이스 정의
  - File: `packages/solid/src/components/controls/Button.tsx`
  - Action: ButtonProps 인터페이스에 커스텀 props 추가
  - Details:
    ```typescript
    interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
      theme?: "primary" | "info" | "success" | "warning" | "danger" | "gray";
      variant?: "solid" | "outline" | "ghost";
      size?: "sm" | "lg";
      inset?: boolean;
    }
    ```
  - Notes:
    - `type` prop은 JSX.ButtonHTMLAttributes에 이미 포함됨 (기본값 "button"으로 설정 권장)
    - `theme` 기본값: "gray"
    - `variant` 기본값: "outline"

- [x] Task 3: Button 컴포넌트 스타일 로직 구현
  - File: `packages/solid/src/components/controls/Button.tsx`
  - Action: splitProps로 props 분리하고 `twMerge`로 Tailwind 클래스 조합
  - Details:
    - `tailwind-merge`의 `twMerge` 사용하여 내부 스타일 + 사용자 class 병합
    - **공통 스타일:**
      - `py-1 px-1.5 font-bold text-center cursor-pointer transition-colors`
      - `rounded` (기본 border-radius)
      - `focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-{theme}-500`
    - **variant="solid":**
      - 배경: `bg-{theme}-500 dark:bg-{theme}-600`
      - hover: `hover:bg-{theme}-600 dark:hover:bg-{theme}-500`
      - 텍스트: `text-white`
      - 테두리: `border border-transparent`
    - **variant="outline" (기본값):**
      - 배경: `bg-transparent`
      - hover: `hover:bg-{theme}-50 dark:hover:bg-{theme}-900/20`
      - 텍스트: `text-{theme}-600 dark:text-{theme}-400`
      - 테두리: `border border-{theme}-300 dark:border-{theme}-700`
    - **variant="ghost":**
      - 배경: `bg-transparent`
      - hover: `hover:bg-{theme}-50 dark:hover:bg-{theme}-900/20`
      - 텍스트: `text-{theme}-600 dark:text-{theme}-400`
      - 테두리: 없음
    - **size 스타일:** sm=`py-0.5 px-1.5`, lg=`py-1.5 px-3`
    - **inset 스타일:** `rounded-none border-none`
    - **disabled 스타일:** `cursor-default opacity-50 pointer-events-none`

- [x] Task 4: solid-demo에서 Button 데모 업데이트
  - File: `packages/solid-demo/src/App.tsx`
  - Action: 다양한 테마/사이즈/상태의 버튼 예시 추가
  - Details: 모든 props 조합 테스트 가능하도록 구성

### Acceptance Criteria

- [ ] AC 1: Given variant="solid"이고 theme="primary"일 때, when 버튼이 렌더링되면, then bg-primary-500 배경과 흰색 텍스트가 적용된다
- [ ] AC 2: Given variant="outline" (기본값)일 때, when 버튼이 렌더링되면, then 투명 배경과 테두리, 테마 색상 텍스트가 적용된다
- [ ] AC 3: Given variant="ghost"일 때, when 버튼이 렌더링되면, then 배경과 테두리 없이 텍스트 색상만 테마 색상이다
- [ ] AC 4: Given size="sm"일 때, when 버튼이 렌더링되면, then 작은 padding이 적용된다
- [ ] AC 5: Given size="lg"일 때, when 버튼이 렌더링되면, then 큰 padding이 적용된다
- [ ] AC 6: Given inset prop이 true일 때, when 버튼이 렌더링되면, then border-radius가 0이고 border가 없다
- [ ] AC 7: Given disabled prop이 true일 때, when 버튼이 렌더링되면, then cursor가 default이고 opacity가 낮아진다
- [ ] AC 8: Given 다크모드일 때, when 버튼이 렌더링되면, then 다크모드 색상 변형이 적용된다
- [ ] AC 9: Given onClick handler가 전달될 때, when 버튼 클릭 시, then handler가 호출된다
- [ ] AC 10: Given children이 전달될 때, when 버튼이 렌더링되면, then children이 버튼 내부에 표시된다
- [ ] AC 11: Given theme 미지정 시, when 버튼이 렌더링되면, then gray 테마가 기본 적용된다

## Additional Context

### Dependencies

- tailwindcss: ^3.4.19
- tailwind-merge: 클래스 병합 및 충돌 해결 (사용자 class 오버라이드 지원)

### Testing Strategy

**Manual Testing:**
1. `pnpm watch solid solid-demo` 실행
2. http://localhost:40080 에서 데모 페이지 확인
3. 모든 테마/사이즈/상태 조합 시각적 확인
4. 다크모드 전환 테스트 (브라우저 개발자 도구 또는 시스템 설정)
5. 버튼 클릭 이벤트 동작 확인

**Unit Tests (추후):**
- vitest + @solidjs/testing-library
- 각 prop 조합에 대한 렌더링 테스트
- 이벤트 핸들러 호출 테스트

### Notes

**제약사항:**
- Chrome 84+ 지원 필수
- CSS aspect-ratio, inset, :is(), :where() 사용 금지 (Chrome 88+)

**향후 고려사항:**
- Ripple 효과 추가 (별도 directive/hook으로 구현)
- 버튼 그룹 컴포넌트
- 로딩 상태 (spinner)

**스타일 병합:**
- `tailwind-merge` 사용하여 내부 스타일과 사용자 class prop 병합
- 사용자가 전달한 class가 내부 스타일을 오버라이드할 수 있도록 지원

## Review Notes

- Adversarial review 완료
- Findings: 10개 total, 5개 fixed, 5개 skipped
- Resolution approach: walk-through
- 수정 내용:
  - F3: 다크모드 ring-offset 색상 추가
  - F4: 불필요한 타입 export 제거
  - F5: 미사용 surface 색상 제거
  - F7: inset + disabled 조합 테스트 추가
  - F10: type prop override 허용
