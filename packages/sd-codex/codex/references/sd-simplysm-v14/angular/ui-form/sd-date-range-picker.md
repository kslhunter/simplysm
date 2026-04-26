# `SdDateRangePicker`

> **읽어야 하는 상황**: 날짜 범위(일/월/범위 모드)를 선택할 때.

날짜 범위 선택 컴포넌트. 기간 유형(`일`/`월`/`범위`)을 선택하고 `from`/`to` 날짜를 입력한다.

```typescript
@Component({ selector: "sd-date-range-picker", ... })
export class SdDateRangePicker
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `periodType` | model | `"일" \| "월" \| "범위"` | 기간 유형 (기본값: `"범위"`) |
| `from` | model | `DateOnly \| undefined` | 시작 날짜 |
| `to` | model | `DateOnly \| undefined` | 종료 날짜 |
| `required` | input | `boolean` | 필수 여부 (기본값: `false`) |

## Usage

```html
<sd-date-range-picker
  [(periodType)]="searchPeriodType"
  [(from)]="searchFrom"
  [(to)]="searchTo"
/>
```
