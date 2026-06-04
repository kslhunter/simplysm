# @simplysm/angular — 모달·토스트·Busy·인쇄 (오버레이/전역 피드백)

화면에서 프로그래밍 방식으로 모달을 띄우거나, 토스트로 알림·진행률을 표시하거나, busy 인디케이터·인쇄/PDF 출력을 호출할 때 함께 읽히는 군. provider 는 모두 `providedIn: "root"`, 컴포넌트는 provider 가 동적으로 body 에 attach 하므로 템플릿에 직접 둘 일은 거의 없음.

## SdModalProvider

컴포넌트를 모달 셸(`SdModal`) 안에 동적 생성해 body 에 띄움. `close.emit(payload)` 또는 닫기(X/배경/ESC)로 종료.

```ts
showAsync<T extends SdModalContentDef<any>>(
  modal: SdModalInfo<T>, options?: SdModalOptions,
): Promise<Parameters<T["close"]["emit"]>[0] | undefined>
```

- `modal.type: Type<T>` — `SdModalContentDef<O>` 를 구현한 컴포넌트 클래스(`SdModal` 자체가 아님). `O` 가 close 페이로드 타입.
- `modal.title: string` — 모달 헤더 제목.
- `modal.inputs` — 모달 컴포넌트가 받을 input 값. `initialized`/`close`/`actionTplRef` 와 `_optionalModalInputs` 로 표시된 키는 제외/optional 처리됨. 없으면 `{}`.
- 반환값 — 컴포넌트가 `close.emit` 한 페이로드. 닫기/취소로 닫히면 `undefined`. 매뉴얼 패턴: `const r = await this._sdModal.showAsync({...}); if (!r) return;`.
- `modalCount: WritableSignal<number>` — 현재 열린 모달 수.

### SdModalContentDef<O> (모달 컴포넌트가 구현)

- `initialized: Signal<boolean>` — 초기화 완료 여부. busy 표시 해제 기준.
- `close: OutputEmitterRef<O | undefined>` — 결과 emit. `O` 가 `showAsync` 반환 타입.
- `actionTplRef?: TemplateRef<any>` — 헤더 우측에 끼울 액션 영역 템플릿(있으면 모달 헤더로 브릿지됨).
- `_optionalModalInputs?: string` — (타입 전용 마커) 이 컴포넌트의 input 중 optional 로 둘 키 이름 리터럴. 런타임 값 아님.

### SdModalOptions (showAsync 2번째 인자)

- `key?: string` — 설정 저장 키. 지정 시 사용자가 조정한 width/height/위치를 `SdSystemConfigProvider` 에 영속·복원.
- `hideHeader?: boolean` — true 면 제목/닫기 헤더 숨김. 헤더 없는 풀커스텀 모달용.
- `hideCloseButton?: boolean` — true 면 헤더 X 버튼만 숨김.
- `headerStyle?: string` — 헤더 영역 인라인 스타일.
- `useCloseByBackdrop?: boolean` — 배경 클릭으로 닫기 허용(기본 동작상 컴포넌트 기본 true). false 면 배경 클릭 무시.
- `useCloseByEscapeKey?: boolean` — ESC 로 닫기 허용. false 면 ESC 무시.
- `float?: boolean` — true 면 배경(backdrop) 없는 떠있는 패널. 비모달 보조 패널용.
- `fill?: boolean` — true 면 화면 전체를 채움(풀스크린 모달).
- `resizable?: boolean` — true 면 8방향 리사이즈 핸들 표시.
- `movable?: boolean` — true 면 헤더 드래그로 이동.
- `position?: "bottom-right" | "top-right"` — 고정 위치. 토스트성 알림 모달에 사용.
- `minHeightPx?/minWidthPx?/heightPx?/widthPx?: number` — 최소/초기 크기.
- `noFirstControlFocusing?: boolean` — true 면 첫 입력 요소 자동 포커스를 끔(다이얼로그 자체에 포커스).

### 내장 모달 컴포넌트

- `SdPromptModal` (`SdModalContentDef<string>`) — 메시지 + 텍스트 입력 후 확인/취소. `message: input.required<string>` (innerHTML). 확인 시 입력값, 취소/닫기 시 `undefined`. 입력은 required 라 빈 값이면 네이티브 검증으로 차단.
- `SdConfirmModal` (`SdModalContentDef<boolean>`) — 메시지 + 확인/취소. `message: input.required<string>`. 확인 시 `true`, 취소/닫기 시 `undefined`.
- 사용: `const ok = await this._sdModal.showAsync({ type: SdConfirmModal, title: "확인", inputs: { message: "삭제할까요?" } }); if (!ok) return;`.

### SdActivatedModalProvider

모달 컴포넌트 내부에서 inject. 자기 모달의 셸/콘텐츠 참조와 이탈 가드를 보유.

- `modalComponent: Signal<SdModal | undefined>` / `contentComponent: Signal<T | undefined>` — 셸/콘텐츠 컴포넌트 참조.
- `canDeactivateFn: () => boolean` — 닫기 시도 시 false 면 닫힘 차단. `setupCanDeactivate`(routing-appstructure.md) 가 모달 컨텍스트에서 이걸 설정.

### SdModal (모달 셸)

`SdModalProvider` 가 내부적으로 생성하는 셸 컴포넌트. 상속·직접 배치 대상 아님. `<ng-content>` 로 콘텐츠를 투영하고 위 `SdModalOptions` 와 동일한 input(`title`/`open`/`resizable`/... `closeRequest` output) 을 보유.

## SdToastProvider

화면 우상단(또는 overlap 모드)에 토스트를 띄움. 알림·비동기 에러 가드·진행률에 사용.

- `info/success/warning/danger(message: string): void` — 심각도별 토스트 1개 표시(3초 후 자동 해제, hover 중이면 지연). `info`/`success` 는 `aria-live=polite`, `warning`/`danger` 는 `assertive`. 심각도 의미는 `sd-design-rules` 의 분류를 따름(error=문제 발생).
- `info/...(message: string, useProgress: true): WritableSignal<number>` — progress 모드. 반환된 signal 에 0~100 을 set 하면 진행바 갱신, 100 도달 1초 후 자동 해제. 업로드/다운로드 진행률 표시에 사용.
- `try<R>(fn: () => Promise<R> | R, messageFn?: (err: Error) => string): Promise<R | undefined>` — `fn` 실행 중 `Error` 가 throw 되면 잡아서 `danger` 토스트 + 시스템로그 `error` 적재 후 `undefined` 반환(에러를 외부로 전파하지 않음). `Error` 가 아닌 throw 는 그대로 재전파. 매뉴얼의 비동기 작업 표준 가드: `await this._sdToast.try(async () => { ... })`.
- `notify<T extends SdToastContentDef<any>>(input: SdToastInput<T>): Promise<...>` — 커스텀 컴포넌트를 토스트로 띄우고 `close` 페이로드를 반환(5초 후 자동 `undefined`).
- `alertThemes: WritableSignal<SdToastSeverity[]>` — 여기 든 심각도는 토스트 대신 `window.alert` 로 표시(키오스크 등 강제 확인 필요 화면).
- `overlap: WritableSignal<boolean>` — true 면 새 토스트가 기존 토스트를 제거하고 단독 표시.
- `beforeShowFn?: (theme: SdToastSeverity) => void` — 토스트 표시 직전 콜백(사운드 등).

타입:

- `SdToastSeverity = "info"|"success"|"warning"|"danger"`.
- `SdToastTheme = "primary"|"secondary"|SdToastSeverity|"gray"|"blue-gray"` — `sd-toast` 컴포넌트 `theme` 입력 범위.
- `SdToastContentDef<O> = { close: OutputEmitterRef<O | undefined> }` — `notify` 커스텀 컴포넌트 규약.
- `SdToastInput<T> = { type: Type<T>; inputs: Omit<DirectiveInputSignals<T>, "close"> }`.

`SdToast`/`SdToastContainer` 는 provider 가 동적 생성하는 표시 컴포넌트(직접 배치 불필요).

## SdBusyProvider / SdBusyContainer

영역 단위 busy 오버레이.

- `SdBusyProvider.type: WritableSignal<SdBusyType>` — 전역 기본 인디케이터 종류. `SdBusyType = "spinner"|"bar"|"cube"`. `"bar"` = 상단 가는 진행바, `"spinner"` = 회전 원, `"cube"` = 큐브 애니메이션.
- `SdBusyProvider.globalBusyCount: WritableSignal<number>` — 전역 busy 카운트(>0 이면 화면 전체 busy). 라우팅·인쇄가 ±1. 직접 ±1 해 전역 차단 가능.
- `SdBusyContainer` (`sd-busy-container`) — 자식 영역에 busy 오버레이를 씌우는 컨테이너 컴포넌트.
  - `busy: boolean` — true 면 오버레이 표시 + 영역 내 키입력 차단.
  - `message: string` — 인디케이터 옆/아래 표시 메시지.
  - `type: SdBusyType` — 이 영역만의 인디케이터 종류(미지정 시 provider 기본값).
  - `progressPercent: number` — 지정 시 상단 진행바(0~100). 결정형 작업 진행률에 사용.
  - 사용: `<sd-busy-container [busy]="busyCount() > 0">...</sd-busy-container>` (단, `sd-base-container` 가 이미 내장).

## SdPrintProvider

인쇄 템플릿 컴포넌트를 동적 생성해 `window.print()` 하거나 PDF 버퍼로 변환. 호출 동안 `globalBusyCount` ±1.

- `printAsync<T extends SdPrint>(template: SdPrintInput<T>, options?: { size?: string; margin?: string }): Promise<void>` — 템플릿을 숨겨 붙인 뒤 `@media print` CSS 로 그것만 출력. `size` 기본 `"A4 auto"`, `margin` 기본 `"0"`. 이미지 로드 완료를 기다린 후 인쇄.
- `getPdfBufferAsync<T extends SdPrint>(template: SdPrintInput<T>, options?: { orientation?: "portrait"|"landscape"; pageSize?: string }): Promise<Uint8Array>` — `.page` 요소들(없으면 루트)을 캔버스로 렌더해 jsPDF 로 PDF 바이트 생성. `orientation` 기본 portrait, `pageSize` 기본 `"a4"`. 첨부/저장용 PDF 가 필요할 때.
- `SdPrint = { initialized: Signal<boolean>; _optionalPrintInputs?: string }` — 인쇄 템플릿 컴포넌트 규약. `initialized` 가 true 가 되어야 인쇄 진행(데이터 로드 대기).
- `SdPrintInput<T> = { type: Type<T>; inputs: ... }` — 인쇄 컴포넌트 + input 값(`_optionalPrintInputs` 표시 키는 optional).
- 사용: `await this._sdPrint.printAsync({ type: OutboundPrintTemplate, inputs: { id } })`. 인쇄 템플릿 파일은 `<domain>.print-template.ts`(client-component.md).
