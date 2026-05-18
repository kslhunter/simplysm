# @simplysm/angular — visual

데이터 시각화/표시 전용 컴포넌트.

## `<sd-label>`

배지 형 라벨. `theme`(테마 컬러), `color` (커스텀), `clickable`. content projection.

## `<sd-note>`

알림 박스 형. `theme`, `size`, `inset`. content projection.

## `<sd-progress>`

```html
<sd-progress [theme]="'primary'" [value]="60" [size]="'sm'" [inset]="false" />
```

`theme` (required), `value: number` (0-100, required), `size`, `inset`.

## `<sd-calendar<T>>`

월별 달력 렌더. 

- 필수: `items: T[]`, `getItemDateFn: (item, idx) => DateOnly`.
- `yearMonth = input(new DateOnly().setDay(1))` (해당 월).
- `weekStartDay = 0`, `minDaysInFirstWeek = 1`.

## `<sd-barcode>`

`bwip-js` 래퍼. `type: BarcodeType` (required), `value: string`. `BarcodeType` 은 bwip-js 지원 심볼로지 union (`code128`, `qrcode`, `ean13`, ... — `sd-barcode.ts` 참조).

## `<sd-echarts>`

ECharts 5/6 래퍼.

```html
<sd-echarts [option]="option" [notMerge]="false" [loading]="false" />
```

`option: echarts.EChartsOption` (required).
