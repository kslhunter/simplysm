---
title: 'SolidJS Ripple Directive 구현'
slug: 'solid-ripple-directive'
created: '2026-02-02'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - SolidJS
  - TypeScript
  - Tailwind CSS
files_to_modify:
  - packages/solid/src/directives/ripple.ts (신규)
  - packages/solid/src/components/controls/Button.tsx (수정)
  - packages/solid/src/index.ts (수정)
  - packages/solid/tailwind.config.ts (수정)
  - packages/solid/tests/directives/ripple.spec.tsx (신규)
  - vitest.config.ts (수정)
code_patterns:
  - SolidJS use: directive (function(el, accessor) 시그니처)
  - splitProps로 local/rest 분리
  - Tailwind 유틸리티 클래스 기반 스타일링 (classList.add/remove)
test_patterns:
  - @solidjs/testing-library로 컴포넌트 테스트
  - Playwright + vitest 브라우저 테스트
---

# Tech-Spec: SolidJS Ripple Directive 구현

**Created:** 2026-02-02

## Overview

### Problem Statement

Angular 레거시 패키지(`sd-angular`)의 ripple 기능을 SolidJS 기반 `solid` 패키지로 이전해야 한다. 현재 `Button` 컴포넌트에는 ripple 효과가 없어 사용자 인터랙션 피드백이 부족하다.

### Solution

SolidJS의 `use:` directive 패턴을 활용하여 재사용 가능한 ripple directive를 구현하고, Button 컴포넌트에 적용한다. ripple은 Button의 `disabled` 상태에 따라 자동으로 활성화/비활성화된다.

### Scope

**In Scope:**
- `packages/solid/src/directives/ripple.ts` 파일 생성
- ripple directive 구현 (pointerdown 이벤트 기반)
- Button 컴포넌트에 ripple directive 적용
- disabled 상태 연동

**Out of Scope:**
- ripple 끄기 옵션 (noRipple prop 등)
- 사용자 인터랙션 제어 기능
- Button 외 다른 컴포넌트 적용

## Context for Development

### Codebase Patterns

**SolidJS Directive 패턴:**
```typescript
import type { Accessor } from "solid-js";
import { onCleanup } from "solid-js";

// directive 시그니처
export function ripple(el: HTMLElement, accessor: Accessor<boolean>): void {
  // accessor()로 enabled 상태 접근
  // onCleanup으로 이벤트 리스너 및 잔여 ripple 정리
}

// 사용 시 (JSX)
<button use:ripple={!props.disabled}>Click</button>
```

**Button 컴포넌트 패턴:**
- `splitProps`로 local props와 rest props 분리
- `clsx` + `twMerge`로 클래스 조합 (Button 컴포넌트에서 사용)
- Tailwind 유틸리티 클래스 기반 스타일링
- ripple directive는 `classList.add/remove`로 클래스 조작

**기존 Angular Ripple 로직 (setupRipple.ts):**
- `pointerdown`: 클릭 위치 계산 → 원형 div 생성 → scale 애니메이션
- `pointerup/cancel/leave`: opacity 0으로 fade out
- `transitionend`: opacity 0이면 요소 제거
- 부모 요소에 `position: relative`, `overflow: hidden` 필수

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `.legacy-packages/sd-angular/src/core/utils/setups/setupRipple.ts` | 기존 ripple 로직 - 이벤트 핸들링, 애니메이션 로직 참조 |
| `packages/solid/src/components/controls/Button.tsx` | ripple 적용 대상 - splitProps, twMerge 패턴 참조 |
| `packages/solid/src/index.ts` | export 추가 위치 |

### Technical Decisions

1. **스타일 처리**: Tailwind 클래스 + 인라인 스타일 혼합
   - 정적 스타일 (Tailwind 클래스): `absolute`, `pointer-events-none`, `rounded-full`, `bg-black/20`, `dark:bg-white/20`, `transition-[transform,opacity]`, `duration-300`, `ease-out`
   - 동적 스타일 (인라인): `width`, `height`, `top`, `left`, `transform`, `opacity`
   - 이유: tailwind.config.ts의 safelist 수정 없이 동적 애니메이션 구현

2. **다크모드 지원**:
   - Tailwind 클래스 `bg-black/20 dark:bg-white/20` 사용 (정적 클래스라 purge 안 됨)

3. **부모 요소 스타일 처리** (Tailwind 클래스 사용):
   - `position`이 `static`일 때만 `classList.add('relative')` → cleanup 시 `classList.remove('relative')`
   - `overflow: hidden`은 항상 `classList.add('overflow-hidden')` → cleanup 시 `classList.remove('overflow-hidden')`
   - TSDoc에 이 동작 명시

4. **Directive 시그니처**: `use:ripple={boolean}` 형태로 enabled 상태 전달
   - Button에서 `use:ripple={!local.disabled}`로 사용

5. **단일 ripple 방식**: 빠른 연속 클릭 시 이전 ripple 제거 후 새로 생성 (성능 최적화)

6. **TypeScript 처리**: directive import 후 `void ripple;`로 사용 선언하여 "unused" 에러 방지

### Ripple 동작 상세

1. **pointerdown**:
   - 클릭 위치에서 ripple 시작
   - 버튼 전체를 채울 크기로 확장 (scale 0 → 1)
   - 마우스 누르는 동안 ripple 유지

2. **pointerup/cancel/leave**:
   - 마우스를 떼면 ripple이 서서히 사라짐 (opacity 1 → 0)

3. **transitionend**:
   - `event.propertyName === 'opacity'`로 필터링
   - opacity 0이면 DOM에서 제거

## Implementation Plan

### Tasks

- [x] **Task 1: directives 폴더 및 ripple.ts 파일 생성**
  - File: `packages/solid/src/directives/ripple.ts` (신규)
  - Action: ripple directive 함수 구현
  - Details:
    1. `packages/solid/src/directives/` 폴더 생성
    2. `Accessor<boolean>` 타입의 accessor를 받아 enabled 상태 확인
    3. 부모 요소 스타일 설정 (Tailwind 클래스 사용):
       - `addedRelative` 플래그 선언
       - `getComputedStyle(el).position`이 `static`이면 `el.classList.add('relative')`, `addedRelative = true`
       - `el.classList.add('overflow-hidden')` (항상)
    4. ripple indicator 참조 변수 선언 (`let indicatorEl: HTMLDivElement | undefined`)
    5. `pointerdown` 이벤트 핸들러:
       - `accessor()` false면 early return
       - 이전 indicatorEl 있으면 제거 (단일 ripple 방식)
       - 클릭 위치와 요소 크기 계산
       - size = `Math.max(rect.width, rect.height) * 2` (버튼 전체 채우기)
       - ripple indicator div 생성
       - Tailwind 클래스: `absolute`, `pointer-events-none`, `rounded-full`, `bg-black/20`, `dark:bg-white/20`, `transition-[transform,opacity]`, `duration-300`, `ease-out`
       - 인라인 스타일:
         ```typescript
         {
           width: `${size}px`,
           height: `${size}px`,
           top: `${y - size / 2}px`,
           left: `${x - size / 2}px`,
           transform: 'scale(0)',
           opacity: '1',
         }
         ```
       - `requestAnimationFrame`으로 `transform: 'scale(1)'` 적용 (애니메이션 트리거)
    6. `pointerup/cancel/leave` 이벤트 핸들러 (공용 핸들러 `onPointerUp` 하나로 처리):
       - indicatorEl 있으면 `indicatorEl.style.opacity = '0'` 적용
    7. `transitionend` 이벤트 핸들러 (indicatorEl에 등록):
       - `event.propertyName === 'opacity'`이고 opacity가 '0'이면 요소 제거
    8. `onCleanup`으로 정리:
       - 이벤트 리스너 제거 (pointerdown, pointerup, pointercancel, pointerleave)
       - 잔여 indicatorEl 제거
       - `addedRelative`가 true면 `el.classList.remove('relative')`
       - `el.classList.remove('overflow-hidden')`
    9. TSDoc 작성:
       ```typescript
       /**
        * 인터랙티브 요소에 ripple 효과를 추가하는 directive.
        *
        * @remarks
        * - 요소의 position이 `static`일 때만 `relative` 클래스 추가 (cleanup 시 제거)
        * - `overflow-hidden` 클래스 항상 추가 (cleanup 시 제거)
        * - 단일 ripple 모드: 새 클릭 시 이전 ripple 제거
        *
        * @example
        * ```tsx
        * <button use:ripple={!props.disabled}>Click me</button>
        * ```
        */
       ```

- [x] **Task 2: Button 컴포넌트에 ripple 적용**
  - File: `packages/solid/src/components/controls/Button.tsx` (수정)
  - Action: ripple directive import 및 적용
  - Details:
    1. `ripple` directive import: `import { ripple } from "../../directives/ripple";`
    2. TypeScript용 directive 사용 선언 추가 (파일 상단, import 후):
       ```typescript
       // Directive 사용 선언 (TypeScript용)
       void ripple;
       ```
    3. `<button>` 요소에 `use:ripple={!local.disabled}` 추가

- [x] **Task 3: index.ts에 export 추가**
  - File: `packages/solid/src/index.ts` (수정)
  - Action: ripple directive export
  - Details:
    1. `export { ripple } from "./directives/ripple";` 추가

- [x] **Task 4: tailwind.config.ts content 수정**
  - File: `packages/solid/tailwind.config.ts` (수정)
  - Action: .ts 파일도 스캔하도록 content 패턴 수정
  - Details:
    1. `content: [\`${__dirname}src/**/*.tsx\`]` → `content: [\`${__dirname}src/**/*.{ts,tsx}\`]`

- [x] **Task 5: ripple 테스트 파일 생성**
  - File: `packages/solid/tests/directives/ripple.spec.tsx` (신규)
  - Action: ripple directive 테스트 작성
  - Details:
    1. `@solidjs/testing-library` 의존성 설치: `pnpm add -D @solidjs/testing-library --filter=@simplysm/solid`
    2. `packages/solid/tests/directives/` 폴더 생성
    3. `ripple.spec.tsx` 작성:
       - `@solidjs/testing-library`의 `render` 사용
       - 테스트 케이스:
         - 버튼 클릭 시 ripple indicator 요소 생성 확인
         - disabled 상태에서 클릭 시 ripple 미생성 확인
         - pointerup 후 opacity 0 확인
       - 예시 구조:
         ```tsx
         import { render, fireEvent } from "@solidjs/testing-library";
         import { Button } from "../../src/components/controls/Button";

         describe("ripple directive", () => {
           it("버튼 클릭 시 ripple indicator가 생성된다", async () => {
             const { getByRole } = render(() => <Button>Click</Button>);
             const button = getByRole("button");

             await fireEvent.pointerDown(button);

             const ripple = button.querySelector(".rounded-full");
             expect(ripple).toBeTruthy();
           });

           it("disabled 버튼은 ripple이 생성되지 않는다", async () => {
             const { getByRole } = render(() => <Button disabled>Click</Button>);
             const button = getByRole("button");

             await fireEvent.pointerDown(button);

             const ripple = button.querySelector(".rounded-full");
             expect(ripple).toBeFalsy();
           });
         });
         ```

- [x] **Task 6: vitest.config.ts solid 프로젝트 설정 수정**
  - File: `vitest.config.ts` (수정)
  - Action: vanilla-extract → Tailwind CSS로 변경
  - Details:
    1. 상단에 `import tailwindcss from "tailwindcss";` 추가
    2. solid 프로젝트 설정에서 `vanilla-extract` 플러그인 제거
    3. `setupFiles` 제거
    4. `css.postcss.plugins`에 tailwindcss 추가 (build.ts 방식과 동일)
    5. 수정 후 설정:
       ```typescript
       // SolidJS 테스트 (solid 패키지 전용)
       {
         extends: true,
         plugins: [
           tsconfigPaths({ projects: ["tsconfig.json"] }),
           (await import("vite-plugin-solid")).default() as never,
         ],
         css: {
           postcss: {
             plugins: [tailwindcss({ config: "./packages/solid/tailwind.config.ts" })],
           },
         },
         test: {
           name: "solid",
           include: ["packages/solid/tests/**/*.spec.{ts,tsx,js}"],
           browser: {
             enabled: true,
             provider: playwright(),
             headless: true,
             instances: [{ browser: "chromium", viewport: { width: 1920, height: 1080 } }],
             screenshotFailures: false,
           },
         },
       },
       ```

### Acceptance Criteria

- [x] **AC 1**: Given Button 컴포넌트가 렌더링되었을 때, When 버튼을 클릭하면, Then 클릭 위치에서 원형 ripple 애니메이션이 버튼 전체를 채울 때까지 확장된다
- [x] **AC 2**: Given Button이 disabled 상태일 때, When 버튼 영역을 클릭하면, Then ripple 애니메이션이 발생하지 않는다
- [x] **AC 3**: Given 마우스를 누르고 있을 때, When ripple이 버튼을 다 채웠어도, Then ripple이 사라지지 않고 유지된다
- [x] **AC 4**: Given ripple이 표시된 상태에서, When 마우스를 떼거나 버튼 영역을 벗어나면, Then ripple이 서서히 fade out된다
- [x] **AC 5**: Given ripple이 fade out 완료되었을 때, When opacity transition이 끝나면, Then ripple 요소가 DOM에서 제거된다
- [x] **AC 6**: Given Button 컴포넌트가 있을 때, When ripple 애니메이션이 발생해도, Then ripple이 버튼 영역 밖으로 넘치지 않는다 (overflow: hidden)
- [x] **AC 7**: Given 빠르게 연속 클릭할 때, When 새로운 클릭이 발생하면, Then 이전 ripple은 제거되고 새 ripple이 생성된다
- [x] **AC 8**: Given 다크모드와 라이트모드에서, When 버튼을 클릭하면, Then ripple이 양쪽 모드에서 모두 잘 보인다

## Additional Context

### Dependencies

- solid-js (기존) - `Accessor`, `onCleanup` 타입/함수 사용
- 추가 의존성 없음

### Testing Strategy

- **자동화 테스트**:
  - `pnpm vitest --project=solid` - 전체 solid 테스트 실행
  - `pnpm vitest packages/solid/tests/directives/ripple.spec.tsx --project=solid` - ripple 테스트만 실행

- **수동 테스트**:
  1. `pnpm watch solid solid-demo` 실행
  2. http://localhost:40080 접속
  3. Button 컴포넌트 클릭하여 ripple 동작 확인
  4. 마우스 누른 채로 유지 → ripple 유지 확인
  5. 마우스 떼기 → fade out 확인
  6. disabled Button 클릭 시 ripple 미발생 확인
  7. 빠른 연속 클릭 시 단일 ripple 동작 확인
  8. 다크모드 전환하여 ripple 가시성 확인

### Notes

- SolidJS directive는 네이티브 HTML 요소에만 적용 가능
- Button 컴포넌트 내부의 `<button>` 요소에 직접 적용
- Chrome 84+ 지원 필수 (CSS 제약 확인 완료 - ripple에 사용되는 기능은 모두 지원)
- `transform`, `opacity`, `transition`은 모두 Chrome 84에서 지원됨
- tailwind.config.ts의 content를 `.{ts,tsx}`로 수정하여 ripple.ts의 Tailwind 클래스 스캔 가능하게 함

## Review Notes

- Adversarial review 완료
- Findings: 15개 total, 4개 fixed, 11개 skipped (noise/out-of-scope)
- Resolution approach: walk-through
- Fixed:
  - F1: TypeScript module augmentation을 ripple.ts로 이동
  - F3: requestAnimationFrame cleanup 추가
  - F6: prefers-reduced-motion 지원 추가
  - F12: overflow-hidden 주의사항 TSDoc에 추가
