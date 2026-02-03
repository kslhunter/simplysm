# Solid 패키지 리뷰 수정 계획

## 개요

- **기반 문서**: `docs/reviews/solid.md`
- **목적**: 코드 리뷰에서 발견된 9개 항목 수정
- **작성일**: 2026-02-03

## 결정사항

질문을 통해 확정된 결정사항 이력:

| 항목 | 결정 내용 |
|------|-----------|
| mergeStyles 유틸 구현 | `packages/solid/src/utils/mergeStyles.ts` 파일 생성 |
| ripple overflow 해결 방식 | directive 내부에서 wrapper div 동적 생성 |
| createPropSignal 동기화 정책 | props 변경 시 항상 내부 상태 덮어쓰기 (props 우선) |
| Sidebar inert 속성 | Progressive Enhancement로 포함 (Chrome 102+ 지원, 이하 버전은 fallback) |
| List 이벤트 합성 범위 | 모든 내부 이벤트 핸들러에 합성 패턴 적용 |

## 수정 계획

### 1. SidebarMenu: `<Show>` 컴포넌트 사용

- **파일**: `packages/solid/src/components/navigation/SidebarMenu.tsx`
- **작업**: `&&` 연산자를 `<Show>` 컴포넌트로 변경
- **수정 전**:
  ```tsx
  {hasChildren() && (
    <List>
      <For each={props.menu.children}>{(child) => <MenuItem menu={child} />}</For>
    </List>
  )}
  ```
- **수정 후**:
  ```tsx
  <Show when={hasChildren()}>
    <List>
      <For each={props.menu.children}>{(child) => <MenuItem menu={child} />}</For>
    </List>
  </Show>
  ```

### 2. mergeStyles 유틸 함수 작성

- **파일**: `packages/solid/src/utils/mergeStyles.ts` (신규)
- **작업**: string/object 스타일을 병합하는 유틸 함수 생성
- **구현**:
  ```typescript
  import { JSX } from "solid-js";

  export function mergeStyles(
    ...styles: (JSX.CSSProperties | string | undefined)[]
  ): JSX.CSSProperties | string {
    // string과 object를 모두 병합하는 로직
  }
  ```
- **적용 대상**:
  - `packages/solid/src/components/disclosure/Collapse.tsx`
  - `packages/solid/src/components/navigation/Sidebar.tsx`
  - `packages/solid/src/components/navigation/SidebarContainer.tsx`
  - `packages/solid/src/components/data/ListItem.tsx`

### 3. ripple directive: wrapper div 동적 생성

- **파일**: `packages/solid/src/directives/ripple.ts`
- **작업**: 부모 요소 대신 내부에 wrapper div를 생성하여 overflow: hidden 적용
- **구현 방향**:
  1. directive 실행 시 el 내부에 ripple-container div 생성
  2. ripple-container에 overflow: hidden 적용
  3. ripple 효과는 ripple-container 안에서만 발생
  4. 부모 요소의 overflow 설정은 변경하지 않음

### 4. SidebarContainer backdrop 접근성 추가

- **파일**: `packages/solid/src/components/navigation/SidebarContainer.tsx`
- **작업**: 접근성 속성 및 Escape 키 핸들링 추가
- **수정 후**:
  ```tsx
  <div
    class={backdropClass}
    onClick={handleBackdropClick}
    onKeyDown={(e) => e.key === "Escape" && handleBackdropClick()}
    role="button"
    aria-label="사이드바 닫기"
    tabIndex={0}
  />
  ```

### 5. createPropSignal: props 변경 동기화

- **파일**: `packages/solid/src/hooks/createPropSignal.ts`
- **작업**: `createEffect`로 props 변경 시 항상 내부 상태 덮어쓰기
- **구현 방향**:
  ```typescript
  createEffect(() => {
    const propValue = options.value();
    setInternalValue(() => propValue);
  });
  ```

### 6. List 컴포넌트: 모든 내부 이벤트 핸들러 합성

- **파일**: `packages/solid/src/components/data/List.tsx`
- **작업**: 모든 내부 이벤트 핸들러(onKeyDown, onClick 등)에 합성 패턴 적용
- **구현 방향**:
  ```tsx
  <div
    {...rest}
    onKeyDown={(e) => {
      handleKeyDown(e);
      if (typeof rest.onKeyDown === "function") rest.onKeyDown(e);
    }}
    // 다른 이벤트 핸들러도 동일 패턴 적용
  >
  ```

### 7. SidebarUser header: button 요소 사용

- **파일**: `packages/solid/src/components/navigation/SidebarUser.tsx`
- **작업**: div를 button으로 변경하여 키보드 접근성 확보
- **수정 후**:
  ```tsx
  <button
    type="button"
    use:ripple={hasMenus()}
    class={getHeaderClassName()}
    onClick={handleClick}
    aria-expanded={hasMenus() ? open() : undefined}
  >
    {local.children}
  </button>
  ```

### 8. Sidebar: aria-hidden + inert 추가

- **파일**: `packages/solid/src/components/navigation/Sidebar.tsx`
- **작업**: 접근성 속성 추가 (inert는 Progressive Enhancement)
- **수정 후**:
  ```tsx
  <aside
    {...rest}
    aria-hidden={!isOpen()}
    inert={!isOpen() || undefined}
  >
  ```

### 9. useRouterLink: metaKey 추가

- **파일**: `packages/solid/src/hooks/useRouterLink.ts`
- **작업**: Mac Cmd+클릭 지원을 위해 metaKey 추가
- **수정 후**:
  ```typescript
  if (e.ctrlKey || e.metaKey || e.altKey) {
    window.open(options.href, "_blank");
  }
  ```

## 수정 제외 항목

다음 항목들은 현재 코드를 유지:

- ListItem chevron 회전 방향 (현재 동작이 적절함)
- SidebarMenu pathname 정확 일치 비교 (가장 예측 가능한 동작)

## 검증 계획

1. `pnpm typecheck packages/solid` - 타입 검사
2. `pnpm lint packages/solid` - 린트 검사
3. `pnpm vitest --project=solid` - 컴포넌트 테스트
4. `pnpm watch solid solid-demo` - 데모 앱에서 수동 검증
