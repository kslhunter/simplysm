# Protocol

## `ServerProtocolWrapper`

메시지 인코딩/디코딩 래퍼 인터페이스. 무거운 메시지는 worker 스레드에 자동으로 위임하고, 가벼운 작업은 메인 스레드에서 처리한다.

```typescript
interface ServerProtocolWrapper {
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;
  dispose(): void;
}
```

| Method | Description |
|--------|-------------|
| `encode(uuid, message)` | 메시지를 인코딩한다. 바이너리 데이터(Uint8Array)가 포함된 메시지는 worker 스레드에 위임한다 |
| `decode(bytes)` | 메시지를 디코딩한다. 30KB 초과 메시지는 worker 스레드에 위임한다 |
| `dispose()` | 내부 프로토콜 리소스를 해제한다 |

Worker 위임 기준:
- **encode**: 메시지 body가 `Uint8Array`이거나, 배열 내에 `Uint8Array` 요소가 있을 때 worker 사용
- **decode**: 메시지 크기가 30KB(30 * 1024 바이트)를 초과할 때 worker 사용

Worker는 지연 싱글턴으로 생성되며, `maxOldGenerationSizeMb: 4096`의 리소스 제한이 설정되어 있다.

## `createServerProtocolWrapper`

`ServerProtocolWrapper` 인스턴스를 생성한다. 내부적으로 `@simplysm/service-common`의 `createServiceProtocol()`을 사용한다.

```typescript
function createServerProtocolWrapper(): ServerProtocolWrapper;
```
