# `SdServiceClientFactoryProvider`

ServiceClient 인스턴스 팩토리/관리. key별로 연결을 관리한다.

```typescript
@Injectable({ providedIn: "root" })
class SdServiceClientFactoryProvider {
  async connectAsync(key: string, options?: Partial<ServiceConnectionOptions>): Promise<void>;
  async closeAsync(key: string): Promise<void>;
  get(key: string): ServiceClient;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `connectAsync(key, options?)` | method | `(string, options?) => Promise<void>` | WebSocket 연결. 요청/응답 진행률을 토스트로 표시 |
| `closeAsync(key)` | method | `(string) => Promise<void>` | 연결 종료 |
| `get(key)` | method | `(string) => ServiceClient` | 연결된 ServiceClient 인스턴스 반환 |

## Usage

소비 프로젝트에서 `AppServiceProvider` 패턴으로 감싸서 사용한다:

```typescript
@Injectable({ providedIn: "root" })
export class AppServiceProvider {
  private readonly _sdServiceClientFactory = inject(SdServiceClientFactoryProvider);

  get client() {
    return this._sdServiceClientFactory.get("MAIN");
  }

  get systemLog() {
    return this.client.getService<SystemLogServiceType>("SystemLog");
  }

  get orderUpdated() {
    return this.client.getEvent<typeof OrderUpdatedEvent>("OrderUpdated");
  }
}
```
