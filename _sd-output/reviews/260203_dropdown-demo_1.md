# Dropdown 데모 페이지 코드 리뷰

## 개요

### 리뷰 대상
- `packages/solid-demo/src/pages/overlay/DropdownPage.tsx`
- `packages/solid-demo/src/pages/Home.tsx`
- `packages/solid-demo/src/main.tsx`

### 리뷰 범위
- Dropdown 컴포넌트 데모 페이지 구현
- 라우트 및 사이드바 메뉴 추가

### 제외 사항
- Dropdown 컴포넌트 자체 (`packages/solid/src/components/overlay/Dropdown.tsx`)

## 발견 사항

### 1. 접근성 (사용성) - Minor

**위치:** `DropdownPage.tsx:58-66`, `94-102`, `130-136`, `170-178`

**현재 코드:**
```tsx
<li
  class="cursor-pointer px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700"
  onClick={() => { ... }}
>
  {item}
</li>
```

**문제점:**
- 메뉴 항목에 `role="menuitem"`, `tabIndex` 속성 누락
- 키보드 탐색 불가 (Enter 키로 선택 불가)
- 스크린 리더 지원 미흡

**수정 방향:**
- `role="menuitem"`, `tabIndex={0}` 추가
- `onKeyDown` 핸들러 추가 (Enter/Space 키 지원)

**결정:** 접근성 추가

---

### 2. 다크 모드 일관성 (가독성) - Minor

**위치:** `DropdownPage.tsx:78`

**현재 코드:**
```tsx
class="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50"
```

**문제점:**
- 다크 모드 스타일 누락
- 다른 UI 요소들과 시각적 일관성 부족

**수정 방향:**
```tsx
class="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-800"
```

**결정:** 다크 모드 스타일 추가

---

## 긍정적 사항

### 코딩 지침 준수
- ✅ SolidJS 패턴 올바르게 사용 (`createSignal`, `For`)
- ✅ `@simplysm/solid`에서 올바른 import 경로 사용
- ✅ 기존 데모 페이지 패턴과 일관성 유지

### 성능
- ✅ 상수 배열 (`menuItems`, `longMenuItems`)을 컴포넌트 외부에 정의
- ✅ 불필요한 `createMemo` 사용 없음 (단순 시그널 접근)

### 안정성
- ✅ nullable 조건 명시적 처리 (`!= null`)
- ✅ `preventDefault()` 올바르게 사용 (컨텍스트 메뉴)

### 유지보수성
- ✅ 섹션별로 명확히 분리
- ✅ 의미 있는 변수명 사용 (`basicOpen`, `contextPosition` 등)

### 가독성
- ✅ 한글 설명 텍스트로 사용자 안내
- ✅ 일관된 들여쓰기 및 포맷팅
