# @simplysm/angular — 오버레이·인쇄·파일

modal, toast, busy overlay, file dialog, browser print/PDF를 동적으로 `document.body` 에 붙이거나 provider로 호출하는 군이다. 인쇄/PDF 사용법: [client-print.md](../../manuals/client-print.md)

modal/toast/print 의 `inputs` 타입은 `DirectiveInputSignals<T>`(컴포넌트 `input()` property만 골라 값 타입으로 매핑) + `WithOptional`(`_optional*Inputs` 로 표시한 key를 optional)로 만들어진다. 컨텐츠 컴포넌트는 자기 `input()` 으로 데이터를 받고, 자기 `close` output 으로 결과를 emit해 스스로 닫는다.

## 모달

### `SdModal` (`sd-modal`)

```ts
class SdModal {
  open: ModelSignal<boolean>;                 // default false
  key: InputSignal<string | undefined>;
  title: InputSignal<string>;                 // default ""
  hideHeader, hideCloseButton: InputSignal<boolean>;       // default false
  headerStyle: InputSignal<string | undefined>;
  useCloseByBackdrop, useCloseByEscapeKey: InputSignal<boolean>;  // default true
  float, fill, resizable, movable: InputSignal<boolean>;   // default false
  position: InputSignal<"bottom-right" | "top-right" | undefined>;
  minHeightPx, minWidthPx, heightPx, widthPx: InputSignal<number | undefined>;
  actionTplRef: InputSignal<TemplateRef<any> | undefined>;
  closeRequest: OutputEmitterRef<void>;
}
```

모달 dialog 컨테이너 컴포넌트. 보통 직접 쓰지 않고 `SdModalProvider.showAsync` 가 내부 생성한다. `SdModal` 은 결과를 직접 resolve하지 않고 `closeRequest` 만 emit하며, 타입 결과는 컨텐츠 컴포넌트의 `close` output에서 나온다.

- `open` — 열림 상태(양방향).
- `key` — 지정 시 `SdSystemConfigProvider` 로 `sd-modal.<key>` 에 크기/위치를 저장·복원.
- `useCloseByBackdrop`/`useCloseByEscapeKey` — backdrop 클릭/Escape로 닫을지(기본 true).
- `float` — 떠 있는 모달(backdrop 없음). `fill` — 전체 화면. `resizable` — 8방향 resize handle. `movable` — header 드래그 이동.
- `position` — `"bottom-right"`/`"top-right"` 코너 고정.
- `minHeightPx`/`minWidthPx`/`heightPx`/`widthPx` — 최소/초기 크기(px).
- 닫기 가드 — `SdActivatedModalProvider.canDeactivateFn()` 이 false면 backdrop/Escape/닫기 버튼이 막힌다.

### `SdModalProvider`

```ts
@Injectable({ providedIn: "root" })
class SdModalProvider {
  modalCount: Signal<number>;
  showAsync<T extends SdModalContentDef<any>>(
    modal: SdModalInfo<T>,
    options?: SdModalOptions,
  ): Promise<Parameters<T["close"]["emit"]>[0] | undefined>;
}
interface SdModalContentDef<O> {
  initialized: Signal<boolean>;
  close: OutputEmitterRef<O | undefined>;
  actionTplRef?: TemplateRef<any>;
  readonly _optionalModalInputs?: string;
}
interface SdModalInfo<T extends SdModalContentDef<any>, X = ""> {
  title: string;
  type: Type<T>;
  inputs: WithOptional<Omit<DirectiveInputSignals<T>, SdModalExcludeKeys | X>, ...>;
}
```

- `showAsync` — `modal.type` 컴포넌트를 동적 생성해 모달로 띄우고, 컨텐츠의 `close` output 값(`O | undefined`)으로 resolve한다. `closeRequest`(backdrop/Escape/X)는 `undefined` resolve. `modal.inputs` 의 각 값은 `setInput` 으로 바인딩.
- 컨텐츠 contract(`SdModalContentDef`) — `initialized: Signal<boolean>`(렌더 준비), `close = output<O | undefined>()`(결과 emit). 닫으려면 `this.close.emit(result)` 호출.
- `modalCount` — 열린 모달 수 signal.

#### `SdModalOptions`

모달 외형/동작 옵션(모두 optional). `noFirstControlFocusing` 외 전부 `SdModal` 동명 input에 매핑된다.

- `key` — 크기/위치 저장 key.
- `hideHeader` — 헤더 바 숨김. `hideCloseButton` — X 버튼 숨김. `headerStyle` — 헤더 inline style.
- `useCloseByBackdrop`/`useCloseByEscapeKey` — backdrop/Escape 닫기(SdModal 기본 true).
- `float` — backdrop 없는 floating. `fill` — 전체 화면. `resizable` — resize handle. `movable` — 헤더 드래그 이동.
- `position` — `"bottom-right"`/`"top-right"`.
- `minHeightPx`/`minWidthPx`/`heightPx`/`widthPx` — 최소/초기 크기.
- `noFirstControlFocusing` — true면 첫 tabbable 대신 dialog 자체에 포커스(SdModal에 미바인딩).

### `SdActivatedModalProvider<T>`

```ts
@Injectable()
class SdActivatedModalProvider<T extends SdModalContentDef<any>> {
  modalComponent: Signal<SdModal | undefined>;
  contentComponent: Signal<T | undefined>;
  canDeactivateFn: () => boolean; // default () => true
}
```

모달별 child injector로 제공된다. 컨텐츠 컴포넌트가 inject해 host `SdModal` 접근, `canDeactivateFn` 을 false 반환으로 덮어써 닫기 차단. 컨텐츠 자신의 input은 일반 `input()` 으로 읽고, 닫기는 자기 `close` output emit으로 한다.

### `SdPromptModal` / `SdConfirmModal` (`sd-prompt-modal` / `sd-confirm-modal`)

```ts
class SdPromptModal implements SdModalContentDef<string> {
  message: InputSignal<string>;
  close: OutputEmitterRef<string | undefined>;
}
class SdConfirmModal implements SdModalContentDef<boolean> {
  message: InputSignal<string>;
  close: OutputEmitterRef<boolean | undefined>;
}
```

- `SdPromptModal` — `message`(innerHTML) 표시 + 필수 textfield. 확인 시 입력 문자열, 취소 시 `undefined` resolve.
- `SdConfirmModal` — `message` 표시. 확인 시 `true`, 취소 시 `undefined` resolve.

## 토스트

### `SdToastProvider`

```ts
@Injectable({ providedIn: "root" })
class SdToastProvider {
  alertThemes: WritableSignal<SdToastSeverity[]>;     // 이 severity는 window.alert로 대체
  overlap: WritableSignal<boolean>;
  beforeShowFn?: (theme: SdToastSeverity) => void;
  info(message: string, useProgress?: true): WritableSignal<number>;
  info(message: string, useProgress?: false): void;   // success/warning/danger 동일 시그니처
  notify<T extends SdToastContentDef<any>>(input: SdToastInput<T>): Promise<... | undefined>;
  try<R>(fn: () => Promise<R>, messageFn?: (err: Error) => string): Promise<R | undefined>;
  try<R>(fn: () => R, messageFn?: (err: Error) => string): R | undefined;
}
type SdToastSeverity = "info" | "success" | "warning" | "danger";
type SdToastTheme = "primary" | "secondary" | SdToastSeverity | "gray" | "blue-gray";
interface SdToastContentDef<O> { close: OutputEmitterRef<O | undefined>; }
interface SdToastInput<T extends SdToastContentDef<any>> { type: Type<T>; inputs: Omit<DirectiveInputSignals<T>, "close">; }
```

- `info`/`success`/`warning`/`danger` — 해당 severity 토스트. `useProgress` 가 truthy면 progress용 `WritableSignal<number>`(퍼센트) 반환 — 100 도달 후 1초 뒤 자동 dismiss. 아니면 3초 뒤 자동 dismiss(hover 시 일시정지).
- `notify` — 커스텀 컴포넌트를 토스트로 띄우고 `close` 결과로 resolve. 5초 뒤 자동 `undefined`.
- `try` — `fn()` 실행 결과 반환. `Error` throw 시 `danger(messageFn?.(err) ?? err.message)` 표시 + `SdSystemLogProvider.writeAsync("error", ...)` 기록 후 `undefined` 반환(비-Error는 rethrow).
- `alertThemes` — 목록에 든 severity는 토스트 대신 native `window.alert`.
- `overlap` — true면 새 토스트마다 기존 토스트 제거(하나만 표시).
- `SdToastSeverity` — `"info"`/`"success"`/`"warning"`/`"danger"`. `SdToastTheme` — severity 4종 + `"primary"`/`"secondary"`/`"gray"`/`"blue-gray"`.

### `SdToast` (`sd-toast`) / `SdToastContainer` (`sd-toast-container`)

```ts
class SdToast {
  open: ModelSignal<boolean>; // default false
  useProgress: InputSignal<boolean>; // default false
  theme: InputSignal<SdToastTheme>; // default "info"
  progress: ModelSignal<number>; // default 0
  message: ModelSignal<string | undefined>;
}
class SdToastContainer {
  overlap: InputSignal<boolean>;
} // default false
```

`SdToastProvider` 가 내부 생성한다. `SdToast` 는 `message` 텍스트 또는 투영 콘텐츠를 렌더하고 `useProgress` 면 progress bar 표시. severity별 `role`/`aria-live`(info/success→status/polite, warning/danger→alert/assertive).

## busy

### `SdBusyProvider`

```ts
@Injectable({ providedIn: "root" })
class SdBusyProvider {
  type: WritableSignal<SdBusyType>; // default "bar"
  globalBusyCount: WritableSignal<number>;
  get containerRef(): ComponentRef<SdBusyContainer>;
}
type SdBusyType = "spinner" | "bar" | "cube";
```

- `globalBusyCount` — `> 0` 일 때 전역 전체 화면 busy overlay 표시. `provideSdAngular` 가 Router navigation 동안 자동 증감.
- `type` — 전역 기본 busy 표시 종류.
- `SdBusyType` — `"spinner"`(회전 링), `"bar"`(상단 4px 막대), `"cube"`(큐브 애니메이션).

### `SdBusyContainer` (`sd-busy-container`)

```ts
class SdBusyContainer {
  busy: InputSignal<boolean>; // default false
  message: InputSignal<string | undefined>;
  type: InputSignal<SdBusyType | undefined>;
  progressPercent: InputSignal<number | undefined>;
}
```

- `busy` — true면 콘텐츠 위에 busy overlay + 키 입력 차단(`keydown.capture` 삼킴).
- `type` — 미지정 시 `SdBusyProvider.type()` 사용. `"spinner"`/`"bar"`/`"cube"` 별 렌더.
- `progressPercent` — non-null이면 `currType` 과 별개로 determinate progress bar(`scaleX(percent/100)`).
- `message` — spinner 모드 중앙 메시지.

## print

### `SdPrintProvider`

```ts
@Injectable({ providedIn: "root" })
class SdPrintProvider {
  printAsync<T extends SdPrint>(template: SdPrintInput<T>, options?: { size?: string; margin?: string }): Promise<void>;
  getPdfBufferAsync<T extends SdPrint>(template: SdPrintInput<T>, options?: { orientation?: "portrait" | "landscape"; pageSize?: string }): Promise<Uint8Array>;
}
interface SdPrint { initialized: Signal<boolean>; readonly _optionalPrintInputs?: string; }
interface SdPrintInput<T, X = ""> { type: Type<T>; inputs: WithOptional<Omit<DirectiveInputSignals<T>, "_optionalPrintInputs" | X>, ...>; }
```

`print()` 메서드는 없다 — `printAsync`/`getPdfBufferAsync` 만 있다. 인쇄 대상 컴포넌트는 `initialized: Signal<boolean>` 을 노출해야 하며 provider가 준비를 기다린다.

- `printAsync` — `template.type` 컴포넌트를 생성·렌더하고(`inputs` 는 `inputBinding`), `@page { size; margin }` + print 전용 스타일을 주입한 뒤 이미지 로드 완료를 기다려 `window.print()`. `size` 기본 `"A4 auto"`, `margin` 기본 `"0"`.
- `getPdfBufferAsync` — 같은 렌더 후 `.page` 요소들을 `html-to-image` 로 canvas 래스터화해 `jsPDF` 페이지로 추가하고 `Uint8Array` 반환. `orientation` 기본 `"portrait"`, `pageSize` 기본 `"a4"`.
- 두 메서드 모두 실행 동안 `SdBusyProvider.globalBusyCount` 증가.

## file dialog

### `SdFileDialogProvider`

```ts
@Injectable({ providedIn: "root" })
class SdFileDialogProvider {
  showAsync(multiple?: false, accept?: string): Promise<File | undefined>;
  showAsync(multiple: true, accept?: string): Promise<File[] | undefined>;
}
```

`<input type="file">` 을 잠시 body에 붙여 파일 선택 dialog를 띄운다.

- `multiple` — `true` 면 `File[]`, 생략/`false` 면 단일 `File` 반환.
- `accept` — input `accept` 속성(MIME/확장자 필터). null이면 미설정.
- 취소 시(또는 변경 없이 focus 복귀 시) `undefined` resolve.
