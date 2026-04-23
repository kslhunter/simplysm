# ExcelXmlDrawingData

`drawing*.xml` 데이터 구조이다. 이미지 앵커 정보를 포함한다. 내부 구현에 사용된다.

```typescript
export interface ExcelXmlDrawingData {
  wsDr: {
    $: { "xmlns": string; "xmlns:a"?: string; "xmlns:r"?: string };
    twoCellAnchor?: {
      from?: { col: string[]; colOff?: string[]; row: string[]; rowOff?: string[] }[];
      to?: { col: string[]; colOff?: string[]; row: string[]; rowOff?: string[] }[];
      pic?: {
        nvPicPr?: { cNvPr?: { $: { id: string; name: string; descr?: string } }[]; cNvPicPr?: Array<{ "a:picLocks"?: Array<{ $: { noChangeAspect?: string } }> }> }[];
        blipFill?: { "a:blip"?: Array<{ $: { "r:embed": string } }>; "a:stretch"?: Array<{ "a:fillRect": unknown[] }> }[];
        spPr?: { "a:xfrm"?: Array<{ "a:off"?: Array<{ $: { x: string; y: string } }>; "a:ext"?: Array<{ $: { cx: string; cy: string } }> }>; "a:prstGeom"?: Array<{ "$": { prst: string }; "a:avLst": unknown[] }> }[];
      }[];
      clientData?: unknown[];
    }[];
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `wsDr.$` | `object` | 네임스페이스 |
| `wsDr.twoCellAnchor` | `Array \| undefined` | 두 셀 사이에 앵커된 이미지 목록 |
| `twoCellAnchor.from` | `Array \| undefined` | 시작 위치 (행/열/오프셋) |
| `twoCellAnchor.to` | `Array \| undefined` | 끝 위치 (행/열/오프셋) |
| `twoCellAnchor.pic` | `Array \| undefined` | 이미지 정보 (blip 관계 ID 포함) |
