# `SdEcharts`

> **읽어야 하는 상황**: ECharts 차트를 표시할 때.

Apache ECharts 차트 래퍼 컴포넌트. 호스트 요소의 크기 변경을 감지하여 자동으로 차트를 리사이즈한다.

```typescript
@Component({ selector: "sd-echarts", ... })
export class SdEcharts
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `option` | input (required) | `echarts.EChartsOption` | ECharts 옵션 객체 |
| `notMerge` | input | `boolean` | `setOption` 호출 시 전체 교체 여부 (기본값: `false`) |
| `loading` | input | `boolean` | 로딩 오버레이 표시 (기본값: `false`) |

SVG 렌더러를 사용하며 (`renderer: "svg"`), `afterNextRender`에서 초기화된다.

## Usage

```html
<sd-echarts [option]="chartOption()" style="height: 300px" />
```

```typescript
chartOption = computed<echarts.EChartsOption>(() => ({
  xAxis: { type: "category", data: this.labels() },
  yAxis: { type: "value" },
  series: [{ type: "bar", data: this.values() }],
}));
```
