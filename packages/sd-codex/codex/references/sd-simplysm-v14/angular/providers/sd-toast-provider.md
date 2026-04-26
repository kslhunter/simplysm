# `SdToastProvider`

> **읽어야 하는 상황**: 사용자에게 성공/경고/에러 등 토스트 알림을 표시하거나, 비동기 작업의 에러를 자동 처리(`try`)할 때.

토스트 알림 프로바이더. 4가지 심각도(info/success/warning/danger) 메시지, 프로그래스 모드, 커스텀 토스트를 지원한다.

```typescript
@Injectable({ providedIn: "root" })
class SdToastProvider {
  alertThemes = signal<SdToastSeverity[]>([]);
  overlap = signal(false);
  beforeShowFn?: (theme: SdToastSeverity) => void;

  info(message: string, useProgress?: true): WritableSignal<number>;
  info(message: string, useProgress?: false): void;
  success(message: string, useProgress?: true): WritableSignal<number>;
  success(message: string, useProgress?: false): void;
  warning(message: string, useProgress?: true): WritableSignal<number>;
  warning(message: string, useProgress?: false): void;
  danger(message: string, useProgress?: true): WritableSignal<number>;
  danger(message: string, useProgress?: false): void;

  notify<T extends SdToastContentDef<any>>(input: SdToastInput<T>): Promise<...>;
  async try<R>(fn: () => Promise<R>, messageFn?: (err: Error) => string): Promise<R | undefined>;
  try<R>(fn: () => R, messageFn?: (err: Error) => string): R | undefined;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `alertThemes` | property | `WritableSignal<SdToastSeverity[]>` | alert()로 표시할 테마 목록 |
| `overlap` | property | `WritableSignal<boolean>` | 오버랩 모드 (새 토스트 시 기존 제거) |
| `beforeShowFn` | property | `((theme) => void) \| undefined` | 토스트 표시 전 콜백 |
| `info/success/warning/danger(message, useProgress?)` | method | overloaded | 토스트 표시. `useProgress=true`면 progress signal 반환 |
| `notify(input)` | method | `(SdToastInput<T>) => Promise<...>` | 커스텀 토스트 컴포넌트 표시 |
| `try(fn, messageFn?)` | method | overloaded | 에러 catch 시 danger 토스트 표시 후 undefined 반환 |

## Usage

### `try` 사용 패턴

비동기 작업을 `try`로 감싸면 에러 발생 시 자동으로 danger 토스트를 표시하고 `undefined`를 반환한다:

```typescript
private readonly _sdToast = inject(SdToastProvider);
busyCount = signal(0);

async _refresh(): Promise<void> {
  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    const result = await this._search(true);
    this.items.set(result.items);
  });
  this.busyCount.update((v) => v - 1);
}
```

`messageFn`을 전달하면 에러 메시지를 커스텀할 수 있다:

```typescript
await this._sdToast.try(
  async () => { /* ... */ },
  (err) => `저장 실패: ${err.message}`,
);
```
