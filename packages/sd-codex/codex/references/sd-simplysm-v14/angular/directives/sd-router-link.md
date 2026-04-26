# `SdRouterLink`

> **읽어야 하는 상황**: 라우터 네비게이션을 적용하고 Ctrl+클릭 새 창 열기를 지원할 때.

라우터 네비게이션 디렉티브. 일반 클릭은 라우터 네비게이션, Ctrl/Shift+클릭은 새 창, 팝업 윈도우에서는 팝업 형태로 열린다.

```typescript
@Directive({
  selector: "[sdRouterLink]",
  host: {
    "[style.cursor]": "option() ? 'pointer' : ''",
    "(click)": "onClick($event)",
  },
})
class SdRouterLink {
  option = input<{
    link: string;
    params?: Record<string, string>;
    window?: { width?: number; height?: number };
    outletName?: string;
    queryParams?: Record<string, string>;
  } | undefined>(undefined, { alias: "sdRouterLink" });
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `option` (`sdRouterLink`) | input | `{ link, params?, window?, outletName?, queryParams? } \| undefined` | 라우터 링크 옵션 |

## Option Fields

| Field | Type | Description |
|-------|------|-------------|
| `link` | `string` | 네비게이션 경로 |
| `params` | `Record<string, string> \| undefined` | 라우터 파라미터 |
| `window` | `{ width?, height? } \| undefined` | 팝업 윈도우 크기 (설정 시 팝업으로 열림) |
| `outletName` | `string \| undefined` | named outlet |
| `queryParams` | `Record<string, string> \| undefined` | 쿼리 파라미터 |
