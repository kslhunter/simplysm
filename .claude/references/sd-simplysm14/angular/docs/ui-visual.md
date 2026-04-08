# UI - Visual

## `SdLabel`

라벨 컴포넌트. 테마 색상과 클릭 가능 여부를 지원한다.

```typescript
@Component({ selector: "sd-label" })
class SdLabel {
  clickable = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `clickable` | `boolean` | `false` | 클릭 가능 여부 |

호스트 속성: `data-sd-theme` (primary, secondary, info, success, warning, danger, gray, blue-gray)

## `SdNote`

노트/알림 메시지 컴포넌트.

```typescript
@Component({ selector: "sd-note" })
class SdNote {
  inset = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `inset` | `boolean` | `false` | 삽입 스타일 (테두리 없음) |

호스트 속성: `data-sd-theme`

## `SdProgress`

진행률 바 컴포넌트.

```typescript
@Component({ selector: "sd-progress" })
class SdProgress {
  theme = input.required<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray">();
  value = input.required<number>();
  inset = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `theme` | `string` | required | 테마 색상 |
| `value` | `number` | required | 진행률 (0-100) |
| `inset` | `boolean` | `false` | 삽입 스타일 |

## `SdCalendar`

캘린더 컴포넌트. 항목을 날짜별로 배치한다.

```typescript
@Component({ selector: "sd-calendar" })
class SdCalendar<T> {
  items = input.required<T[]>();
  getItemDateFn = input.required<(item: T, index: number) => DateOnly>();
  yearMonth = input(new DateOnly().setDay(1));
  weekStartDay = input(0);
  minDaysInFirstWeek = input(1);
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `items` | `T[]` | required | 표시할 항목 |
| `getItemDateFn` | `(item, index) => DateOnly` | required | 항목에서 날짜 추출 함수 |
| `yearMonth` | `DateOnly` | 이번 달 1일 | 표시할 연월 |
| `weekStartDay` | `number` | `0` | 주 시작 요일 (0=일요일) |
| `minDaysInFirstWeek` | `number` | `1` | 첫째 주 최소 일수 |

## `SdBarcode`

바코드 생성 컴포넌트. bwip-js 라이브러리를 사용한다.

```typescript
@Component({ selector: "sd-barcode" })
class SdBarcode {
  type = input.required<BarcodeType>();
  value = input.required<string>();
  scale = input(2);
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `BarcodeType` | required | 바코드 타입 |
| `value` | `string` | required | 바코드 값 |
| `scale` | `number` | `2` | 렌더링 스케일 |

### `BarcodeType`

bwip-js에서 지원하는 바코드 타입 문자열. 예: `"qrcode"`, `"code128"`, `"ean13"` 등.

## `SdEcharts`

ECharts 차트 래퍼 컴포넌트.

```typescript
@Component({ selector: "sd-echarts" })
class SdEcharts {
  option = input.required<echarts.EChartsOption>();
  notMerge = input(false);
  loading = input(false);
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `option` | `echarts.EChartsOption` | required | ECharts 옵션 |
| `notMerge` | `boolean` | `false` | 옵션 업데이트 시 병합하지 않고 교체 |
| `loading` | `boolean` | `false` | 로딩 표시 |
