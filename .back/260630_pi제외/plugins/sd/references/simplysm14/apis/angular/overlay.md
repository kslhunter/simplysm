# @simplysm/angular — 오버레이·인쇄·파일

Modal, toast, busy overlay, file dialog, print/PDF를 동적으로 body에 붙이거나 provider로 호출하는 군이다. 인쇄/PDF 사용법: [client-print.md](../../manuals/client-print.md)

## modal

### `SdModal` — `<sd-modal>`

```ts
class SdModal {
  open: ModelSignal<boolean>;
  key: InputSignal<string | undefined>;
  title: InputSignal<string>;
  hideHeader: InputSignal<boolean>;
  hideCloseButton: InputSignal<boolean>;
  headerStyle: InputSignal<string | undefined>;
  useCloseByBackdrop: InputSignal<boolean>;
  useCloseByEscapeKey: InputSignal<boolean>;
  float: InputSignal<boolean>;
  fill: InputSignal<boolean>;
  resizable: InputSignal<boolean>;
  movable: InputSignal<boolean>;
  position: InputSignal<"bottom-right" | "top-right" | undefined>;
  minHeightPx: InputSignal<number | undefined>;
  minWidthPx: InputSignal<number | undefined>;
  heightPx: InputSignal<number | undefined>;
  widthPx: InputSignal<number | undefined>;
  actionTplRef: InputSignal<TemplateRef<any> | undefined>;
  closeRequest: OutputEmitterRef<void>;
}
```

- `open` — host `data-sd-open` 과 enter/leave transition 상태.
- `key` — `SdSystemConfigProvider` key suffix. 있으면 `sd-modal.${key}` 로 width/height/left/top을 저장·복원한다. 사용법: [client-system-config.md](../../manuals/client-system-config.md)
- `title` — header title text. 기본 빈 문자열.
- `hideHeader` — true면 header 전체를 렌더하지 않는다.
- `hideCloseButton` — true면 header close button을 숨긴다.
- `headerStyle` — header div `[style]` 문자열.
- `useCloseByBackdrop` — true면 backdrop click에서 closeRequest를 발생시킨다.
- `useCloseByEscapeKey` — true면 dialog Escape key에서 closeRequest를 발생시킨다.
- `float` — true면 backdrop을 숨기고 dialog pointer events만 켠 floating modal style.
- `fill` — true면 dialog가 full width/height를 차지한다.
- `resizable` — true면 8방향 resize handle을 렌더하고 resize 종료 시 config를 저장한다.
- `movable` — true면 header drag로 dialog 위치를 옮길 수 있다.
- `position` — `"bottom-right"` 는 우하단, `"top-right"` 는 우상단 배치 style을 적용한다.
- `minHeightPx`/`minWidthPx` — drag resize 최소 높이/너비.
- `heightPx`/`widthPx` — dialog style height/width px를 effect로 적용한다.
- `actionTplRef` — header title 옆에 렌더할 action template.
- `closeRequest` — close button/backdrop/Escape에서 emit한다. activated modal의 `canDeactivateFn()` 이 false면 emit하지 않는다.

### `SdModalContentDef`, `SdModalInfo`, `SdModalOptions`

```ts
interface SdModalContentDef<O> {
  initialized: Signal<boolean>;
  close: OutputEmitterRef<O | undefined>;
  actionTplRef?: TemplateRef<any>;
  readonly _optionalModalInputs?: string;
}
interface SdModalInfo<T extends SdModalContentDef<any>, X extends keyof any = ""> {
  title: string;
  type: Type<T>;
  inputs: WithOptional<Omit<DirectiveInputSignals<T>, "initialized" | "close" | "actionTplRef" | "_optionalModalInputs" | X>, ...>;
}
interface SdModalOptions {
  key?: string;
  hideHeader?: boolean;
  hideCloseButton?: boolean;
  headerStyle?: string;
  useCloseByBackdrop?: boolean;
  useCloseByEscapeKey?: boolean;
  float?: boolean;
  fill?: boolean;
  resizable?: boolean;
  movable?: boolean;
  position?: "bottom-right" | "top-right";
  minHeightPx?: number;
  minWidthPx?: number;
  heightPx?: number;
  widthPx?: number;
  noFirstControlFocusing?: boolean;
}
```

- `SdModalContentDef.initialized` — modal content 초기화 완료 signal. provider 타입 계약에 포함된다.
- `SdModalContentDef.close` — content가 결과를 emit해 modal을 닫는 output.
- `SdModalContentDef.actionTplRef` — 있으면 provider가 content property setter를 modal `actionTplRef` input에 bridge한다.
- `_optionalModalInputs` — `SdModalInfo.inputs` 에서 해당 input key를 optional로 만들기 위한 string literal marker.
- `SdModalInfo.title` — wrapper modal title input으로 전달할 문자열.
- `SdModalInfo.type` — 동적으로 생성할 content component type.
- `SdModalInfo.inputs` — content component input 값. `initialized`/`close`/`actionTplRef`/marker 및 `X` 제외.
- `key` — wrapper `SdModal.key` 로 전달되어 크기/위치 설정 저장에 쓰인다.
- `hideHeader`/`hideCloseButton`/`headerStyle`/`useCloseByBackdrop`/`useCloseByEscapeKey`/`float`/`fill`/`resizable`/`movable`/`position`/`minHeightPx`/`minWidthPx`/`heightPx`/`widthPx` — 같은 이름의 `SdModal` input으로 전달된다.
- `noFirstControlFocusing` — true면 첫 tabbable content 대신 dialog 자체에 focus한다.

### `SdModalProvider`

```ts
class SdModalProvider {
  modalCount: WritableSignal<number>;
  showAsync<T extends SdModalContentDef<any>>(modal: SdModalInfo<T>, options?: SdModalOptions): Promise<Parameters<T["close"]["emit"]>[0] | undefined>;
}
```

- `modalCount` — 열린 modal 수. 생성 시작 시 +1, destroy 완료 시 -1.
- `modal` — title/type/inputs로 content component를 만들고 `SdModal` 에 project한다.
- `options` — null이 아닌 property만 wrapper modal input으로 set한다. `noFirstControlFocusing` 은 focus 정책에만 쓰고 input으로 set하지 않는다.
- close 동작 — content `close` output은 결과로 resolve, wrapper `closeRequest` 는 `undefined` 로 resolve한다.
- focus 동작 — 닫힐 때 이전 active element가 연결되어 있으면 focus를 복귀한다.

### `SdActivatedModalProvider<T>`

```ts
class SdActivatedModalProvider<T extends SdModalContentDef<any> = SdModalContentDef<any>> {
  modalComponent: WritableSignal<SdModal | undefined>;
  contentComponent: WritableSignal<T | undefined>;
  canDeactivateFn: () => boolean;
}
```

- `modalComponent` — 현재 wrapper `SdModal` instance signal.
- `contentComponent` — 현재 modal content instance signal.
- `canDeactivateFn` — close request 허용 여부. 기본은 항상 true.

### `SdPromptModal` / `SdConfirmModal`

```ts
class SdPromptModal implements SdModalContentDef<string> {
  initialized: WritableSignal<boolean>;
  close: OutputEmitterRef<string | undefined>;
  message: InputSignal<string>;
}
class SdConfirmModal implements SdModalContentDef<boolean> {
  initialized: WritableSignal<boolean>;
  close: OutputEmitterRef<boolean | undefined>;
  message: InputSignal<string>;
}
```

- `SdPromptModal.message` — innerHTML로 표시할 안내문. 확인 시 입력 문자열, 취소 시 `undefined` 를 emit한다.
- `SdPromptModal.initialized` — 기본 true signal.
- `SdConfirmModal.message` — innerHTML로 표시할 확인문. 확인 시 true, 취소 시 `undefined` 를 emit한다.
- `SdConfirmModal.initialized` — 기본 true signal.

## toast

### `SdToastSeverity`, `SdToastTheme`, `SdToastContentDef`, `SdToastInput`

```ts
type SdToastSeverity = "info" | "success" | "warning" | "danger";
type SdToastTheme = "primary" | "secondary" | SdToastSeverity | "gray" | "blue-gray";
interface SdToastContentDef<O> { close: OutputEmitterRef<O | undefined> }
interface SdToastInput<T extends SdToastContentDef<any>> { type: Type<T>; inputs: Omit<DirectiveInputSignals<T>, "close"> }
```

- `SdToastSeverity` — provider shortcut method와 alert/system log 구분에 쓰는 severity.
- `SdToastTheme` — `SdToast.theme` input의 색 테마.
- `SdToastContentDef.close` — custom toast content가 결과를 내고 닫을 output.
- `SdToastInput.type` — custom toast content component type.
- `SdToastInput.inputs` — custom toast content input 값. `close` 는 제외된다.

### `SdToast` / `SdToastContainer`

```ts
class SdToast {
  open: ModelSignal<boolean>;
  useProgress: InputSignal<boolean>;
  theme: InputSignal<SdToastTheme>;
  progress: ModelSignal<number>;
  message: ModelSignal<string | undefined>;
}
class SdToastContainer { overlap: InputSignal<boolean> }
```

- `open` — enter/leave transition과 `data-sd-open`.
- `useProgress` — true면 progress bar를 렌더한다.
- `theme` — toast background와 progress 색. `info`/`success` 는 ARIA `status/polite`, `warning`/`danger` 는 `alert/assertive`.
- `progress` — progress bar width percent. provider progress mode에서 반환되는 signal.
- `message` — 문자열이 있으면 text로 렌더하고, 없으면 projected content를 렌더한다.
- `overlap` — true면 container가 기존 toast들을 겹침 위치에 표시하고 provider가 새 toast 전에 기존 toast를 제거한다.

### `SdToastProvider`

사용법: [client-system-log.md](../../manuals/client-system-log.md)

```ts
class SdToastProvider {
  alertThemes: WritableSignal<SdToastSeverity[]>;
  overlap: WritableSignal<boolean>;
  beforeShowFn?: (theme: SdToastSeverity) => void;
  info(message: string, useProgress?: true): WritableSignal<number>;
  info(message: string, useProgress?: false): void;
  success(message: string, useProgress?: true): WritableSignal<number>;
  success(message: string, useProgress?: false): void;
  warning(message: string, useProgress?: true): WritableSignal<number>;
  warning(message: string, useProgress?: false): void;
  danger(message: string, useProgress?: true): WritableSignal<number>;
  danger(message: string, useProgress?: false): void;
  notify<T extends SdToastContentDef<any>>(input: SdToastInput<T>): Promise<Parameters<T["close"]["emit"]>[0] | undefined>;
  try<R>(fn: () => Promise<R>, messageFn?: (err: Error) => string): Promise<R | undefined>;
  try<R>(fn: () => R, messageFn?: (err: Error) => string): R | undefined;
}
```

- `alertThemes` — 포함된 severity는 toast 대신 `window.alert(message)` 를 호출한다.
- `overlap` — true면 새 toast/show/notify 전에 기존 toast를 모두 제거한다.
- `beforeShowFn` — alert가 아닌 toast 표시 직전에 theme을 인자로 호출한다.
- `info`/`success`/`warning`/`danger` `message` — 표시할 문자열.
- `useProgress` — true면 progress signal을 반환하고 100 이상이 된 뒤 1초 후 dismiss한다. false면 3초 auto dismiss.
- `notify.input` — custom content toast를 만들 type/inputs. content `close` emit 또는 5초 auto dismiss로 resolve한다.
- `try.fn` — 실행할 동기/비동기 함수. Error만 catch한다.
- `try.messageFn` — Error를 toast 메시지로 바꿀 함수. 없으면 `err.message`.
- `try` 오류 처리 — danger toast를 띄우고 `SdSystemLogProvider.writeAsync("error", stack/message)` 후 `undefined` 를 반환한다. non-Error는 rethrow한다.

## busy

### `SdBusyType`, `SdBusyProvider`, `SdBusyContainer`

```ts
type SdBusyType = "spinner" | "bar" | "cube";
class SdBusyProvider {
  type: WritableSignal<SdBusyType>;
  globalBusyCount: WritableSignal<number>;
  get containerRef(): ComponentRef<SdBusyContainer>;
}
class SdBusyContainer {
  busy: InputSignal<boolean>;
  message: InputSignal<string | undefined>;
  type: InputSignal<SdBusyType | undefined>;
  progressPercent: InputSignal<number | undefined>;
}
```

- `SdBusyType` — `"spinner"` 는 원형 회전, `"bar"` 는 상단 bar, `"cube"` 는 네 조각 큐브 indicator.
- `SdBusyProvider.type` — global busy container 기본 indicator 타입. 초기값 `"bar"`.
- `globalBusyCount` — 0보다 크면 lazy container를 만들고 global busy를 true로 set한다.
- `containerRef` — body에 fixed full-screen `SdBusyContainer` 를 attach한 component ref.
- `busy` — true면 overlay screen 표시와 keydown capture 차단을 켠다.
- `message` — overlay 내부 message pre를 표시한다.
- `type` — container별 indicator 타입. 없으면 `SdBusyProvider.type()` 을 쓴다.
- `progressPercent` — 있으면 상단 progress bar를 scaleX(percent/100)로 표시한다.

## print/PDF

### `SdPrint`, `SdPrintInput`, `SdPrintProvider`

사용법: [client-print.md](../../manuals/client-print.md)

```ts
interface SdPrint {
  initialized: Signal<boolean>;
  readonly _optionalPrintInputs?: string;
}
interface SdPrintInput<T, X extends keyof any = ""> {
  type: Type<T>;
  inputs: WithOptional<Omit<DirectiveInputSignals<T>, "_optionalPrintInputs" | X>, ...>;
}
class SdPrintProvider {
  printAsync<T extends SdPrint>(template: SdPrintInput<T>, options?: { size?: string; margin?: string }): Promise<void>;
  getPdfBufferAsync<T extends SdPrint>(template: SdPrintInput<T>, options?: { orientation?: "portrait" | "landscape"; pageSize?: string }): Promise<Uint8Array>;
}
```

- `SdPrint.initialized` — print/PDF capture가 기다리는 render 완료 signal.
- `_optionalPrintInputs` — `SdPrintInput.inputs` 에서 해당 input key를 optional로 만들기 위한 marker.
- `SdPrintInput.type` — 임시 생성할 print template component type.
- `SdPrintInput.inputs` — template input 값.
- `printAsync.options.size` — `@page size` 값. 기본 `"A4 auto"`.
- `printAsync.options.margin` — `@page margin` 값. 기본 `"0"`.
- `printAsync` 동작 — component를 body에 붙이고 `initialized`/image load를 기다린 뒤 `window.print()` 를 호출한다.
- `getPdfBufferAsync.options.orientation` — jsPDF orientation. 기본값은 코드상 `"p"`; 타입은 `"portrait" | "landscape"` 로 선언되어 있다.
- `getPdfBufferAsync.options.pageSize` — jsPDF page size. 기본 `"a4"`.
- `getPdfBufferAsync` 동작 — `.page` elements가 있으면 각각 한 PDF page로, 없으면 component root를 한 page로 캡처해 `Uint8Array` 를 반환한다.

## file dialog

### `SdFileDialogProvider`

```ts
class SdFileDialogProvider {
  showAsync(multiple?: false, accept?: string): Promise<File | undefined>;
  showAsync(multiple: true, accept?: string): Promise<File[] | undefined>;
}
```

- `multiple` — true면 input multiple을 켜고 `File[] | undefined` 를 반환, false/미지정이면 첫 `File | undefined` 를 반환한다.
- `accept` — file input accept attribute. 지정된 경우만 설정한다.
- cancel 처리 — native `cancel` event 또는 focus fallback으로 `undefined` 를 resolve한다.
