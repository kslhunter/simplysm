# 인쇄, PDF 출력 매뉴얼

화면 데이터를 종이로 인쇄하거나 PDF 로 받는 작업.
`SdPrintProvider` 와 인쇄 템플릿(`<domain>.print-template.ts`) 으로 처리.
**인쇄(브라우저 출력)와 PDF(이미지 캡처)는 페이지 분할 방식이 달라** 아래 함정을 함께 적용.

## 인쇄 템플릿을 작성하려면

`<domain>.print-template.ts` 에 `SdPrint` 를 구현한 컴포넌트를 둠. 인쇄, PDF 가 이 컴포넌트를 화면 밖에 임시로 렌더해 캡처함.

```ts
import { ChangeDetectionStrategy, Component, input, signal, ViewEncapsulation } from "@angular/core";
import { DecimalPipe } from "@angular/common";
import type { SdPrint } from "@simplysm/angular";

@Component({
  selector: "app-invoice-print-template",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [DecimalPipe],
  template: `
    @for (item of items(); track item.id) {
      <div class="_page">
        <h1 style="text-align: center">거래명세서</h1>
        <!-- ... 본문 ... -->
      </div>
    }
  `,
  styles: [
    /* language=SCSS */ `
      app-invoice-print-template {
        display: block;
        background: white;

        ._page {
          padding: 50px;
          page-break-after: always;
        }
      }
    `,
  ],
})
export class InvoicePrintTemplate implements SdPrint {
  items = input.required<IInvoice[]>();
  initialized = signal(true);
}
```

- `implements SdPrint` — `initialized: Signal<boolean>` 보유 필수.
  - provider 가 `initialized()` 가 true 가 될 때까지 기다린 뒤 인쇄/캡처함.
  - 정적 템플릿은 `signal(true)` 로 즉시 완료, 템플릿이 자체 데이터 로딩을 하면 로딩 완료 후 `initialized.set(true)`.
- 데이터는 `input` 으로 받음 — 호출 측이 `inputs` 로 주입.
- `encapsulation: ViewEncapsulation.None` — 인쇄 시 전역으로 attach 되므로 스타일 캡슐화를 끔.
- 페이지 단위 div(`._page`) 에 `page-break-after: always` 를 주면 인쇄 시 항목마다 페이지가 나뉨.

## 화면에서 인쇄하려면

`SdPrintProvider.printAsync` 에 템플릿 타입과 input 을 넘김. 브라우저 인쇄 대화상자가 뜸.

```ts
private readonly _sdPrint = inject(SdPrintProvider);

await this._sdPrint.printAsync({
  type: InvoicePrintTemplate,
  inputs: { items: this.items() },
});
```

- 둘째 인자 `options` 로 `{ size, margin }` 조정 가능 (기본 `size: "A4 auto"`, `margin: "0"`). `size` 는 CSS `@page size` 로 들어감.
- 페이지 분할은 템플릿의 CSS `page-break-after`/`page-break-before` 로 제어 — `printAsync` 는 `window.print()` 를 호출하므로 브라우저 페이지 규칙을 따름.

## PDF 로 받으려면

`getPdfBufferAsync` 가 `Uint8Array`(PDF) 를 반환. `downloadBlob` 으로 파일 저장.

```ts
import { downloadBlob } from "@simplysm/core-browser";

const pdfBuffer = await this._sdPrint.getPdfBufferAsync({
  type: InvoicePrintTemplate,
  inputs: { items: [item] },
});
downloadBlob(
  new Blob([pdfBuffer], { type: "application/pdf" }),
  `${item.code}_거래명세서.pdf`,
);
```

- 둘째 인자 `options` 로 `{ orientation, pageSize }` 조정.
  - 공개 입력값은 `orientation: "portrait" | "landscape"` 이며, 미지정 시 portrait 로 동작함.
  - 기본 `pageSize` 는 `"a4"`.
- **PDF 페이지 분할은 인쇄와 다름** — `getPdfBufferAsync` 는 템플릿 안의 **`.page` 클래스**(언더스코어 없음) 엘리먼트를 각각 한 페이지로 캡처함. `.page` 가 하나도 없으면 **전체를 1페이지**로 만듦.
  - 다중 페이지 PDF 가 필요하면 페이지 div 에 `.page` 클래스를 줌 (인쇄용 `._page` + `page-break` 와는 별개의 클래스).
  - 또는 위 예시처럼 항목마다 `getPdfBufferAsync` 를 **단건 호출**해 1페이지 PDF 를 여러 개 만듦.

## PDF 를 이메일로 보내려면

생성한 PDF 버퍼를 메일 서비스의 첨부로 보냄. 메일 발송은 롤백 불가하므로, 다건은 **전원 PDF 를 먼저 생성한 뒤 발송**해 생성 단계 실패 시 한 건도 보내지 않게 함.

```ts
// 1) 전원 PDF 선생성 — 여기서 실패하면 발송은 시작도 안 함
const prepared: { item: IInvoice; pdfBuffer: Uint8Array }[] = [];
for (const item of targets) {
  const pdfBuffer = await this._sdPrint.getPdfBufferAsync({
    type: InvoicePrintTemplate,
    inputs: { items: [item] },
  });
  prepared.push({ item, pdfBuffer });
}

// 2) 발송 — 중간 실패 시 성공/실패/미발송 경계를 담아 throw
const sentCodes: string[] = [];
for (let i = 0; i < prepared.length; i++) {
  const { item, pdfBuffer } = prepared[i];
  try {
    await this._appService.mail.send({
      to: item.email,
      subject: "거래명세서",
      html: "",
      attachments: [{ filename: "거래명세서.pdf", content: pdfBuffer }],
    });
  } catch (err) {
    const notSent = prepared.slice(i + 1).map((p) => p.item.code);
    throw new Error(
      `전송 중단 — 성공 ${sentCodes.length}건, 실패 ${item.code}, 미발송 ${notSent.length}건`,
    );
  }
  sentCodes.push(item.code);
}
```

- 메일 서비스(`mail.send`) 는 서버 서비스 — 호출 컨벤션은 [client-service.md](./client-service.md).
- 첨부 대상이 누락된 항목(예: 이메일 미설정) 이 있으면 발송 전에 막고 대상 목록을 안내 — 일부만 보내고 나머지를 건너뛰지 않음.

## 지킬 것

- 인쇄 템플릿은 `implements SdPrint` + `initialized` 신호를 둠 — 누락 시 provider 가 렌더 완료를 못 기다려 빈 출력이 됨.
- 인쇄 페이지 분할은 CSS `page-break`, PDF 페이지 분할은 `.page` 클래스 — 둘은 별개. PDF 가 한 장으로 뭉치면 `.page` 클래스 여부부터 확인.
- 인쇄/PDF 호출은 `busyCount` + `_sdToast.try` 로 감쌈 ([client-component.md](./client-component.md) 의 '에러, 토스트').
