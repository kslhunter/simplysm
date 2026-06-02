# @simplysm/angular — 모달·토스트·Busy·인쇄 (오버레이)

프로그래밍 방식으로 동적 컴포넌트를 body 에 부착하는 루트 프로바이더 4종(모달/토스트/Busy/인쇄)과 콘텐츠 컴포넌트가 구현할 인터페이스. 모두 `createComponent` + `ApplicationRef.attachView` 로 동작.

## SdModalProvider

`class SdModalProvider` — 모달을 프로그래밍 방식으로 띄우는 루트 프로바이더.

- `modalCount: Signal<number>` — 현재 열린 모달 수.
- `showAsync<T>(modal: SdModalInfo<T>, options?: SdModalOptions): Promise<결과 | undefined>` — 모달 표시. 콘텐츠 컴포넌트의 `close` emit 값으로 resolve, 배경/ESC/닫기버튼이면 `undefined`. 닫힘 애니메이션·포커스 복원·z-index 스택 처리.

`SdModalInfo<T, X>`:
- `title: string` — 모달 헤더 제목.
- `type: Type<T>` — 콘텐츠 컴포넌트 클래스(`SdModalContentDef` 구현).
- `inputs` — 콘텐츠 컴포넌트의 input 값 객체(`initialized`/`close`/`actionTplRef` 제외, `_optionalModalInputs` 로 지정된 키는 optional).

`SdModalOptions`(모두 optional):
- `key` — 설정 키. 지정 시 크기·위치를 `SdSystemConfigProvider` 에 영속화.
- `hideHeader` — 헤더 전체 숨김.
- `hideCloseButton` — 닫기(X) 버튼만 숨김.
- `headerStyle` — 헤더 인라인 스타일.
- `useCloseByBackdrop` — 배경 클릭으로 닫기 허용. 기본 true.
- `useCloseByEscapeKey` — ESC 로 닫기 허용. 기본 true.
- `float` — 배경 없는 플로팅 모달(다른 조작 가능).
- `fill` — 전체화면 채움.
- `resizable` — 모서리/변 드래그 리사이즈.
- `movable` — 헤더 드래그 이동.
- `position` — `"bottom-right"|"top-right"`. 고정 위치.
- `minHeightPx`/`minWidthPx`/`heightPx`/`widthPx` — 크기 px.
- `noFirstControlFocusing` — 첫 입력요소 자동 포커스 끔(true 면 dialog 자체 포커스).

`SdModalContentDef<O>`(콘텐츠 컴포넌트 구현 인터페이스):
- `initialized: Signal<boolean>` — 초기화 완료 신호.
- `close: OutputEmitterRef<O | undefined>` — 결과 emit 시 모달 닫힘.
- `actionTplRef?: TemplateRef<any>` — 헤더 우측 액션 영역 템플릿.
- `_optionalModalInputs?: string` — optional 처리할 input 키(타입 마커).

```typescript
const result = await sdModal.showAsync(
  { title: "사용자 선택", type: UserSelectModal, inputs: { deptId } },
  { resizable: true, key: "user-select" },
);
```

## SdModal

`<sd-modal>` — 모달 셸 컴포넌트. 보통 `SdModalProvider` 가 내부 생성하지만 선언적으로도 사용 가능.

- `open = model(false)` — 열림 여부 양방향.
- `title`/`hideHeader`/`hideCloseButton`/`headerStyle`/`useCloseByBackdrop`/`useCloseByEscapeKey`/`float`/`fill`/`resizable`/`movable`/`position`/`minHeightPx`/`minWidthPx`/`heightPx`/`widthPx`/`actionTplRef` — `SdModalOptions` 와 동일 의미의 input.
- `key` — 크기·위치 영속화 키.
- `closeRequest = output<void>()` — 배경/ESC/닫기버튼으로 닫기 요청 시 emit.

## SdActivatedModalProvider

`class SdActivatedModalProvider<T>` — 모달 콘텐츠 내부에서 inject 해 모달 컨텍스트에 접근.

- `modalComponent: Signal<SdModal | undefined>` — 부모 `SdModal` 인스턴스.
- `contentComponent: Signal<T | undefined>` — 콘텐츠 컴포넌트 인스턴스.
- `canDeactivateFn: () => boolean` — 닫기 차단 함수(true 면 닫힘 허용). `setupCanDeactivate` 가 설정.

## SdPromptModal / SdConfirmModal

내장 범용 모달 콘텐츠. `SdModalProvider.showAsync` 의 `type` 으로 사용.

- `SdPromptModal` — `SdModalContentDef<string>`. `message: input.required<string>()` 표시 후 텍스트 입력. 확인 시 입력값 emit(필수 검증), 취소 시 `undefined`.
- `SdConfirmModal` — `SdModalContentDef<boolean>`. `message` 표시 후 확인 시 `true`, 취소 시 `undefined` emit.

## SdToastProvider

`class SdToastProvider` — 토스트 알림 루트 프로바이더.

- `alertThemes: WritableSignal<SdToastSeverity[]>` — 이 심각도는 토스트 대신 `window.alert` 로 표시.
- `overlap: WritableSignal<boolean>` — true 면 새 토스트가 기존 토스트를 모두 치우고 겹쳐 표시.
- `beforeShowFn?: (theme) => void` — 토스트 표시 직전 콜백.
- `info/success/warning/danger(message, useProgress?)` — 심각도별 토스트. `useProgress: true` 면 `WritableSignal<number>`(0~100) 반환(100 도달 1초 후 자동 해제), 아니면 3초 후 자동 해제(호버 시 지연).
- `notify<T>(input: SdToastInput<T>): Promise<결과|undefined>` — 커스텀 컴포넌트 토스트. `close` emit 값으로 resolve, 5초 후 자동 `undefined`.
- `try<R>(fn, messageFn?): Promise<R|undefined>` — `fn` 실행, `Error` 발생 시 `danger` 토스트 + 시스템로그 후 `undefined` 반환(비-Error 는 rethrow). `messageFn` 으로 메시지 커스터마이즈.

타입:
- `SdToastSeverity` — `"info"|"success"|"warning"|"danger"`.
- `SdToastTheme` — `"primary"|"secondary"|SdToastSeverity|"gray"|"blue-gray"`.
- `SdToastContentDef<O>` — `{ close: OutputEmitterRef<O|undefined> }`. notify 콘텐츠 구현.
- `SdToastInput<T>` — `{ type: Type<T>; inputs }`(`close` 제외 input).

```typescript
sdToast.danger("저장 실패");
const progress = sdToast.info("업로드 중", true);
progress.set(50);
await sdToast.try(() => api.saveAsync());
```

## SdToast / SdToastContainer

- `<sd-toast>` — 개별 토스트. `open`/`progress`/`message` 는 `model`, `useProgress`/`theme` 는 input. theme 에 따라 `role`/`aria-live`(info·success=polite/status, warning·danger=assertive/alert) 자동.
- `<sd-toast-container>` — 토스트 컨테이너. `overlap = input(false)` — 겹침 모드.

## SdBusyProvider / SdBusyContainer

전역·지역 로딩 표시.

- `SdBusyProvider` — `type: WritableSignal<SdBusyType>` 기본 스피너 종류, `globalBusyCount: WritableSignal<number>` 0 초과 시 전역 busy 오버레이 표시. 라우팅·인쇄가 자동 증감.
- `SdBusyType` — `"spinner"|"bar"|"cube"`. 인디케이터 모양.
- `<sd-busy-container>` — 지역 busy 래퍼. `busy = input(false)` 표시 여부, `message`/`type`(미지정 시 프로바이더 type 따름)/`progressPercent`(0~100 막대) input. busy 중 키입력 차단.

## SdPrintProvider

`class SdPrintProvider` — 컴포넌트를 인쇄하거나 PDF 버퍼로 만드는 루트 프로바이더. 진행 중 전역 busy 증가.

- `printAsync<T>(template: SdPrintInput<T>, options?: { size?: string; margin?: string }): Promise<void>` — 템플릿 컴포넌트를 body 에 부착·`@page` 스타일 주입 후 `window.print()`. 이미지 로드 대기.
- `getPdfBufferAsync<T>(template, options?: { orientation?: "portrait"|"landscape"; pageSize?: string }): Promise<Uint8Array>` — `.page` 요소(없으면 전체)를 캔버스화해 jsPDF 로 PDF 버퍼 생성.

타입:
- `SdPrint` — `{ initialized: Signal<boolean>; _optionalPrintInputs?: string }`. 인쇄 콘텐츠 구현.
- `SdPrintInput<T, X>` — `{ type: Type<T>; inputs }`(`_optionalPrintInputs` 키는 optional).
