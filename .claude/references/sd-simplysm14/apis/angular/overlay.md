# @simplysm/angular — 오버레이(모달·토스트·busy·인쇄)

화면에서 프로그래밍 방식으로 모달을 띄우거나, 토스트로 알림·진행률을 표시하거나, busy 인디케이터·인쇄/PDF 출력을 호출할 때 함께 읽히는 군. provider 는 모두 `providedIn: "root"`, 동적으로 body 에 attach 하므로 컴포넌트를 템플릿에 직접 둘 일은 거의 없음.

## SdModalProvider

`showAsync` 로 컴포넌트를 모달로 띄움. 컨텐츠 컴포넌트는 `SdModalContentDef<O>` 를 구현해야 함.

- `modalCount: WritableSignal<number>` — 현재 열린 모달 수.
- `showAsync<T>(modal: SdModalInfo<T>, options?: SdModalOptions): Promise<O | undefined>` — 모달을 띄우고 close 페이로드를 반환. 사용자가 X/취소로 닫으면 `undefined`.

`SdModalInfo<T>`:
- `title: string` — 모달 헤더 제목.
- `type: Type<T>` — `SdModalContentDef` 구현 컴포넌트 클래스.
- `inputs` — 컴포넌트 input 값들. `initialized`/`close`/`actionTplRef` 제외, optional 입력은 생략 가능.

`SdModalContentDef<O>` (컨텐츠 컴포넌트가 구현):
- `initialized: Signal<boolean>` — 로드 완료 시그널.
- `close: OutputEmitterRef<O | undefined>` — 닫기 + 페이로드 emit. emit 값이 `showAsync` 반환값.
- `actionTplRef?: TemplateRef` — 헤더 우측에 끼울 액션 영역 템플릿(선택).

`SdModalOptions` (선택):
- `key?: string` — 모달 식별 키.
- `hideHeader: boolean` — 헤더 숨김. true 면 제목/닫기 영역 없음.
- `hideCloseButton: boolean` — 닫기 버튼만 숨김.
- `headerStyle?: string` — 헤더 인라인 스타일.
- `useCloseByBackdrop: boolean` — 배경 클릭으로 닫기 허용(기본 true).
- `useCloseByEscapeKey: boolean` — ESC 로 닫기 허용(기본 true).
- `float: boolean` — 화면에 띄우는 플로팅 모드.
- `fill: boolean` — 화면 가득 채움.
- `resizable: boolean` — 가장자리 드래그 리사이즈 허용.
- `movable: boolean` — 헤더 드래그 이동 허용.
- `position: "bottom-right"|"top-right"` — 고정 위치.
- `minHeightPx`/`minWidthPx`/`heightPx`/`widthPx: number` — 크기(px).
- `noFirstControlFocusing: boolean` — true 면 첫 입력에 자동 포커스하지 않고 dialog 에 포커스.

```ts
const result = await inject(SdModalProvider).showAsync(
  { type: GoodsDetailModal, title: "품목 등록", inputs: { goodsId: 12 } },
  { resizable: true, widthPx: 720 },
);
if (result == null) return;
```

## SdActivatedModalProvider<T>

모달 컨텐츠 컴포넌트 안에서 inject 해 자기 모달 셸을 제어. `SdModalProvider` 가 컨텐츠 인젝터에 주입.

- `modalComponent: WritableSignal<SdModal | undefined>` — 모달 셸 컴포넌트 참조(제목 등 조회).
- `contentComponent: WritableSignal<T | undefined>` — 컨텐츠 컴포넌트 참조.
- `canDeactivateFn: () => boolean` — 닫기 시도 시 가드. `setupCanDeactivate` 가 이 값을 설정.

## SdPromptModal / SdConfirmModal

바로 쓰는 범용 모달 컨텐츠 컴포넌트.

- `SdPromptModal` — `SdModalContentDef<string>`. `message: input.required<string>` 를 표시하고 텍스트 입력(필수) 후 확인 시 입력값, 취소 시 `undefined` emit.
- `SdConfirmModal` — `SdModalContentDef<boolean>`. `message: input.required<string>` 표시 후 확인 시 `true`, 취소 시 `undefined` emit.

```ts
const ok = await sdModal.showAsync({ type: SdConfirmModal, title: "삭제", inputs: { message: "삭제할까요?" } });
```

## SdToastProvider

토스트 알림·진행률·커스텀 토스트를 띄우고, 비동기 try 래퍼를 제공.

- `info`/`success`/`warning`/`danger(message, useProgress?)` — 해당 severity 토스트. `useProgress: true` 면 진행률 토스트로 `WritableSignal<number>`(0~100) 반환(100 도달 1초 후 자동 닫힘), `false`/생략이면 일정 시간 후 자동 닫힘.
- `try<R>(fn, messageFn?): Promise<R | undefined>` — `fn` 실행 중 `Error` throw 시 `danger` 토스트로 표시하고 시스템 로그에 기록한 뒤 `undefined` 반환(에러 외 throw 는 재전파). 화면 비동기 작업 표준 래퍼.
- `notify<T>(input: SdToastInput<T>): Promise<O | undefined>` — 커스텀 컴포넌트(`SdToastContentDef<O>`)를 토스트로 띄움. close emit 값 또는 5초 후 `undefined` 반환.
- `alertThemes: WritableSignal<SdToastSeverity[]>` — 여기에 든 severity 는 토스트 대신 `window.alert` 로 표시.
- `overlap: WritableSignal<boolean>` — true 면 새 토스트가 기존 토스트를 모두 치움.
- `beforeShowFn?: (theme) => void` — 토스트 표시 직전 콜백.

타입:
- `SdToastSeverity = "info"|"success"|"warning"|"danger"`.
- `SdToastTheme = "primary"|"secondary"|SdToastSeverity|"gray"|"blue-gray"`.
- `SdToastContentDef<O>` — `close: OutputEmitterRef<O | undefined>` 보유.
- `SdToastInput<T>` — `{ type: Type<T>; inputs }`(`close` 제외).

```ts
this.busyCount.update((v) => v + 1);
await this._sdToast.try(async () => { await this._refresh(); });
this.busyCount.update((v) => v - 1);
this._sdToast.success("저장되었습니다.");
```

## SdBusyProvider

전역 busy 인디케이터 상태. `provideSdAngular` 가 라우팅 동안 증감, 인쇄 provider 도 사용.

- `type: WritableSignal<SdBusyType>` — 인디케이터 모양(`"spinner"|"bar"|"cube"`, 기본 `"bar"`).
- `globalBusyCount: WritableSignal<number>` — 0 보다 크면 화면 전체 busy 오버레이 표시. 비동기 작업 시작 `+1`, 종료 `-1`.

`SdBusyContainer` 컴포넌트(영역 단위 busy): `busy: boolean`, `message?: string`, `type?: SdBusyType`, `progressPercent?: number`(진행 바). 화면 영역을 감싸 그 영역만 busy 표시.

## SdPrintProvider

화면 컴포넌트(`SdPrint` 구현)를 인쇄하거나 PDF 버퍼로 변환. 처리 동안 `globalBusyCount` 증감.

- `printAsync<T>(template: SdPrintInput<T>, options?: { size?: string; margin?: string }): Promise<void>` — 컴포넌트를 렌더해 `@page` 스타일을 걸고 `window.print` 호출. `initialized()` 와 이미지 로드를 대기.
- `getPdfBufferAsync<T>(template, options?: { orientation?: "portrait"|"landscape"; pageSize?: string }): Promise<Uint8Array>` — `.page` 요소(없으면 전체)를 캔버스로 떠 jsPDF 로 PDF 바이트 생성.

`SdPrint` (템플릿 컴포넌트가 구현): `initialized: Signal<boolean>`(렌더 완료 시그널). `SdPrintInput<T>` — `{ type: Type<T>; inputs }`.

```ts
await inject(SdPrintProvider).printAsync(
  { type: InvoicePrintTemplate, inputs: { invoiceId: 5 } },
  { size: "A4", margin: "10mm" },
);
```
