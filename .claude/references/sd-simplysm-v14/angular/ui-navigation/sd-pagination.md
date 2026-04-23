# `SdPagination`

페이지네이션 컴포넌트. 현재 페이지와 전체 페이지 수를 표시하고 네비게이션을 제공한다.

```typescript
@Component({ selector: "sd-pagination", ... })
export class SdPagination
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `currentPage` | model | `number` | 현재 페이지 (0-based, 기본값: `0`) |
| `totalPageCount` | input | `number` | 전체 페이지 수 (기본값: `0`) |
| `visiblePageCount` | input | `number` | 한 번에 표시할 페이지 버튼 수 (기본값: `10`) |

## Usage

```html
<sd-pagination
  [(currentPage)]="searchParams.page"
  [totalPageCount]="totalPageCount()"
  (currentPageChange)="onPageChange()"
/>
```
