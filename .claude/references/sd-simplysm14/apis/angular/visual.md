# @simplysm/angular — visual

데이터 시각화/표시 전용 컴포넌트.

## `<sd-label>`

배지 형 라벨. `theme`(테마 컬러), `color` (커스텀 background), `clickable`. content projection.

## `<sd-note>`

알림 박스 형. `theme`, `size: "sm"|"lg"`, `inset`. content projection.

## `<sd-progress>`

```html
<sd-progress [theme]="'primary'" [value]="0.6" [size]="'sm'" [inset]="false" />
```

`theme` (required), `value: number` (required, **0~1 비율**), `size`, `inset`. 표시 텍스트는 `value | percent: "1.0-2"`, 진행바 폭은 `value*100%` (0~100 클램프).

## `<sd-calendar<T>>`

월별 달력 렌더. 6행 × 7열 고정. `<ng-template itemOf>` 로 각 셀의 아이템 렌더.

```html
<sd-calendar [items]="events" [getItemDateFn]="byDate" [yearMonth]="curMonth">
  <ng-template [itemOf]="events" let-item="item">
    <div>{{ item.title }}</div>
  </ng-template>
</sd-calendar>
```

- 필수 input: `items: T[]`, `getItemDateFn: (item, idx) => DateOnly`.
- `yearMonth = input(new DateOnly().setDay(1))` (해당 월).
- `weekStartDay = 0`, `minDaysInFirstWeek = 1`.
- 필수 content: `<ng-template [itemOf]="items">` (`SdItemOfTemplate`, ctx: `$implicit/item/index/depth`).

## `<sd-barcode>`

`bwip-js` 래퍼. `type: BarcodeType` (required), `value: string`. `BarcodeType` 은 bwip-js 지원 심볼로지 union (`code128`, `qrcode`, `ean13`, ... — 전체 목록은 `sd-barcode.ts` 참조).

```html
<sd-barcode [type]="'qrcode'" [value]="data" />
```

내부적으로 `bwipjs.toSVG`로 생성 후 `bypassSecurityTrustHtml`. value 빈 문자열/렌더 실패 시 빈 출력.

## `<sd-echarts>`

ECharts 5/6 래퍼.

```html
<sd-echarts [option]="option" [notMerge]="false" [loading]="false" />
```

- `option: echarts.EChartsOption` (required) — 변경 시 `chart.setOption(option, { notMerge })`.
- `notMerge` (default `false`).
- `loading` (default `false`) — `showLoading`/`hideLoading` 토글.
- `hostDirectives: SdResizeDirective` 로 호스트 리사이즈 감지 → `chart.resize()`. renderer `"svg"` 고정.
