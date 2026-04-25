# `SdBarcode`

> **읽어야 하는 상황**: 바코드를 생성하여 표시할 때.

바코드 생성 컴포넌트. bwip-js 라이브러리를 사용하여 SVG 바코드를 렌더링한다.

```typescript
@Component({ selector: "sd-barcode", ... })
export class SdBarcode
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `type` | input (required) | `BarcodeType` | 바코드 종류 |
| `value` | input | `string \| undefined` | 바코드에 인코딩할 텍스트 |

## Related Types

### `BarcodeType`

bwip-js가 지원하는 바코드 형식 문자열 union type. 주요 값:

- `"code128"` — Code 128
- `"code39"` — Code 39
- `"ean13"` — EAN-13
- `"qrcode"` — QR Code
- `"datamatrix"` — Data Matrix

(전체 목록은 bwip-js 문서 참조)

## Usage

```html
<sd-barcode [type]="'code128'" [value]="item.barcode" />
<sd-barcode [type]="'qrcode'" [value]="item.qrUrl" />
```
