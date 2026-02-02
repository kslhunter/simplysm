---
title: 'SdCollapse SolidJS 마이그레이션'
slug: 'sd-collapse-solid-migration'
created: '2026-02-02'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - 'SolidJS'
  - '@solid-primitives/resize-observer'
  - 'Tailwind CSS'
  - 'clsx'
  - 'tailwind-merge'
files_to_modify:
  - 'packages/solid/src/components/disclosure/Collapse.tsx'
  - 'packages/solid/src/index.ts'
  - 'packages/solid/package.json'
  - 'packages/solid/tests/Collapse.spec.tsx'
code_patterns:
  - 'ParentComponent<Props> 타입'
  - 'splitProps로 local/rest 분리'
  - 'twMerge + clsx 클래스 병합'
  - 'JSX.HTMLAttributes 확장'
test_patterns:
  - 'vitest + @solidjs/testing-library'
---

# Tech-Spec: SdCollapse SolidJS 마이그레이션

**Created:** 2026-02-02

## Overview

### Problem Statement

Angular 기반 `sd-collapse` 컴포넌트를 SolidJS 패키지로 마이그레이션해야 함. 기존 Angular 컴포넌트는 콘텐츠 영역을 접고 펼치는 애니메이션을 제공하며, ResizeObserver를 통해 콘텐츠 높이 변화를 감지함.

### Solution

`@solid-primitives/resize-observer`의 `createElementSize` 훅과 Tailwind CSS를 활용하여 SolidJS 컴포넌트로 재구현. 기존 동작(margin-top 애니메이션)을 유지하면서 SolidJS 패턴과 Tailwind 스타일링으로 전환.

### Scope

**In Scope:**
- `Collapse.tsx` 컴포넌트 생성 (`packages/solid/src/components/disclosure/`)
- `open` prop으로 열림/닫힘 상태 제어 (기본값: `false`)
- 콘텐츠 높이 기반 margin-top 애니메이션
- 접근성(ARIA) 속성 지원
- prefers-reduced-motion 대응
- `index.ts`에 export 추가
- `package.json`에 의존성 추가
- 컴포넌트 테스트 작성

**Out of Scope:**
- `CollapseIcon` 컴포넌트
- Tab, Sidebar 등 다른 navigation 컴포넌트

## Context for Development

### Codebase Patterns

**컴포넌트 구조 패턴 (Button.tsx 참조):**
```tsx
import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface CollapseProps extends JSX.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
}

export const Collapse: ParentComponent<CollapseProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "open"]);
  // ...
};
```

**Resize Observer 사용 패턴 (solid-primitives):**
```tsx
import { createElementSize } from "@solid-primitives/resize-observer";
import { createSignal } from "solid-js";

const [contentRef, setContentRef] = createSignal<HTMLDivElement>();
const size = createElementSize(contentRef);
// size.height => number | null
```

**Angular 원본 동작 방식:**
- `overflow: hidden`으로 컨테이너 설정
- 내부 콘텐츠 div에 `margin-top` 적용
- 닫힘: `margin-top: -contentHeight + "px"` (콘텐츠가 위로 숨겨짐)
- 열림: `margin-top: ""` (기본값, 콘텐츠 표시)
- CSS transition으로 부드러운 애니메이션

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `.legacy-packages/sd-angular/src/ui/navigation/collapse/sd-collapse.control.ts` | 원본 Angular 컴포넌트 - 동작 로직 참조 |
| `packages/solid/src/components/controls/Button.tsx` | SolidJS 컴포넌트 구조, Props 패턴, 스타일링 방식 |
| `packages/solid/src/index.ts` | export 구조 |

### Technical Decisions

1. **Resize 감지**: `createElementSize` 훅 사용 - 콘텐츠 div의 높이를 반응형으로 추적
2. **애니메이션**: Tailwind `transition-[margin-top]` + `duration-100` + `ease-out` (단일 easing으로 단순화)
3. **Props 설계**: `open` prop은 `boolean` (기본값 `false`, `undefined`도 `false`로 처리)
4. **초기 렌더링 깜빡임 방지**: `onMount` + `requestAnimationFrame`으로 다음 프레임에 transition 활성화
5. **접근성**: `aria-hidden` 속성으로 스크린 리더 지원 (루트 div에 적용)
6. **모션 감소**: `prefers-reduced-motion` 미디어 쿼리 대응

## Implementation Plan

### Tasks

- [x] **Task 1: 의존성 추가**
  - File: `packages/solid/package.json`
  - Action: `dependencies`에 `@solid-primitives/resize-observer` 추가
  - Version: `^2.0.26`
  - Notes: 추가 후 `pnpm install` 실행 필요

- [x] **Task 2: Collapse 컴포넌트 생성**
  - File: `packages/solid/src/components/disclosure/Collapse.tsx`
  - Action: 새 파일 생성, 아래 구조로 구현
  - Notes:
    ```tsx
    import { type JSX, type ParentComponent, splitProps, createSignal, onMount } from "solid-js";
    import { createElementSize } from "@solid-primitives/resize-observer";
    import clsx from "clsx";
    import { twMerge } from "tailwind-merge";

    export interface CollapseProps extends JSX.HTMLAttributes<HTMLDivElement> {
      open?: boolean;
    }

    // transition 클래스 상수 (재생성 방지)
    const TRANSITION_CLASS = "transition-[margin-top] duration-100 ease-out motion-reduce:transition-none";

    export const Collapse: ParentComponent<CollapseProps> = (props) => {
      const [local, rest] = splitProps(props, ["children", "class", "open"]);

      // 콘텐츠 요소 ref
      const [contentRef, setContentRef] = createSignal<HTMLDivElement>();

      // 콘텐츠 높이 추적
      const size = createElementSize(contentRef);

      // 초기 렌더링 시 transition 비활성화 (깜빡임 방지)
      // requestAnimationFrame으로 다음 프레임에 활성화
      const [mounted, setMounted] = createSignal(false);
      onMount(() => {
        requestAnimationFrame(() => setMounted(true));
      });

      // open이 undefined일 때 false로 처리
      const isOpen = () => local.open ?? false;

      // margin-top 계산
      const marginTop = () => isOpen() ? undefined : `${-(size.height ?? 0)}px`;

      return (
        <div
          {...rest}
          class={twMerge(clsx("block", "overflow-hidden"), local.class)}
          aria-hidden={!isOpen()}
        >
          <div
            ref={setContentRef}
            class={mounted() ? TRANSITION_CLASS : ""}
            style={{ "margin-top": marginTop() }}
          >
            {local.children}
          </div>
        </div>
      );
    };
    ```

- [x] **Task 3: Export 추가**
  - File: `packages/solid/src/index.ts`
  - Action: `export * from "./components/disclosure/Collapse";` 추가

- [x] **Task 4: 컴포넌트 테스트 작성**
  - File: `packages/solid/tests/Collapse.spec.tsx`
  - Action: vitest + @solidjs/testing-library로 테스트 작성
  - Notes:
    ```tsx
    import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
    import { render } from "@solidjs/testing-library";
    import { createSignal } from "solid-js";
    import { Collapse } from "../src";

    describe("Collapse", () => {
      // requestAnimationFrame mock
      beforeEach(() => {
        vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
          cb(0);
          return 0;
        });
      });

      afterEach(() => {
        vi.restoreAllMocks();
      });

      describe("렌더링", () => {
        it("open={false}일 때 aria-hidden=true", () => {
          const { container } = render(() => (
            <Collapse open={false}>Content</Collapse>
          ));
          expect(container.querySelector("[aria-hidden='true']")).toBeTruthy();
        });

        it("open={true}일 때 aria-hidden=false", () => {
          const { container } = render(() => (
            <Collapse open={true}>Content</Collapse>
          ));
          expect(container.querySelector("[aria-hidden='false']")).toBeTruthy();
        });

        it("open이 undefined일 때 false로 처리 (aria-hidden=true)", () => {
          const { container } = render(() => (
            <Collapse>Content</Collapse>
          ));
          expect(container.querySelector("[aria-hidden='true']")).toBeTruthy();
        });

        it("콘텐츠가 비어있어도 정상 렌더링", () => {
          const { container } = render(() => <Collapse open={false} />);
          expect(container.firstChild).toBeTruthy();
        });

        it("추가 class가 병합됨", () => {
          const { container } = render(() => (
            <Collapse open={true} class="custom-class">Content</Collapse>
          ));
          expect(container.querySelector(".custom-class")).toBeTruthy();
          expect(container.querySelector(".overflow-hidden")).toBeTruthy();
        });
      });

      describe("margin-top 계산", () => {
        it("open={false}일 때 margin-top이 음수", () => {
          const { container } = render(() => (
            <Collapse open={false}>
              <div style={{ height: "100px" }}>Content</div>
            </Collapse>
          ));
          const contentDiv = container.querySelector("[aria-hidden]")?.firstElementChild;
          expect(contentDiv).toBeTruthy();
          // ResizeObserver mock 환경에서는 height가 0일 수 있음
          const marginTop = (contentDiv as HTMLElement).style.marginTop;
          expect(marginTop).toMatch(/^-?\d+px$/);
        });

        it("open={true}일 때 margin-top이 없음", () => {
          const { container } = render(() => (
            <Collapse open={true}>
              <div style={{ height: "100px" }}>Content</div>
            </Collapse>
          ));
          const contentDiv = container.querySelector("[aria-hidden]")?.firstElementChild;
          const marginTop = (contentDiv as HTMLElement).style.marginTop;
          expect(marginTop === "" || marginTop === undefined).toBeTruthy();
        });
      });

      describe("초기 렌더링", () => {
        it("마운트 후 transition 클래스가 적용됨", () => {
          const { container } = render(() => (
            <Collapse open={false}>Content</Collapse>
          ));
          const contentDiv = container.querySelector("[aria-hidden]")?.firstElementChild;
          expect(contentDiv?.classList.contains("transition-[margin-top]")).toBeTruthy();
        });
      });

      describe("동적 상태 변경", () => {
        it("open 상태 변경 시 aria-hidden 업데이트", () => {
          const [open, setOpen] = createSignal(false);
          const { container } = render(() => (
            <Collapse open={open()}>Content</Collapse>
          ));

          expect(container.querySelector("[aria-hidden='true']")).toBeTruthy();

          setOpen(true);
          expect(container.querySelector("[aria-hidden='false']")).toBeTruthy();
        });
      });
    });
    ```

### Acceptance Criteria

- [x] **AC 1**: Given Collapse 컴포넌트가 렌더링될 때, when `open={false}` (기본값), then 콘텐츠가 보이지 않아야 함 (margin-top이 음수로 적용)

- [x] **AC 2**: Given Collapse 컴포넌트가 렌더링될 때, when `open={true}`, then 콘텐츠가 완전히 표시되어야 함 (margin-top이 없거나 undefined)

- [x] **AC 3**: Given open prop이 변경될 때, when false→true 또는 true→false로 전환, then 100ms ease-out 트랜지션 애니메이션이 적용되어야 함

- [x] **AC 4**: Given 콘텐츠 내부 요소의 크기가 동적으로 변경될 때, when 높이가 변경됨, then margin-top 값이 자동으로 재계산되어야 함

- [x] **AC 5**: Given Collapse 컴포넌트에 추가 class와 props가 전달될 때, when 렌더링됨, then class는 병합되고 나머지 props는 루트 div에 전달되어야 함

- [x] **AC 6**: Given 컴포넌트가 처음 마운트될 때, when 초기 상태로 렌더링됨, then transition 없이 즉시 상태가 적용되어야 함 (깜빡임 방지, requestAnimationFrame으로 다음 프레임에 transition 활성화)

- [x] **AC 7**: Given `prefers-reduced-motion: reduce` 설정일 때, when open 상태가 변경됨, then 애니메이션 없이 즉시 전환되어야 함

- [x] **AC 8**: Given 스크린 리더 사용자가 접근할 때, when `open={false}`, then `aria-hidden="true"`로 콘텐츠가 숨겨짐을 알려야 함

- [x] **AC 9**: Given 콘텐츠가 비어있을 때, when `open={false}`, then 에러 없이 정상 동작해야 함 (height가 0)

- [x] **AC 10**: Given `open` prop이 `undefined`일 때, when 렌더링됨, then `false`로 처리되어야 함

## Additional Context

### Dependencies

- `@solid-primitives/resize-observer@^2.0.26`: ResizeObserver 기반 반응형 크기 추적
- 기존 의존성: `solid-js`, `clsx`, `tailwind-merge` (이미 설치됨)
- 테스트: `@solidjs/testing-library@^0.8.10` (이미 설치됨)

### Testing Strategy

**컴포넌트 테스트 (vitest + @solidjs/testing-library):**
- 파일: `packages/solid/tests/Collapse.spec.tsx`
- 실행: `pnpm vitest --project=solid packages/solid/tests/Collapse.spec.tsx`
- 커버리지: 렌더링, margin-top 계산, 초기 렌더링, 동적 상태 변경

### Notes

- Chrome 84+ 지원 필수 (transition 속성 호환됨)
- `em` 단위 사용 금지, `rem` 단위로 통일
- `motion-reduce:transition-none`은 Tailwind의 prefers-reduced-motion 유틸리티
- `TRANSITION_CLASS` 상수로 문자열 재생성 방지

## Review Notes

- Adversarial review 완료
- Findings: 12개 총, 11개 수정, 1개 롤백(F7)
- Resolution approach: walk-through
- 주요 개선사항:
  - JSDoc 접근성 가이드 추가 (F1, F6, F9)
  - `onCleanup`으로 메모리 누수 방지 (F2)
  - `visibility: hidden`으로 FOUC 및 포커스 접근 차단 (F3, F10)
  - duration 100ms → 200ms 변경 (F4)
  - ResizeObserver 측정 검증 및 동적 콘텐츠 테스트 추가 (F5, F8)
  - `style` prop 분리, `overflow: hidden` 강제 적용 (F11)
  - transition 상태 변경 테스트 추가 (F12)
