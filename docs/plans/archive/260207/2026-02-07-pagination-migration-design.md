# Pagination 컴포넌트 마이그레이션 설계

## 개요

Angular `sd-pagination.control.ts`를 SolidJS로 마이그레이션한다.

## 디자인 결정

| 항목          | 결정                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------- |
| 카테고리      | `data` (Table, List와 같은 위치)                                                            |
| 페이지 번호   | 0-based (Angular 원본 유지, UI 표시만 +1)                                                   |
| API 스타일    | `page` + `onPageChange` 제어 컴포넌트 패턴                                                  |
| 버튼 스타일   | Button 컴포넌트 재사용 (theme=`base` 고정, variant: 현재 페이지 `outline` / 나머지 `ghost`) |
| theme/variant | 외부 노출 안 함 (내부 고정)                                                                 |
| size          | 외부 노출. Button `size` prop 전달 + Pagination `gap` 연동                                  |

## API

```tsx
export interface PaginationProps extends JSX.HTMLAttributes<HTMLElement> {
  page: number; // 현재 페이지 (0-based)
  onPageChange?: (page: number) => void; // 페이지 변경 콜백
  totalPages: number; // 전체 페이지 수
  displayPages?: number; // 한 번에 표시할 페이지 수 (기본 10)
  size?: "sm" | "lg"; // Button size + gap 연동
}
```

### 사용 예시

```tsx
const [page, setPage] = createSignal(0);

<Pagination page={page()} onPageChange={setPage} totalPages={50} />;
```

## 내부 구현

### 레이아웃

`<nav>` 요소, `inline-flex items-center` + size별 gap:

- 기본: `gap-1`
- sm: `gap-0.5`
- lg: `gap-1.5`

### 버튼 구성

| 버튼          | 아이콘              | 동작                       | disabled 조건    |
| ------------- | ------------------- | -------------------------- | ---------------- |
| 첫 페이지     | `IconChevronsLeft`  | `page → 0`                 | 첫 그룹일 때     |
| 이전 그룹     | `IconChevronLeft`   | `page → 이전 그룹 마지막`  | 첫 그룹일 때     |
| 페이지 번호   | 숫자 텍스트         | `page → 해당 페이지`       | -                |
| 다음 그룹     | `IconChevronRight`  | `page → 다음 그룹 첫 번째` | 마지막 그룹일 때 |
| 마지막 페이지 | `IconChevronsRight` | `page → totalPages - 1`    | 마지막 그룹일 때 |

### 페이지 그룹 계산 (Angular 로직 유지)

```
from = Math.floor(page / displayPages) * displayPages
to = Math.min(from + displayPages, totalPages)
pages = [from, from+1, ..., to-1]
```

### 현재 페이지 강조

- 현재 페이지: Button `variant="outline"`
- 나머지: Button `variant="ghost"`

## 파일 구조

- `packages/solid/src/components/data/Pagination.tsx`
- `packages/solid/src/index.ts` — export 추가
- `packages/solid-demo/src/pages/data/PaginationPage.tsx`
- `packages/solid-demo/src/pages/Home.tsx` — Data 섹션에 메뉴 추가
- 라우터에 PaginationPage 등록

## 데모 페이지 섹션

1. 기본 사용 (totalPages=20)
2. size 변형 (sm / 기본 / lg)
3. displayPages 커스텀 (5개씩 표시)
4. disabled 상태 (totalPages=0 또는 1)
