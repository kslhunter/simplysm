# 인쇄·PDF 출력 매뉴얼

화면의 데이터를 종이로 인쇄하거나 PDF 파일로 받는 작업을 다룸. 인쇄·PDF 모두 `@simplysm/sd-angular` 의 `SdPrintProvider` 와, 화면과 별도로 만드는 **인쇄 템플릿 컴포넌트**(`XxxPrintTemplate.ts`) 한 쌍으로 처리함. 화면(목록/모달)에서 인쇄 버튼을 누르면 provider 가 이 템플릿을 화면 밖에 임시로 렌더링한 뒤, 브라우저 인쇄 대화상자를 띄우거나(PDF 면 이미지로 캡처해) PDF 버퍼를 만듦.

**인쇄(브라우저 출력)와 PDF(이미지 캡처)는 페이지가 나뉘는 방식이 서로 다름.** 이 차이가 가장 흔한 함정이므로 아래 각 절에서 함께 설명함.

## 인쇄 템플릿 컴포넌트를 작성하려면

`XxxPrintTemplate.ts` 에 `ISdPrint` 를 구현한 standalone 컴포넌트를 둠. 화면 컴포넌트와 동일한 `@Component` 규약(standalone, `OnPush`, `ViewEncapsulation.None`, 인라인 template, `selector: "app-*"`, imports 명시)을 따름.

입력 데이터를 호출 측에서 이미 다 가지고 있다면, `input` 으로 받아 즉시 그리면 됨. 아래는 simplysm-ts 의 급여명세서 인쇄 템플릿(`PaystubPrintTemplate.ts`)을 간추린 형태임.

```ts
import { $signal, ISdPrint, transformBoolean } from "@simplysm/sd-angular";
import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { DecimalPipe } from "@angular/common";

@Component({
  selector: "app-paystub-print-template",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [DecimalPipe],
  template: `
    @for (
      item of items();
      track item.userName + "_" + item.workYearMonth.toFormatString("yyyyMM")
    ) {
      <div class="_page">
        <h1 style="text-align: center">
          {{ item.workYearMonth.toFormatString("yyyy년 M월분 급여명세서") }}
        </h1>
        <!-- ... 본문 ... -->
      </div>
    }
  `,
  styles: [
    /* language=SCSS */ `
      app-paystub-print-template {
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
export class PaystubPrintTemplate implements ISdPrint {
  items = input.required<IPaystubModalInputParamItem[]>();
  useStamp = input(undefined, { transform: transformBoolean });

  initialized = $signal(true);
}
```

지켜야 할 점:

- **`implements ISdPrint` + `initialized` 시그널이 필수임.** `ISdPrint` 는 `initialized: Signal<boolean>` 하나를 요구함. provider 는 `initialized()` 가 `true` 가 될 때까지 기다린 뒤에야 인쇄/캡처를 실행함. 위처럼 그릴 데이터를 input 으로 다 받아 즉시 렌더하면 `initialized = $signal(true)` 로 시작함.
- **`ViewEncapsulation.None`** 으로 둠. provider 가 이 컴포넌트를 `<body>` 직하에 attach 한 뒤 전역 인쇄 스타일을 적용하므로, 스타일 캡슐화를 끄지 않으면 인쇄 결과에 스타일이 먹지 않음.
- **그릴 데이터는 `input` 으로 받음.** 호출 측(화면)이 `inputs` 객체로 주입함. input 이름과 `inputs` 키가 1:1로 대응함.
- 인쇄 시 **항목마다 페이지를 나누려면**, 항목 단위 div 에 `page-break-after: always` 를 줌. 한 항목이 페이지 경계에서 잘리지 않게 하려면 `page-break-inside: avoid` 를 함께 둠(라벨 인쇄에서 특히 중요 — 아래 라벨 절 참고).

## 인쇄 템플릿이 직접 데이터를 조회하게 하려면

호출 측이 키(ID 목록)만 넘기고, 템플릿이 ORM 으로 직접 본문을 읽어오게 할 수도 있음. 이때는 `OnInit` 을 구현하고 `initialized` 를 `false` 로 시작해, **로딩이 끝난 뒤에 `initialized.set(true)`** 로 바꿈. provider 는 그때까지 인쇄/캡처를 보류하므로 빈 출력이 나오지 않음.

centurymes 의 로케이션 라벨 템플릿(`LocationLabelPrintTemplate.ts`)이 이 방식임.

```ts
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  ViewEncapsulation,
} from "@angular/core";
import { $signal, ISdPrint, SdBarcodeControl } from "@simplysm/sd-angular";
import { AppOrmProvider } from "@centurymes/client-common";

@Component({
  selector: "app-location-label-print-template",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdBarcodeControl],
  template: `
    @for (item of items(); track $index) {
      <div class="label">
        <div class="tx-center">[{{ item.type }}] {{ item.name }}</div>
        <div class="barcode">
          <sd-barcode [type]="'code128'" [value]="item.code" />
          <div>{{ item.code }}</div>
        </div>
      </div>
    }
  `,
  styles: [
    /* language=SCSS */ `
      app-location-label-print-template {
        display: block;
        font-size: 6mm;

        > .label {
          page-break-inside: avoid;
          page-break-after: always;
          width: 80mm;
          height: 40mm;
          overflow: hidden;
          padding: 2mm 0;
        }
      }
    `,
  ],
})
export class LocationLabelPrintTemplate implements ISdPrint, OnInit {
  #appOrm = inject(AppOrmProvider);

  initialized = $signal(false); // 로딩 끝나기 전에는 false
  itemIds = input.required<number[]>(); // 호출 측은 ID 목록만 넘김
  items = $signal<IItem[]>([]);

  async ngOnInit() {
    await this.#appOrm.connectAsync(async (db) => {
      this.items.set(
        await db.location
          .where((item) => [db.qh.in(item.id, this.itemIds())])
          .select<IItem>((item) => ({ type: item.type, code: item.code, name: item.name }))
          .resultAsync(),
      );
    });

    this.initialized.set(true); // 로딩 완료 후 비로소 인쇄 허용
  }
}
```

지켜야 할 점:

- `initialized = $signal(false)` 로 시작하고, `ngOnInit` 안의 조회가 **모두 끝난 뒤** `initialized.set(true)` 를 호출함. 이 순서가 바뀌거나 누락되면 provider 가 빈 화면을 캡처함.
- ORM 접속·쿼리 작성법은 [orm.md](./orm.md) 를 따름. 여기서는 `#appOrm.connectAsync` 안에서 `db.qh.in(...)` 으로 ID 목록을 거르는 정도만 보면 됨.

## 화면에서 인쇄하려면

화면 컴포넌트에서 `SdPrintProvider` 를 주입하고, 인쇄 버튼 핸들러에서 `printAsync({ type, inputs })` 를 호출함. 브라우저 인쇄 대화상자가 뜨고, 사용자가 프린터/PDF 저장을 선택함.

centurymes 의 로케이션 목록 화면(`LocationPage.ts`)에서 선택된 항목의 라벨을 인쇄하는 예임.

```ts
#sdPrint = inject(SdPrintProvider);
#sdToast = inject(SdToastProvider);

async onPrintLocationLabelsButtonClick() {
  const selectedItems = this.selectedItems().filter((item) => item.type !== "외부");
  if (selectedItems.length === 0) {
    this.#sdToast.danger("선택된 자료중 인쇄할 수 있는 자료가 없습니다.");
    return;
  }

  await this.#sdPrint.printAsync({
    type: LocationLabelPrintTemplate,
    inputs: {
      itemIds: selectedItems.map((item) => item.id),
    },
  });
}
```

`inputs` 의 키는 템플릿의 `input` 이름과 정확히 일치해야 함(여기서는 `itemIds`). 위처럼 ID만 넘기면, 본문 조회는 템플릿의 `ngOnInit` 이 맡음.

### 용지 크기·여백을 바꾸려면

`printAsync` 의 둘째 인자로 `{ size, margin }` 을 줌. 기본값은 `size: "A4 auto"`, `margin: "0"` 이며, `size` 는 CSS `@page size` 로, `margin` 은 `@page margin` 으로 들어감. 가로 방향 A4 로 인쇄하려면 다음과 같이 함(centurymes `OutsourcingOutboundTagPrintingPage.ts`).

```ts
await this.#sdPrint.printAsync(
  {
    type: OutsourcingOutboundTagPrintTemplate,
    inputs: {/* ... */},
  },
  {
    size: "A4 landscape",
  },
);
```

페이지가 어디서 나뉘는지는 이 옵션이 아니라 **템플릿 CSS 의 `page-break-after` / `page-break-before` / `page-break-inside`** 가 결정함. `printAsync` 는 내부적으로 `window.print()` 를 호출하므로 브라우저의 페이지 분할 규칙을 그대로 따름.

## PDF 파일로 받으려면

`getPdfBufferAsync({ type, inputs })` 는 PDF 바이트 버퍼를 반환함. 이를 `Blob` 으로 감싸 `blob.download(파일명)` 으로 저장함(`download` 는 `@simplysm/sd-core-browser` 가 `Blob` 에 추가한 확장 메서드).

simplysm-ts 의 급여명세서 모달(`PaystubModal.ts`)에서 사람별로 1장짜리 PDF 를 만들어 각각 내려받는 예임.

```ts
#sdPrint = inject(SdPrintProvider);
#sdToast = inject(SdToastProvider);

async onPdfDownloadPerPageButtonClick() {
  this.busyCount.update((v) => v + 1);

  await this.#sdToast.try(async () => {
    await this.items().parallelAsync(async (item) => {
      const pdfBuf = await this.#sdPrint.getPdfBufferAsync({
        type: PaystubPrintTemplate,
        inputs: {
          items: [item],   // 한 사람만 넘겨 1장짜리 PDF 로
        },
      });
      const pdfBlob = new Blob([pdfBuf], { type: "application/pdf" });
      pdfBlob.download(
        `${item.userName}_${item.workYearMonth.toFormatString("yyMM")}_급여명세서.pdf`,
      );
    });
  });

  this.busyCount.update((v) => v - 1);
}
```

**PDF 의 페이지 분할은 인쇄와 규칙이 다름.** `getPdfBufferAsync` 는 템플릿 안에서 **`.page` 클래스(언더스코어 없음)** 를 가진 엘리먼트를 각각 한 페이지(한 장의 이미지)로 캡처함. `.page` 가 하나도 없으면 **컴포넌트 전체를 1페이지**로 만듦.

- 따라서 인쇄용 `page-break-after`/`._page` 만 둔 템플릿을 그대로 PDF 로 뽑으면 **여러 항목이 한 장에 뭉침.** PDF 가 한 장으로 합쳐지면 가장 먼저 `.page` 클래스 유무를 확인함.
- 다중 페이지 PDF 가 필요하면 두 가지 방법이 있음.
  1. 페이지 단위 div 에 `.page` 클래스를 부여함. centurymes 의 구매발주서 템플릿(`OutsourcingPurchaseOrderPaperPrintTemplate.ts`)은 한 장짜리 문서라 `<div class="page">` 하나로 감싸고 그 CSS(`> .page { padding: 10mm; ... }`)만 둠.
  2. 위 급여명세서 예처럼 **항목마다 `getPdfBufferAsync` 를 단건 호출**해 1페이지 PDF 를 여러 개 만듦. 여러 사람을 한 번에 처리할 때는 `parallelAsync` 로 묶음.

### 인쇄용 CSS 와 PDF 용 클래스를 함께 쓰려면

한 템플릿을 인쇄와 PDF 양쪽에서 쓴다면, 항목 div 에 **`page-break-*`(인쇄용) 와 `.page` 클래스(PDF용)를 둘 다** 두어야 양쪽 모두에서 항목마다 페이지가 나뉨. 인쇄용 `._page` 와 PDF용 `.page` 는 별개의 클래스이므로 혼동하지 않음. 둘째 인자로 `{ orientation: "landscape" }` 를 주면 PDF 도 가로 방향으로 만듦(기본 `"portrait"`).

## PDF 를 이메일로 보내려면

생성한 PDF 버퍼를 메일 서비스의 첨부로 보냄. simplysm-ts `PaystubModal.ts` 는 사람별 PDF 를 만들어 각자의 메일로 보냄.

```ts
#appService = inject(AppServiceProvider);

async onPdfSendToEmailButtonClick() {
  // 1) 발송 전에 첨부 대상이 누락된 항목을 먼저 막는다
  const noEmailItems = this.items().filter((item) => item.userEmail === undefined);
  if (noEmailItems.length > 0) {
    this.#sdToast.danger(
      "이메일 주소가 설정되지 않은 사용자가 있습니다.\n" +
        noEmailItems.map((item) => "- " + item.userName).join("\n"),
    );
    return;
  }

  this.busyCount.update((v) => v + 1);

  await this.#sdToast.try(async () => {
    await this.items().parallelAsync(async (item) => {
      const pdfBuf = await this.#sdPrint.getPdfBufferAsync({
        type: PaystubPrintTemplate,
        inputs: { items: [item] },
      });

      await this.#appService.smtpClient().sendByConfig("DEFAULT", {
        to: item.userEmail!,
        subject: `${item.workYearMonth.toFormatString("yyyy년 MM월분")} 급여명세서`,
        html: "",
        attachments: [
          {
            filename: `${item.workYearMonth.toFormatString("yyyy년 MM월분")} 급여명세서.pdf`,
            content: pdfBuf,   // getPdfBufferAsync 가 돌려준 버퍼를 그대로 첨부
          },
        ],
      });
    });

    this.#sdToast.success("전송되었습니다.");
  });

  this.busyCount.update((v) => v - 1);
}
```

지켜야 할 점:

- **첨부 대상이 누락된 항목(예: 이메일 미설정)은 발송 전에 막고** 대상 목록을 토스트로 안내함. 일부만 보내고 나머지를 조용히 건너뛰지 않음.
- 메일 발송(`smtpClient().sendByConfig`)은 서버 서비스 호출임. 서비스 클라이언트 주입·호출 컨벤션은 [service.md](./client-service.md) 를 따름.

## 인쇄/PDF 호출을 안전하게 감싸려면

- 인쇄·PDF 생성은 화면이 멈춰 보일 수 있는 작업이므로, 화면의 `busyCount` 시그널을 올렸다 내려 진행 표시를 띄움(`busyCount.update((v) => v + 1)` … `- 1`). `provider` 자체도 전역 busy 카운트를 올리지만, 화면 단위 표시는 화면이 직접 관리함.
- 호출 본문은 `SdToastProvider.try(async () => { ... })` 로 감쌈. 안에서 던진 예외가 자동으로 에러 토스트로 표시되므로, 인쇄/메일 실패를 사용자에게 그대로 노출할 수 있음. 토스트 사용법은 [component.md](./client-component.md) 의 '에러·토스트' 를 따름.

## 지킬 것

- 인쇄 템플릿은 **`implements ISdPrint` + `initialized` 시그널**을 반드시 둠. 누락하면 provider 가 렌더 완료를 못 기다려 빈 출력이 됨.
- 템플릿이 직접 데이터를 조회하면 **`initialized` 를 `false` 로 시작하고 로딩 완료 후 `set(true)`** 함. 순서가 바뀌면 빈 캡처가 나옴.
- **인쇄 페이지 분할은 CSS `page-break-*`, PDF 페이지 분할은 `.page` 클래스** — 둘은 별개임. PDF 가 한 장으로 뭉치면 `.page` 클래스부터 확인함.
- 다건 메일 전송은 **첨부 누락 항목을 먼저 막고** 시작함 — 일부만 보내고 나머지를 건너뛰지 않음.
- 인쇄/PDF 호출은 `busyCount` + `SdToastProvider.try` 로 감쌈.
