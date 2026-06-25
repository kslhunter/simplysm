# @simplysm/angular — 오버레이(모달·토스트·busy·인쇄·파일)

화면에서 프로그래밍 방식으로 모달을 띄우거나, 토스트로 알림·진행률을 표시하거나, busy 인디케이터·인쇄/PDF·파일 다이얼로그를 호출할 때 함께 읽히는 군. provider 는 모두 `providedIn: "root"`, 동적으로 body 에 attach 하므로 컴포넌트를 템플릿에 직접 둘 일은 거의 없음. 화면에서의 호출 규약은 [client-component.md](../../manuals/client-component.md) 의 '모달 호출' / '에러·토스트' 참조.

## 모달

### `SdModalProvider`

`@Injectable({ providedIn: "root" })`. 모달 콘텐츠 컴포넌트를 `SdModal` 셸로 감싸 띄움.

```ts
showAsync<T extends SdModalContentDef<any>>(
  modal: SdModalInfo<T>, options?: SdModalOptions,
): Promise<Parameters<T["close"]["emit"]>[0] | undefined>
```

- `modal.type` 의 컴포넌트를 생성·`modal.inputs` 바인딩·body 에 attach, z-index 부여, 포커스 관리. 콘텐츠가 `close.emit(payload)` 한 값으로 resolve(backdrop/ESC/닫기로 닫으면 `undefined`).
- `modalCount: signal(0)` — 현재 열린 모달 수.

```ts
const result = await this._sdModal.showAsync({
  type: OutboundInstructionHeaderDetail, title: "출고지시 등록", inputs: { /* ... */ },
});
if (!result) return;
```

`SdModalInfo<T, X>` — `{ title: string; type: Type<T>; inputs: ... }`. `inputs` 는 콘텐츠 컴포넌트의 input 값(프레임워크 키 `initialized`/`close`/`actionTplRef`/`_optionalModalInputs` 와 추가 키 `X` 제외, 컴포넌트가 `_optionalModalInputs` 로 선언한 키는 optional).

`SdModalContentDef<O>` — 모달 콘텐츠 컴포넌트가 구현할 인터페이스:
- `initialized: Signal<boolean>` — 준비 완료.
- `close: OutputEmitterRef<O | undefined>` — 결과 `O | undefined` 로 자기 자신을 닫음.
- `actionTplRef?: TemplateRef<any>` — 헤더 액션 템플릿(선택).
- `_optionalModalInputs?: string` — optional input 키 마커(타입 전용).

`SdModalOptions` (전부 선택): `key`(크기·위치 영속) / `hideHeader` / `hideCloseButton` / `headerStyle` / `useCloseByBackdrop`(기본 true) / `useCloseByEscapeKey`(기본 true) / `float`(배경 없는 플로팅) / `fill`(전체 채움) / `resizable` / `movable` / `position: "bottom-right"|"top-right"` / `minHeightPx` / `minWidthPx` / `heightPx` / `widthPx` / `noFirstControlFocusing`(true 면 첫 컨트롤 대신 다이얼로그에 포커스).

### `SdModal` — `<sd-modal>`

모달 셸 컴포넌트. `SdModalProvider` 가 내부적으로 사용 — 화면에서 직접 두지 않음(상속 대상도 아님). 위 `SdModalOptions` 키들에 대응하는 input(`open: model`, `title`, `float`, `fill`, `resizable`, `movable`, `position` 등)을 가지며 `closeRequest: output<void>` 발화 전 `SdActivatedModalProvider.canDeactivateFn()` 가드 확인.

### `SdActivatedModalProvider<T>`

`@Injectable()`(모달별 주입). 콘텐츠 컴포넌트가 inject 해 호스트 모달과 상호작용.

- `modalComponent: signal<SdModal | undefined>` / `contentComponent: signal<T | undefined>` — 호스트 모달·콘텐츠 인스턴스.
- `canDeactivateFn: () => boolean` (기본 `() => true`) — close 전 가드. `false` 반환 시 닫기 차단. `setupCanDeactivate` 가 모달 컨텍스트에서 이 필드를 설정.

### `SdPromptModal` / `SdConfirmModal`

표준 입력/확인 모달. `SdModalContentDef<string>` / `SdModalContentDef<boolean>` 구현.

- 둘 다 `message: input.required<string>()`(HTML), `initialized: signal(true)`, `close` output.
- prompt: 텍스트 입력(필수) → 확인 시 입력 문자열, 취소 시 `undefined`.
- confirm: 확인 시 `true`, 취소 시 `undefined`.

## 토스트

### `SdToastProvider`

`@Injectable({ providedIn: "root" })`.

- `SdToastSeverity` = `"info" | "success" | "warning" | "danger"` — 심각도. `info`/`success` = polite(aria), `warning`/`danger` = assertive. (심각도 분류 기준은 sd 규칙의 심각도 분류)
- `SdToastTheme` = `"primary" | "secondary" | SdToastSeverity | "gray" | "blue-gray"`.
- 심각도 헬퍼(각 overload): `info`/`success`/`warning`/`danger`. `useProgress=true` 면 `WritableSignal<number>`(진행률 0~100) 반환, 아니면 `void`. 비-progress 토스트는 3초 후 자동 소멸(hover 중 일시정지), progress 토스트는 ≥100 도달 1초 후 소멸.

```ts
this._sdToast.success("저장되었습니다.");
this._sdToast.danger("...");
```

- `try` (overload):
  ```ts
  try<R>(fn: () => Promise<R>, messageFn?: (err: Error) => string): Promise<R | undefined>
  try<R>(fn: () => R, messageFn?: (err: Error) => string): R | undefined
  ```
  `fn` 실행(async 면 await). 성공 시 결과 반환. `Error` throw 시 `danger` 토스트(`messageFn(err)` 또는 `err.message`) + `SdSystemLogProvider.writeAsync("error", ...)` 적재 후 `undefined` 반환. 비-Error throw 는 재throw.

  ```ts
  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => { await this._refresh(); });
  this.busyCount.update((v) => v - 1);
  ```

- `notify<T extends SdToastContentDef<any>>(input: SdToastInput<T>): Promise<...>` — 커스텀 컴포넌트를 토스트로 렌더(5초 후 자동 소멸), `close` emit 값 또는 `undefined` resolve.
- 필드: `alertThemes: signal<SdToastSeverity[]>([])`(여기 든 심각도는 토스트 대신 `window.alert`) / `overlap: signal(false)`(겹침 모드, 새 토스트 전 기존 제거) / `beforeShowFn?: (theme) => void`.

`SdToastContentDef<O>` — `{ close: OutputEmitterRef<O | undefined> }`. `SdToastInput<T>` — `{ type: Type<T>; inputs: Omit<DirectiveInputSignals<T>, "close"> }`.

### `SdToast` / `SdToastContainer`

토스트 셸·컨테이너 컴포넌트. provider 가 내부 사용 — 화면에서 직접 두지 않음. toast: `open: model`, `theme: SdToastTheme`(기본 `"info"`), `useProgress`, `progress: model(0)`, `message: model`. container: `overlap: boolean`.

## busy

### `SdBusyProvider`

`@Injectable({ providedIn: "root" })`.

- `SdBusyType` = `"spinner" | "bar" | "cube"` — 인디케이터 외형. `"spinner"` = 상단에서 내려오는 원형 스피너+메시지; `"bar"` = 상단 얇은 진행 바; `"cube"` = 중앙 회전 큐브.
- `type: signal<SdBusyType>("bar")` — 전역 기본 인디케이터 타입.
- `globalBusyCount: signal(0)` — 전역 전체화면 busy 참조 카운트. `>0` 이면 전체화면 오버레이 표시. (`provideSdAngular` 의 라우팅 추적·`SdPrintProvider` 가 증감)

### `SdBusyContainer` — `<sd-busy-container>`

콘텐츠 위에 busy 오버레이를 거는 컴포넌트. (화면 busy 표시는 보통 `sd-base-container`/`sd-crud-*` 가 처리하므로 직접 사용은 드묾)

- `busy: boolean` — 오버레이 활성.
- `message: string` — 오버레이 메시지.
- `type: SdBusyType | undefined` — 인디케이터 타입(미지정 시 provider 기본).
- `progressPercent: number | undefined` — 0~100; 설정 시 상단 진행 바.

## 인쇄

### `SdPrintProvider`

`@Injectable({ providedIn: "root" })`. jsPDF·html-to-image 사용. 프린트 템플릿(`<domain>.print-template.ts`)을 대상으로 함.

```ts
printAsync<T extends SdPrint>(template: SdPrintInput<T>, options?: { size?: string; margin?: string }): Promise<void>
getPdfBufferAsync<T extends SdPrint>(template: SdPrintInput<T>, options?: { orientation?: "portrait"|"landscape"; pageSize?: string }): Promise<Uint8Array>
```

- `printAsync` — 템플릿 컴포넌트 생성·`@page { size; margin }` 주입(기본 `size="A4 auto"`, `margin="0"`), `initialized()`·이미지 로드 대기 후 `window.print()`. `globalBusyCount` 증감.
- `getPdfBufferAsync` — 같은 템플릿을 off-screen 래스터화해 jsPDF 페이지로(기본 `pageSize="a4"`, `orientation="p"`) `Uint8Array` 반환.
- `SdPrint` — `{ initialized: Signal<boolean>; _optionalPrintInputs?: string }`. 템플릿 컴포넌트가 구현.
- `SdPrintInput<T, X>` — `{ type: Type<T>; inputs: ... }`(`_optionalPrintInputs`·추가 키 `X` 제외, optional 키 적용).

## 파일 다이얼로그

### `SdFileDialogProvider`

`@Injectable({ providedIn: "root" })`. (단순 파일 선택은 `@simplysm/core-browser` 의 `openFileDialog` 도 사용 — [client-crud.md](../../manuals/client-crud.md) 엑셀 업로드 레시피)

```ts
showAsync(multiple?: false, accept?: string): Promise<File | undefined>
showAsync(multiple: true, accept?: string): Promise<File[] | undefined>
```

- 숨김 `<input type="file">` 생성·클릭으로 native 피커 열기. `multiple` 거짓이면 단일 `File`, true 면 `File[]`, 취소 시 `undefined`. `accept` 로 MIME/확장자 필터.
