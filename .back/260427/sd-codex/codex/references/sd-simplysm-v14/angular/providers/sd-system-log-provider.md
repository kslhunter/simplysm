# `SdSystemLogProvider`

> **읽어야 하는 상황**: 시스템 로그를 기록할 때.

시스템 로그 기록 프로바이더. console 출력 + 커스텀 `writeFn` 콜백 호출.

```typescript
@Injectable({ providedIn: "root" })
class SdSystemLogProvider {
  writeFn?: (severity: "error" | "warn" | "log", ...data: any[]) => Promise<void> | void;
  async writeAsync(severity: "error" | "warn" | "log", ...data: any[]): Promise<void>;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `writeFn` | property | `((severity, ...data) => Promise<void> \| void) \| undefined` | 커스텀 로그 기록 함수 |
| `writeAsync(severity, ...data)` | method | `(...) => Promise<void>` | console 출력 후 `writeFn` 호출 |
