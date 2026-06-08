# @simplysm/angular — 오버레이(모달·토스트·busy·인쇄)

화면에서 프로그래밍 방식으로 모달을 띄우거나, 토스트로 알림·진행률을 표시하거나, busy 인디케이터·인쇄/PDF 출력을 호출할 때 함께 읽히는 군. provider 는 모두 `providedIn: "root"`, 동적으로 body 에 attach 하므로 컴포넌트를 템플릿에 직접 둘 일은 거의 없음.

## 모달

### SdModalProvider

```ts
@Injectable({ providedIn: "root" }) class SdModalProvider {
  modalCount: WritableSignal<number>;
  showAsync<T extends SdModalContentDef<any>>(modal: SdModalInfo<T>, options?: SdModalOptions):
    Promise<Parameters<T["close"]["emit"]>[0] | undefined>;
}
```

- `showAsync(modal, options)` — 모달 컴포넌트를 동적 생성·표시하고, 컨텐츠가 `close.emit(value)` 한 값(또는 배경/ESC/닫기 시 undefined)으로 resolve. 첫 탭 가능 요소에 자동 포커스, 닫힘 후 이전 포커스 복귀.
- `modal.title` — 헤더 제목. `modal.type` — `SdModalContentDef` 구현 컴포넌트. `modal.inputs` — 컴포넌트 input 바인딩(`close`/`initialized`/`actionTplRef` 제외, optional 마킹된 키는 생략 가능).

```ts
const result = await inject(SdModalProvider).showAsync(
  { title: "역할 선택", type: RoleListModal, inputs: { selectMode: "single" } },
  { useCloseByBackdrop: false },
);
```

### SdModal — `<sd-modal>`

```ts
open = model(false); key = input<string>(); title = input("");
hideHeader; hideCloseButton; headerStyle = input<string>();
useCloseByBackdrop = input(true); useCloseByEscapeKey = input(true);
float; fill; resizable; movable;
position = input<"bottom-right" | "top-right" | undefined>();
minHeightPx; minWidthPx; heightPx; widthPx = input<number>();
actionTplRef = input<TemplateRef<any>>(); closeRequest = output<void>();
```

- 모달 셸 컴포넌트(보통 `SdModalProvider` 가 생성, 직접 템플릿 사용은 드묾). `key` 지정 시 크기·위치를 `SdSystemConfigProvider` 에 저장/복원.
- `useCloseByBackdrop`/`useCloseByEscapeKey` — 배경 클릭/ESC 닫기 허용(기본 true). `float`=배경 없는 부유창, `fill`=전체 채움, `resizable`/`movable`=리사이즈/드래그(헤더), `position`=고정 위치.

### 관련 타입·내장 모달

```ts
SdModalContentDef<O> { initialized: Signal<boolean>; close: OutputEmitterRef<O | undefined>; actionTplRef?; _optionalModalInputs? }
SdModalInfo<T, X> { title: string; type: Type<T>; inputs: ... }
SdModalOptions { key?; hideHeader?; hideCloseButton?; headerStyle?; useCloseByBackdrop?; useCloseByEscapeKey?; float?; fill?; resizable?; movable?; position?; minHeightPx?; minWidthPx?; heightPx?; widthPx?; noFirstControlFocusing? }
```

- `SdModalContentDef<O>` — 모달 컨텐츠 컴포넌트 계약(`initialized` 시그널 + `close` 출력). `O` 가 close 페이로드 타입. `_optionalModalInputs` 에 optional input 키를 문자열 리터럴로 선언하면 `showAsync` 호출 시 해당 input 생략 허용.
- `SdModalOptions.noFirstControlFocusing` — true 면 첫 컨트롤 자동 포커스 안 함(다이얼로그만 포커스).

### SdActivatedModalProvider

```ts
@Injectable() class SdActivatedModalProvider<T> {
  modalComponent: WritableSignal<SdModal | undefined>;
  contentComponent: WritableSignal<T | undefined>;
  canDeactivateFn: () => boolean; // 기본 () => true
}
```

- 모달 컨텐츠 내부에서 `inject` 해 사용. `canDeactivateFn` 을 세팅하면 닫기 전 가드(미저장 변경 보호). `contentComponent` 로 자기 컴포넌트 참조(crud-list 가 close 호출에 사용).

### SdPromptModal / SdConfirmModal

```ts
// SdPromptModal: SdModalContentDef<string>  — message 입력 + 텍스트 입력 후 확인/취소
message = input.required<string>();
// SdConfirmModal: SdModalContentDef<boolean> — message 표시 후 확인(true)/취소(undefined)
message = input.required<string>();
```

- 범용 입력/확인 모달. `showAsync({ type: SdPromptModal, inputs: { message } })` 로 호출. prompt 는 확인 시 입력 문자열, confirm 은 확인 시 `true`, 취소는 둘 다 undefined.

## 토스트

### SdToastProvider

```ts
@Injectable({ providedIn: "root" }) class SdToastProvider {
  alertThemes: WritableSignal<SdToastSeverity[]>; overlap: WritableSignal<boolean>;
  beforeShowFn?: (theme: SdToastSeverity) => void;
  info(msg, useProgress?): WritableSignal<number> | void;   // success/warning/danger 동일 시그니처
  notify<T>(input: SdToastInput<T>): Promise<...>;
  try<R>(fn: () => Promise<R> | R, messageFn?: (err: Error) => string): Promise<R | undefined>;
}
// SdToastSeverity = "info" | "success" | "warning" | "danger"
```

- `info`/`success`/`warning`/`danger(msg, useProgress?)` — 토스트 표시. `useProgress=true` 면 진행률 토스트의 `WritableSignal<number>`(0~100) 반환(100 도달 후 자동 해제), 아니면 3초 후(호버 시 지연) 자동 해제.
- `try(fn, messageFn?)` — fn 실행 중 Error 발생 시 `danger` 토스트 + 시스템로그 적재 후 undefined 반환(Error 외 예외는 rethrow). 화면 핸들러를 감싸 에러를 사용자에게 알림.
- `alertThemes` — 해당 severity 는 토스트 대신 `window.alert` 사용. `overlap`=새 토스트가 기존을 대체. `notify` 는 커스텀 컴포넌트 토스트.

```ts
await inject(SdToastProvider).try(async () => { await save(); this._sdToast.success("저장됨"); });
```

### SdToast / SdToastContainer — `<sd-toast>` / `<sd-toast-container>`

```ts
// toast
open = model(false); useProgress = input(false); theme = input<SdToastTheme>("info");
progress = model(0); message = model<string | undefined>();
// container
overlap = input(false);
// SdToastTheme = "primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray"
```

- 토스트 표시 단위/컨테이너(provider 가 동적 생성, 직접 사용은 드묾). `theme` info/success 는 aria status·polite, warning/danger 는 alert·assertive 로 접근성 자동 설정.

### 관련 타입

```ts
SdToastContentDef<O> { close: OutputEmitterRef<O | undefined> }
SdToastInput<T> { type: Type<T>; inputs: Omit<DirectiveInputSignals<T>, "close"> }
```

- 커스텀 컴포넌트 토스트(`notify`)의 계약·입력 타입.

## busy

### SdBusyProvider

```ts
@Injectable({ providedIn: "root" }) class SdBusyProvider {
  type: WritableSignal<SdBusyType>;       // 기본 "bar"
  globalBusyCount: WritableSignal<number>;
}
// SdBusyType = "spinner" | "bar" | "cube"
```

- `globalBusyCount` — 0 초과면 전역 busy 오버레이 표시(라우팅 네비게이션·인쇄가 자동 +1/-1). 화면에서 비동기 작업 동안 직접 증감 가능. `type` 은 전역 인디케이터 모양.

### SdBusyContainer — `<sd-busy-container>`

```ts
busy = input(false); message = input<string>(); type = input<SdBusyType>();
progressPercent = input<number>();
```

- 특정 영역에 busy 오버레이를 씌우는 컨테이너. `busy` true 동안 콘텐츠 위에 인디케이터 + 키보드 차단. `type` 미지정 시 `SdBusyProvider.type`, `progressPercent`=상단 진행바.

```html
<sd-busy-container [busy]="loading()"> <ng-content /> </sd-busy-container>
```

## 인쇄·PDF

### SdPrintProvider

```ts
@Injectable({ providedIn: "root" }) class SdPrintProvider {
  printAsync<T extends SdPrint>(template: SdPrintInput<T>, options?: { size?: string; margin?: string }): Promise<void>;
  getPdfBufferAsync<T extends SdPrint>(template: SdPrintInput<T>, options?: { orientation?: "portrait"|"landscape"; pageSize?: string }): Promise<Uint8Array>;
}
// SdPrint { initialized: Signal<boolean>; _optionalPrintInputs? }
// SdPrintInput<T, X> { type: Type<T>; inputs: ... }
```

- `printAsync(template, options)` — 인쇄용 컴포넌트를 임시 렌더(`initialized` 대기 + 이미지 로드 대기) 후 `window.print()`. `options.size`(예: `"A4 auto"`)/`margin` 은 `@page` 규칙. 동안 globalBusy.
- `getPdfBufferAsync(template, options)` — 같은 방식으로 렌더 후 `.page` 요소(없으면 전체)를 페이지별 이미지로 PDF 생성, `Uint8Array` 반환. `orientation`/`pageSize`(예: `"a4"`) 지정.
- `template.type` 는 `SdPrint` 구현 컴포넌트(`initialized` 시그널 필수). `inputs` 로 데이터 주입.
