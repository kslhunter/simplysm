# @simplysm/angular — toast / busy / print

전역 알림·로딩·인쇄 프로바이더. 컨테이너는 첫 호출 시 body 에 자동 생성.

## SdToastProvider (root)

```ts
alertThemes: WritableSignal<SdToastSeverity[]>;        // 여기에 포함된 severity 는 window.alert 로 강제
overlap: WritableSignal<boolean>;                       // true 면 동시 표시 안 함(새 토스트가 기존 제거)
beforeShowFn?: (theme: SdToastSeverity) => void;

info/success/warning/danger(message: string, useProgress?: false): void;
info/success/warning/danger(message: string, useProgress: true): WritableSignal<number>;
notify<T extends SdToastContentDef<O>>(input: SdToastInput<T>): Promise<O|undefined>;
try<R>(fn: () => Promise<R>|R, messageFn?: (err) => string): Promise<R|undefined>|R|undefined;

type SdToastSeverity = "info"|"success"|"warning"|"danger";
type SdToastTheme = "primary"|"secondary"|SdToastSeverity|"gray"|"blue-gray";
interface SdToastContentDef<O> { close: OutputEmitterRef<O|undefined>; }
interface SdToastInput<T> { type: Type<T>; inputs: <T 의 input prop 들, close 제외>; }
```

- `info`/`success` 는 `polite` aria-live, `warning`/`danger` 는 `assertive`/`alert` role.
- `useProgress=true` 면 진행률 토스트. 반환 signal 에 0~100 set. 100 도달 후 1초 뒤 자동 해제. progress 모드가 아니면 3초(호버 중이면 마우스 떠난 뒤 1초) 자동 해제.
- `alertThemes` 에 severity 포함되면 토스트 대신 `window.alert(message)`. 키오스크/PWA 백그라운드 알림 강제용.
- `beforeShowFn` — 매 토스트 표시 직전 호출(소리·진동 등 부수효과).
- `notify` — 커스텀 컴포넌트 컨텐츠로 토스트. 컴포넌트가 `close.emit(result)` 호출 시 Promise resolve, 5초 후 자동 dismiss(undefined resolve).
- `try` — fn 실행 후 throw 된 Error 의 메시지로 `danger` 토스트 + `SdSystemLogProvider.writeAsync('error', ...)` 호출. 비-Error throw 는 다시 던짐.

```ts
sdToast.success("저장 완료");
const sig = sdToast.info("업로드 중...", true); sig.set(50);
await sdToast.try(async () => await api.save(item));
```

## SdToast / SdToastContainer

내부 사용 컴포넌트. 직접 쓸 일 거의 없음. `SdToastProvider` 가 첫 호출 시 `<sd-toast-container>` 를 body 에 append.

```ts
// SdToastContainer
overlap = input(false);   // true 면 절대배치로 1개만 표시되는 룩
```

## SdBusyProvider (root)

```ts
type: WritableSignal<SdBusyType>;            // "spinner"|"bar"|"cube", default "bar"
globalBusyCount: WritableSignal<number>;     // >0 이면 전역 busy 표시. provideSdAngular 가 navigation 동안 증감
type SdBusyType = "spinner"|"bar"|"cube";
```

- `globalBusyCount` 증가/감소로 전역 잠금 화면 토글.
- `type` — 인디케이터 모양. `spinner` 는 원형 회전, `bar` 는 상단 진행 바(슬림), `cube` 는 4분할 큐브 애니메이션.

## SdBusyContainer — `<sd-busy-container>`

```ts
busy = input(false); message = input<string|undefined>();
type = input<SdBusyType|undefined>();        // 미지정이면 SdBusyProvider.type() 사용
progressPercent = input<number|undefined>(); // 0~100, null 이면 막대 숨김
```

- 일부 영역만 busy 표시. `busy` true 동안 자식 영역에 오버레이 + 키보드 입력 차단.

```html
<sd-busy-container [busy]="loading()" [progressPercent]="pct()">...영역 내용...</sd-busy-container>
```

## SdPrintProvider (root)

```ts
printAsync<T extends SdPrint>(template: SdPrintInput<T>, options?: { size?: string; margin?: string }): Promise<void>;
getPdfBufferAsync<T extends SdPrint>(template: SdPrintInput<T>, options?: { orientation?: "portrait"|"landscape"; pageSize?: string }): Promise<Uint8Array>;

interface SdPrint { initialized: Signal<boolean>; readonly _optionalPrintInputs?: string; }
interface SdPrintInput<T, X = ""> { type: Type<T>; inputs: <T 의 input prop 들>; }
```

- 인쇄용 컴포넌트를 동적으로 body 에 부착 → `initialized() === true` 대기 → 이미지 로드 완료 대기 → `window.print()` 또는 jsPDF + html-to-image 로 PDF 버퍼 생성.
- `printAsync.options.size` — `@page size`. 기본 `"A4 auto"`.
- `printAsync.options.margin` — `@page margin`. 기본 `"0"`.
- `getPdfBufferAsync.options.pageSize` — jsPDF page 크기. 기본 `"a4"`.
- `getPdfBufferAsync.options.orientation` — `"portrait"`/`"landscape"`. 기본 `"portrait"`(`"p"`).
- PDF 생성 시 컴포넌트 안 `.page` 클래스 요소 각각 1페이지로 처리, 없으면 컴포넌트 전체 1페이지.
- 인쇄 진행 동안 `SdBusyProvider.globalBusyCount` 자동 증감.

```ts
await sdPrint.printAsync({ type: InvoicePrint, inputs: { order: data } }, { size: "A4 portrait" });
const buf = await sdPrint.getPdfBufferAsync({ type: InvoicePrint, inputs: { order } });
```

## 주의

- `SdToastProvider.try` 는 `Error` 가 아닌 throw 는 그대로 re-throw. 일반 함수에서 throw 시 반드시 Error 인스턴스 던질 것.
- `SdBusyContainer` 의 `min-height: 70px` 가 기본. 빈 컨테이너에서도 인디케이터 보이도록.
- `SdPrint.initialized` 를 컴포넌트가 true 로 안 set 하면 `wait.until` 이 영원히 대기. 비동기 데이터 로드 후 반드시 set.
