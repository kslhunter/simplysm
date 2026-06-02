# @simplysm/angular — 모달·토스트·Busy·인쇄 (오버레이)

화면 위에 띄우는 피드백·오버레이 묶음. 프로그래밍 방식으로 모달/토스트를 띄우거나 작업 진행 표시, 화면 인쇄/PDF 가 필요할 때 함께 읽힘.

## SdModalProvider

`@Injectable({providedIn:"root"})`. 컴포넌트를 모달로 동적 생성.

- showAsync<T>(modal: SdModalInfo<T>, options?: SdModalOptions): Promise<close결과 | undefined> — 모달 표시. 컨텐츠 컴포넌트의 `close.emit(result)` 시 result 로 resolve, 배경클릭/ESC/닫기버튼 시 undefined 로 resolve. 첫 탭 가능 컨트롤에 자동 포커스.
- modalCount: Signal<number> — 현재 열린 모달 수.

`SdModalInfo<T, X>` = `{ title: string; type: Type<T>; inputs: ... }`. inputs 는 컨텐츠 컴포넌트의 input 중 `initialized`/`close`/`actionTplRef`/`_optionalModalInputs` 와 X 로 지정한 키를 제외한 것. `_optionalModalInputs` 로 선언한 키는 optional.

`SdModalContentDef<O>` — 모달 컨텐츠 컴포넌트가 구현할 인터페이스:
- initialized: Signal<boolean> — 초기화 완료 신호(인쇄/대기 동기화에 사용).
- close: OutputEmitterRef<O | undefined> — 결과 emit. O 가 모달 반환 타입.
- actionTplRef?: TemplateRef — 헤더 우측 액션 영역에 투영할 템플릿(있으면 모달 헤더로 브릿지됨).
- _optionalModalInputs?: string — optional 로 둘 input 키들의 유니온 타입 표식(런타임 값 아님).

`SdModalOptions`:
- key?: string — 지정 시 크기·위치를 `SdSystemConfigProvider` 에 영속(`sd-modal.<key>`).
- hideHeader?: boolean — 헤더(제목·닫기버튼) 숨김.
- hideCloseButton?: boolean — 우상단 닫기 버튼만 숨김.
- headerStyle?: string — 헤더 인라인 스타일.
- useCloseByBackdrop?: boolean — 배경 클릭으로 닫기 허용(기본 true). 입력 확인 모달이면 false.
- useCloseByEscapeKey?: boolean — ESC 로 닫기 허용(기본 true).
- float?: boolean — 배경(backdrop) 없이 떠 있는 모달. 비차단 패널이면 true.
- fill?: boolean — 화면 가득 채움(전체화면 모달).
- resizable?: boolean — 8방향 리사이즈 핸들 표시.
- movable?: boolean — 헤더 드래그로 이동.
- position?: "bottom-right" | "top-right" — 고정 위치(알림형 모달).
- minHeightPx/minWidthPx/heightPx/widthPx?: number — 최소·초기 크기(px).
- noFirstControlFocusing?: boolean — 첫 컨트롤 자동 포커스 비활성(다이얼로그 자체에 포커스).

```ts
const result = await sdModal.showAsync(
  { title: "사용자 선택", type: UserSelectModal, inputs: { teamId } },
  { resizable: true, key: "user-select" },
);
```

## SdModal

`<sd-modal>` — `SdModalProvider` 가 내부적으로 생성하는 셸 컴포넌트. 직접 템플릿에 쓰기보다 provider 경유 권장. 위 `SdModalOptions` 와 동일한 input 들 + `open = model(false)`, `closeRequest = output<void>()`, `title`/`actionTplRef` input 보유.

## SdActivatedModalProvider

모달 컨텐츠 컴포넌트 내부에서 inject. 현재 모달 제어.
- modalComponent: Signal<SdModal | undefined> / contentComponent: Signal<T | undefined>.
- canDeactivateFn: () => boolean — 닫기 차단 판정. `setupCanDeactivate` 가 설정. true 가 아니면 배경/ESC/버튼 닫기 무시.

## SdPromptModal / SdConfirmModal

provider 에 바로 넘길 수 있는 범용 모달 컴포넌트.
- SdPromptModal: `SdModalContentDef<string>`. `message = input.required<string>()`. 텍스트 입력(필수) 후 확인 시 입력값, 취소 시 undefined emit.
- SdConfirmModal: `SdModalContentDef<boolean>`. `message = input.required<string>()`. 확인 시 `true`, 취소 시 undefined emit.

```ts
const name = await sdModal.showAsync({ title: "이름", type: SdPromptModal, inputs: { message: "이름?" } });
```

## SdToastProvider

`@Injectable({providedIn:"root"})`. 토스트 알림.

- info/success/warning/danger(message: string, useProgress?: boolean) — 심각도별 토스트. useProgress=true 면 진행률 토스트가 되어 `WritableSignal<number>`(0~100) 반환, 100 도달 1초 뒤 자동 해제. useProgress 없거나 false 면 3초 후 자동 해제(호버 중 지연), 반환 void.
- notify<T>(input: SdToastInput<T>): Promise<close결과 | undefined> — 커스텀 컴포넌트 토스트. `SdToastInput<T>` = `{ type: Type<T>; inputs }`(컨텐츠는 `SdToastContentDef<O>` = `{ close: OutputEmitterRef<O|undefined> }` 구현). 5초 후 자동 해제.
- try<R>(fn, messageFn?): Promise<R | undefined> — fn 실행 중 Error 발생 시 danger 토스트 + 시스템로그 기록 후 undefined 반환(Error 아닌 throw 는 재throw). 화면 액션 핸들러를 감싸는 표준 패턴.
- alertThemes: WritableSignal<SdToastSeverity[]> — 이 심각도들은 토스트 대신 `window.alert`.
- overlap: WritableSignal<boolean> — true 면 새 토스트가 기존 토스트 모두 제거 후 표시(겹침 방지).
- beforeShowFn?: (theme) => void — 토스트 표시 직전 콜백(예: 사운드).

타입: `SdToastSeverity = "info"|"success"|"warning"|"danger"`, `SdToastTheme = "primary"|"secondary"|SdToastSeverity|"gray"|"blue-gray"`.

```ts
await sdToast.try(async () => { await save(); sdToast.success("저장됨"); });
```

## SdToast / SdToastContainer

`SdToastProvider` 가 내부 생성. 직접 쓸 일 드묾. SdToast: `open`/`progress`/`message` model, `useProgress`/`theme` input, severity 에 따라 `role`/`aria-live` 자동(info·success=status/polite, warning·danger=alert/assertive). SdToastContainer: `overlap` input.

## SdBusyProvider

`@Injectable({providedIn:"root"})`. 전역 로딩 표시.
- globalBusyCount: WritableSignal<number> — >0 이면 전역 busy 오버레이 표시(라우팅·인쇄가 자동 증감). 직접 작업 감쌀 때 update 로 증감.
- type: WritableSignal<SdBusyType> — 기본 표시 유형. `SdBusyType = "spinner"|"bar"|"cube"`.

## SdBusyContainer

`<sd-busy-container [busy]="..." />` — 영역 단위 busy 오버레이. 내부 컨텐츠 위에 표시.
- busy: boolean — true 면 오버레이 표시 + 영역 내 키입력 차단.
- message?: string — 표시 메시지.
- type?: "spinner"|"bar"|"cube" — 미지정 시 `SdBusyProvider.type` 사용.
- progressPercent?: number — 지정 시 상단 진행 바 표시(0~100).

## SdPrintProvider

`@Injectable({providedIn:"root"})`. 컴포넌트를 인쇄/PDF 로 렌더.
- printAsync<T>(template: SdPrintInput<T>, options?: { size?: string; margin?: string }): Promise<void> — 컴포넌트를 body 에 임시 렌더 후 `window.print()`. size 기본 `"A4 auto"`, margin 기본 `"0"`. 인쇄 동안 글로벌 busy.
- getPdfBufferAsync<T>(template, options?: { orientation?: "portrait"|"landscape"; pageSize?: string }): Promise<Uint8Array> — `.page` 엘리먼트별로 캔버스 변환(jsPDF) 후 PDF 버퍼 반환. pageSize 기본 `"a4"`, orientation 기본 portrait.

`SdPrintInput<T, X>` = `{ type: Type<T>; inputs }`. 컨텐츠는 `SdPrint`(= `{ initialized: Signal<boolean>; _optionalPrintInputs?: string }`) 구현. `initialized()` 가 true 가 되고 이미지 로드 완료까지 대기 후 인쇄.
