# `SdPrintProvider`

> **읽어야 하는 상황**: 인쇄하거나 PDF를 생성할 때.

인쇄 및 PDF 생성 프로바이더. jsPDF + html-to-image 사용.

```typescript
@Injectable({ providedIn: "root" })
class SdPrintProvider {
  async printAsync<T extends SdPrint>(
    template: SdPrintInput<T>,
    options?: { size?: string; margin?: string },
  ): Promise<void>;

  async getPdfBufferAsync<T extends SdPrint>(
    template: SdPrintInput<T>,
    options?: { orientation?: "portrait" | "landscape"; pageSize?: string },
  ): Promise<Uint8Array>;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `printAsync(template, options?)` | method | `(...) => Promise<void>` | 브라우저 인쇄 대화상자 열기. `size` 기본값 `"A4 auto"`, `margin` 기본값 `"0"` |
| `getPdfBufferAsync(template, options?)` | method | `(...) => Promise<Uint8Array>` | PDF 바이너리 생성. `.page` 클래스 요소 단위로 페이지 분할 |
