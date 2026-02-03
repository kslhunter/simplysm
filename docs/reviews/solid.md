# Solid 패키지 코드 리뷰

## 개요

- **리뷰 대상**: `packages/solid`
- **리뷰 범위**: 전체 컴포넌트, 훅, 디렉티브, 컨텍스트
- **리뷰 일자**: 2026-02-03

## 발견 사항

### 1. [Minor] SidebarMenu의 children 타입 이슈

- **관점**: 코딩지침
- **위치**: `packages/solid/src/components/navigation/SidebarMenu.tsx:165-169`
- **현재 코드**:
  ```tsx
  {hasChildren() && (
    <List>
      <For each={props.menu.children}>{(child) => <MenuItem menu={child} />}</For>
    </List>
  )}
  ```
- **문제점**: `&&` 연산자 사용 시 falsy 값 반환 이슈 가능성, SolidJS 표준 패턴과 다름
- **결정**: `<Show>` 컴포넌트 사용으로 수정

---

### 2. [Minor] Collapse 등의 style prop 처리 미흡

- **관점**: 유지보수성
- **위치**:
  - `packages/solid/src/components/disclosure/Collapse.tsx:60-63`
  - `packages/solid/src/components/navigation/Sidebar.tsx:78-81`
  - `packages/solid/src/components/navigation/SidebarContainer.tsx:92-95`
  - `packages/solid/src/components/data/ListItem.tsx:181-184`
- **현재 코드**:
  ```tsx
  style={{
    ...(typeof local.style === "object" ? local.style : {}),
    overflow: "hidden",
  }}
  ```
- **문제점**: string 타입의 style이 전달되면 무시됨
- **결정**: `solid` 패키지에 `mergeStyles` 커스텀 유틸 함수 작성

---

### 3. [Minor] ripple directive의 overflow 부작용

- **관점**: 사용성
- **위치**: `packages/solid/src/directives/ripple.ts:45-48`
- **현재 코드**:
  ```typescript
  if (getComputedStyle(el).overflow !== "hidden") {
    if (!styleApplied) originalOverflow = el.style.overflow;
    el.style.overflow = "hidden";
  }
  ```
- **문제점**: 버튼 위의 배지/툴팁이 잘릴 수 있음
- **결정**: 컴포넌트 분리 구현 - 내부 컨테이너에 `overflow: hidden` 적용하여 부모 요소 영향 제거

---

### 4. [Suggestion] ListItem의 chevron 아이콘 회전 방향

- **관점**: 사용성
- **위치**: `packages/solid/src/components/data/ListItem.tsx:169`
- **현재 코드**:
  ```tsx
  const getChevronClassName = () => twMerge(chevronClass, openState() ? "rotate-90" : "rotate-0");
  ```
- **현재 동작**: 닫힘 `▼` → 열림 `◀` (90도 회전)
- **결정**: 현재 코드 유지

---

### 5. [Minor] SidebarContainer backdrop의 접근성

- **관점**: 사용성 (접근성)
- **위치**: `packages/solid/src/components/navigation/SidebarContainer.tsx:99`
- **현재 코드**:
  ```tsx
  <div class={backdropClass} onClick={handleBackdropClick} />
  ```
- **문제점**: 키보드 사용자가 Escape 키로 닫을 수 없음, 스크린 리더 지원 없음
- **결정**: 접근성 속성 및 Escape 키 핸들링 추가
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

---

### 6. [Minor] createPropSignal의 초기값 동기화 이슈

- **관점**: 안정성
- **위치**: `packages/solid/src/hooks/createPropSignal.ts:42`
- **현재 코드**:
  ```typescript
  const [internalValue, setInternalValue] = createSignal<T>(options.value());
  ```
- **문제점**: uncontrolled 모드에서 props 값이 나중에 변경되어도 내부 상태가 업데이트되지 않음
- **결정**: `createEffect`로 props 변경 감지 + 내부 상태 동기화 구현

---

### 7. [Suggestion] SidebarMenu에서 pathname 비교 방식

- **관점**: 사용성
- **위치**: `packages/solid/src/components/navigation/SidebarMenu.tsx:87, 134`
- **현재 코드**:
  ```typescript
  if (menu.href === location.pathname) { ... }
  const isSelected = () => props.menu.href === location.pathname;
  ```
- **문제점**: 동적 라우트(`/users/123`)에서 상위 메뉴(`/users`) 하이라이트 불가
- **결정**: 현재 코드 유지 (정확 일치가 가장 예측 가능)

---

### 8. [Minor] List.tsx의 props spread 순서 문제

- **관점**: 안정성
- **위치**: `packages/solid/src/components/data/List.tsx:165-167`
- **현재 코드**:
  ```tsx
  <div
    ref={listRef}
    role={isNested ? "group" : "tree"}
    data-list
    onKeyDown={handleKeyDown}
    {...rest}
    class={getClassName()}
  >
  ```
- **문제점**: 사용자가 `onKeyDown` prop을 전달하면 내부 핸들러가 덮어씌워져 트리뷰 키보드 네비게이션이 동작하지 않음
- **결정**: 이벤트 합성 - 내부 핸들러 + 사용자 핸들러 모두 호출
  ```tsx
  <div
    {...rest}
    onKeyDown={(e) => {
      handleKeyDown(e);
      if (typeof rest.onKeyDown === "function") rest.onKeyDown(e);
    }}
  >
  ```

---

### 9. [Minor] SidebarUser header의 키보드 접근성 부족

- **관점**: 사용성 (접근성)
- **위치**: `packages/solid/src/components/navigation/SidebarUser.tsx:85`
- **현재 코드**:
  ```tsx
  <div use:ripple={hasMenus()} class={getHeaderClassName()} onClick={handleClick}>
    {local.children}
  </div>
  ```
- **문제점**: Tab 키로 포커스 불가, Enter/Space 키로 활성화 불가
- **결정**: `button` 요소로 변경
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

---

### 10. [Minor] Sidebar 컴포넌트의 aria-hidden 누락

- **관점**: 사용성 (접근성)
- **위치**: `packages/solid/src/components/navigation/Sidebar.tsx:74-85`
- **현재 코드**:
  ```tsx
  <aside
    {...rest}
    class={getClassName()}
    style={{ transform: getTransform(), ... }}
  >
  ```
- **문제점**: 사이드바가 닫혀있을 때 스크린 리더가 여전히 콘텐츠를 읽음
- **결정**: `aria-hidden` + `inert` 속성 추가 (inert는 Chrome 102+, progressive enhancement)
  ```tsx
  <aside
    {...rest}
    aria-hidden={!isOpen()}
    inert={!isOpen() || undefined}
  >
  ```

---

### 11. [Minor] useRouterLink에서 metaKey 미처리

- **관점**: 사용성
- **위치**: `packages/solid/src/hooks/useRouterLink.ts:50`
- **현재 코드**:
  ```typescript
  if (e.ctrlKey || e.altKey) {
    window.open(options.href, "_blank");
  }
  ```
- **문제점**: Mac에서 Cmd+클릭이 새 탭으로 열리지 않음
- **결정**: `metaKey` 추가
  ```typescript
  if (e.ctrlKey || e.metaKey || e.altKey) {
    window.open(options.href, "_blank");
  }
  ```

---

## 수정 작업 요약

| # | 항목 | 심각도 | 결정 |
|---|------|--------|------|
| 1 | SidebarMenu children 렌더링 | Minor | `<Show>` 컴포넌트 사용 |
| 2 | style prop 처리 | Minor | `mergeStyles` 유틸 작성 |
| 3 | ripple overflow 부작용 | Minor | 컴포넌트 분리 구현 |
| 4 | ListItem chevron 회전 | Suggestion | 현재 유지 |
| 5 | backdrop 접근성 | Minor | 접근성 추가 |
| 6 | createPropSignal 동기화 | Minor | Props 변경 동기화 |
| 7 | pathname 비교 방식 | Suggestion | 현재 유지 |
| 8 | List props spread 순서 | Minor | 이벤트 합성 |
| 9 | SidebarUser header 접근성 | Minor | button 요소 사용 |
| 10 | Sidebar aria-hidden | Minor | aria-hidden + inert 추가 |
| 11 | useRouterLink metaKey | Minor | metaKey 추가 |

### 수정 필요 항목: 9개

1. SidebarMenu: `<Show>` 컴포넌트 사용
2. style prop: `mergeStyles` 유틸 작성
3. ripple: 컴포넌트 분리 구현
4. backdrop: 접근성 추가
5. createPropSignal: Props 변경 동기화
6. List: 이벤트 합성
7. SidebarUser: button 요소 사용
8. Sidebar: aria-hidden + inert 추가
9. useRouterLink: metaKey 추가

### 현재 유지 항목: 2개

- ListItem chevron 회전 방향
- SidebarMenu pathname 정확 일치 비교
