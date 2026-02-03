# SidebarContainer 레이아웃 리팩토링 기획서

## 개요

현재 `SidebarContainer`와 `Sidebar` 컴포넌트는 `fixed` 포지셔닝을 사용하여 전체 화면을 기준으로 배치된다. `relative`/`absolute` 포지셔닝으로 변경하여 부모 컨테이너에 종속되도록 하고, 관련 스타일(backdrop, sidebar 내부 스타일)을 재설계한다.

### 변경 배경
- 현재: `Sidebar`가 `fixed`로 뷰포트에 고정됨 → 부모 컨테이너와 무관하게 동작
- 목표: `Sidebar`가 부모 컨테이너에 종속되어 레이아웃 안에서 자연스럽게 동작

## 범위

### 포함
- `SidebarContainer.tsx`: 레이아웃 구조 변경 (`relative`, block 레이아웃)
- `Sidebar.tsx`: 포지셔닝 변경 (`fixed` → `absolute`)
- `App.tsx` (데모): 변경된 컴포넌트에 맞게 사용 예시 수정

### 제외
- `SidebarMenu.tsx`, `SidebarUser.tsx`: 기존 로직 유지
- `SidebarContext.ts`: 변경 불필요

## 결정사항

### 1. Sidebar 포지셔닝 방식
- **결정: 컨테이너 `relative`, Sidebar `absolute`**
- SidebarContainer에 `position: relative` 적용
- Sidebar에 `position: absolute; top: 0; left: 0; bottom: 0;` 적용

### 2. 컨테이너 레이아웃 방식
- **결정: block 레이아웃 (flex 제거)**
- `flex`, `flex-col` 제거
- `relative` + `h-full`만 적용

### 3. 컨테이너 높이 처리
- **결정: `h-full` 사용**
- 부모 컨테이너의 100% 높이 차지
- 사용자가 SidebarContainer의 부모에 높이를 지정해야 함

### 4. 콘텐츠 영역 처리
- **결정: 사용자가 직접 스타일링**
- wrapper 추가 안 함, children 그대로 렌더링
- `padding-left`는 컨테이너에 유지 (기존 방식)
- 콘텐츠 영역의 `overflow-auto`는 사용자가 직접 적용

### 5. 모바일 동작 방식
- **결정: 컨테이너 내 오버레이**
- 데스크탑/모바일 모두 `absolute`로 컨테이너 내에서 동작
- 모바일에서도 화면 전체가 아닌 컨테이너 범위 내에서 오버레이

### 6. Backdrop 처리
- **결정: 컨테이너 내부 `absolute` Backdrop**
- `fixed` → `absolute`로 변경 (`top-0 left-0 right-0 bottom-0` 유지, Chrome 84 호환)
- z-index 순서: 콘텐츠(auto) < Backdrop(99) < Sidebar(100)

### 7. 닫힘 상태 처리
- **결정: `transform: translateX(-100%)` 슬라이드**
- 기존 애니메이션 방식 유지

### 8. 데스크탑 기본 상태
- **결정: 열림 상태 기본 (현재 동작 유지)**
- `toggle=false`: 데스크탑 열림, 모바일 닫힘
- `toggle=true`: 데스크탑 닫힘, 모바일 열림

### 9. JSDoc 주석
- **결정: 주석 업데이트 포함**
- 변경된 포지셔닝 방식과 사용법을 주석에 반영

## 주요 변경사항

### SidebarContainer.tsx

**클래스 변경:**
```tsx
// 변경 전
const containerClass = clsx("flex", "flex-col", "min-h-screen", "transition-[padding-left]", "duration-100");
const backdropClass = clsx("fixed", "top-0", "left-0", "right-0", "bottom-0", ...);

// 변경 후
const containerClass = clsx("relative", "h-full", "transition-[padding-left]", "duration-100");
const backdropClass = clsx("absolute", "top-0", "left-0", "right-0", "bottom-0", ...);
// ※ Chrome 84 호환을 위해 inset-0 사용 안 함
```

**구조 (변경 없음, 기존 유지):**
```tsx
<div class="relative h-full ..." style={{ paddingLeft: ... }}>
  {children}
  <Show when={...}>
    <div class="absolute top-0 left-0 right-0 bottom-0 ..." />  {/* Backdrop */}
  </Show>
</div>
```

### Sidebar.tsx
```tsx
// 변경 전
const baseClass = clsx("fixed", "top-0", "left-0", "bottom-0", ...);

// 변경 후
const baseClass = clsx("absolute", "top-0", "left-0", "bottom-0", ...);
```

### App.tsx (데모)
```tsx
// 변경 전
<div class="relative h-96 overflow-hidden ...">
  <SidebarContainer class="min-h-full">
    <Sidebar class="!fixed !h-96">
    ...
    <main class="flex-1 p-4">

// 변경 후
<div class="h-96">
  <SidebarContainer>  {/* h-full이 기본값 */}
    <Sidebar>  {/* 오버라이드 제거 */}
    ...
    <main class="h-full p-4 overflow-auto">  {/* 사용자가 직접 overflow-auto 적용 */}
```

## 미결 사항

(없음 - 모든 사항 결정 완료)

## 구현 체크리스트

- [ ] `SidebarContainer.tsx`:
  - [ ] `flex`, `flex-col`, `min-h-screen` 제거
  - [ ] `relative`, `h-full` 추가
  - [ ] backdrop `fixed` → `absolute` (top/left/right/bottom-0 유지)
  - [ ] JSDoc 주석 업데이트 (부모 높이 지정 필요, 콘텐츠 overflow-auto 사용자 책임 안내)
- [ ] `Sidebar.tsx`:
  - [ ] `fixed` → `absolute`
  - [ ] JSDoc 주석 업데이트
- [ ] `App.tsx`:
  - [ ] 부모 div에서 `relative`, `overflow-hidden` 제거
  - [ ] `SidebarContainer class="min-h-full"` 제거
  - [ ] `Sidebar class="!fixed !h-96"` 오버라이드 제거
  - [ ] `main`에 `h-full`, `overflow-auto` 추가
- [ ] 타입체크 및 린트 확인
- [ ] 데모 페이지에서 동작 확인 (데스크탑/모바일)
