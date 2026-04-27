# `SdCalendar`

> **읽어야 하는 상황**: 캘린더에 항목을 날짜별로 배치할 때.

월별 달력 컴포넌트. `items`를 날짜 기준으로 분류하여 각 날짜 셀에 표시한다.

```typescript
@Component({ selector: "sd-calendar", ... })
export class SdCalendar<T>
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `items` | input (required) | `T[]` | 표시할 항목 배열 |
| `getItemDateFn` | input (required) | `(item: T, index: number) => DateOnly` | 각 항목의 날짜를 반환하는 함수 |
| `yearMonth` | input | `DateOnly` | 표시할 연월 (기본값: 현재 월의 1일) |
| `weekStartDay` | input | `number` | 주 시작 요일 (0=일, 1=월, 기본값: `0`) |
| `minDaysInFirstWeek` | input | `number` | 첫 주 최소 날짜 수 (기본값: `1`) |

콘텐츠 템플릿: `ng-template[itemOf]`로 날짜별 항목을 렌더링한다 (`SdItemOfTemplateContext<T>` 타입).

## Usage

```html
<sd-calendar
  [items]="schedules()"
  [getItemDateFn]="getScheduleDate"
  [(yearMonth)]="currentMonth"
>
  <ng-template itemOf let-item>
    <div class="tx-sm">{{ item.title }}</div>
  </ng-template>
</sd-calendar>
```
