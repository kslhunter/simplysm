# @simplysm/angular — toast

전역 토스트. `SdToastContainer`는 첫 호출 시 body에 자동 생성.

## 기본 사용

```typescript
const toast = inject(SdToastProvider);
toast.info("저장되었습니다.");
toast.success("...");
toast.warning("...");
toast.danger("...");

const progress = toast.info("업로드 중", true);   // WritableSignal<number>
progress.set(50);   // 100 도달 시 1초 후 자동 dismiss

await toast.try(async () => svc.save(), (e) => `저장 실패: ${e.message}`);
// 에러 시 danger 토스트 + systemLog, 성공 시 결과 반환
```

- 일반 토스트: 3초 후 자동 해제(호버 중이면 leave 후 1초 지연).
- progress 토스트: 100% 도달 후 1초.
- `alertThemes = signal<SdToastSeverity[]>([])`: 포함된 severity는 토스트 대신 `window.alert`.
- `overlap = signal(false)`: 새 토스트 표시 시 기존 토스트 모두 제거.
- `beforeShowFn?: (theme) => void`: 표시 직전 후크 (예: 사운드).

## 커스텀 컨텐츠 토스트

```typescript
interface SdToastContentDef<O> { close: OutputEmitterRef<O | undefined>; }
interface SdToastInput<T>      { type: Type<T>; inputs: DirectiveInputSignals<T> 제외 close }

const result = await toast.notify({ type: MyToastComp, inputs: { kind: "x" } });
```

`close.emit` 시 resolve. 5초 자동 dismiss (resolve undefined).

## 타입

- `SdToastSeverity = "info" | "success" | "warning" | "danger"`
- `SdToastTheme = "primary" | "secondary" | SdToastSeverity | "gray" | "blue-gray"` (SdToast 컴포넌트의 theme input)

## `SdToast` / `SdToastContainer` (직접 사용은 비권장)

- `<sd-toast [open] [theme] [useProgress] [(progress)] [(message)]>` — aria-live 자동 (`polite` info/success, `assertive` warning/danger).
- `<sd-toast-container [overlap]>` — 위치 컨테이너. `SdToastProvider`가 lazily 생성.
