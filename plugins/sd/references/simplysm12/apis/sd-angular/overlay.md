# @simplysm/sd-angular — overlay (modal, toast, busy, dropdown)

동적 컴포넌트 오버레이.

- 모달: 컴포넌트 클래스를 띄우고 close output 으로 결과 회수.
- 토스트, busy: 메시지, 진행 표시.
- dropdown: 템플릿 기반 팝업.

## SdModalProvider (root)
컴포넌트를 모달로 띄움. 콘텐츠 컴포넌트는 `ISdModal<O>` 구현 필요: `{ initialized: Signal<boolean>; close: OutputEmitterRef<O | undefined>; actionTplRef?: TemplateRef }`.

### `showAsync<T extends ISdModal<any>>(modal: ISdModalInfo<T>, options?): Promise<O | undefined>`
- **modal: ISdModalInfo<T>** = `{ title: string; type: Type<T>; inputs: Omit<TDirectiveInputSignals<T>, X> }` — 제목, 컴포넌트, 입력 바인딩.
- **반환** — 컴포넌트가 `close.emit(val)` 한 값(또는 backdrop/esc 닫힘 시 undefined).
- **options** (모두 선택):
  - **key?: string** — 모달 위치/크기 저장 식별자.
  - **hideHeader?/hideCloseButton?: boolean** — 헤더/닫기버튼 숨김.
  - **useCloseByBackdrop?/useCloseByEscapeKey?: boolean** — 배경 클릭/ESC 로 닫기 허용.
  - **float?: boolean** — 플로팅(비모달) 모드.
  - **minHeightPx?/minWidthPx?: number** — 최소 크기.
  - **resizable?: boolean**(기본 true) / **movable?: boolean**(기본 true) — 크기조절, 이동.
  - **headerStyle?: string** — 헤더 인라인 스타일.
  - **fill?: boolean** — 내용 영역 꽉 채움.
  - **noFirstControlFocusing?: boolean** — 열릴 때 첫 포커스 가능요소 자동 포커스 안 함.
- **동작** — 콘텐츠 컴포넌트를 SdModalControl 안에 투영, `initialized()` 까지 대기 후 표시.
  - 전역 busy 증가.
  - canDeactivefn 이 false 면 close 무시.
- **modalCount: SdWritableSignal<number>** — 현재 열린 모달 수(command 플러그인의 스코프 판정에 사용).

### `SdActivatedModalProvider<T>` (injectable, 모달 콘텐츠 내부 주입)
- **modalComponent: Signal<SdModalControl>** / **contentComponent: Signal<T>** — 모달/내용 컴포넌트 참조.
- **canDeactivefn: () => boolean** — 닫기 전 검증 함수(setupCanDeactivate 가 설정).

### `SdModalInstance<T>`
- showAsync 내부 사용 인스턴스(직접 생성 드묾). `close: EventEmitter`.

### `ISdModalConfig`
- 모달 설정 인터페이스(SdModalControl export).

## SdToastProvider (root)
화면 우측 토스트. 자동 5초(progress 모드면 100% 도달 후) 닫힘, hover 중이면 연장.
- **info/success/warning/danger(message: string, useProgress = false): { progress; message; open }** — 테마별 토스트.
  - useProgress 면 progress signal 로 진행률 표시.
  - alertThemes 에 포함된 테마는 `alert()` 로 대체.
- **try<R>(fn: () => R | Promise<R>, messageFn?: (err) => string): R | undefined**
  - fn 실행, Error 면 danger 토스트+systemLog 기록 후 undefined(Error 아니면 rethrow).
  - 화면 액션 표준 에러 처리.
- **notify<T extends ISdToast<any>>(toast: ISdToastInput<T>): { open }** — 커스텀 토스트 컴포넌트 표시.
  - `ISdToast<O>` = `{ close: OutputEmitterRef<O | undefined> }`, `ISdToastInput` = `{ type; inputs }`.
- **alertThemes: SdWritableSignal<("info"|"success"|"warning"|"danger")[]>** — 토스트 대신 alert 로 띄울 테마(키오스크 등).
- **overlap: SdWritableSignal<boolean>** — true 면 새 토스트가 기존 것 대체.
- **beforeShowFn?: (theme) => void** — 표시 직전 훅(사운드 등).

## SdBusyProvider (root)
- **globalBusyCount: SdWritableSignal<number>** — >0 이면 전역 busy 오버레이 표시(라우팅/모달/인쇄가 증감). update 로 직접 증감 가능.
- **type: SdWritableSignal<"spinner" | "bar" | "cube">** (기본 `"bar"`) — 전역 busy 표시 형태.

## sd-dropdown / sd-dropdown-popup
- **SdDropdownControl** — `sd-dropdown`. 트리거 요소와 `<sd-dropdown-popup>` 자식으로 구성.
  - **open: model<boolean>**(기본 false) — 팝업 열림 양방향.
  - **disabled: boolean**(transformBoolean) / **contentClass?: string** / **contentStyle?: string**.
  - 파괴(destroy) 시 팝업 정리 — tests/sd-dropdown.destroy.spec.ts 가 `@if` 제거 시 팝업 누수 없음을 검증.
- **SdDropdownPopupControl** — `sd-dropdown-popup`. 드롭다운 팝업 내용 컨테이너.

`SdToastControl`/`SdToastContainerControl`/`SdBusyContainerControl`/`SdModalControl` 은 provider 가 동적 생성하지만 직접 selector 로도 사용 가능(input 은 ui-controls.md 참조).
