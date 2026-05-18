# @simplysm/service-common — protocol

서비스 transport(웹소켓 등) 위에 얹는 바이너리 메시지 프로토콜(V2). 메시지를 청크로 자르고/재조립하며, 청크 누적의 GC 까지 캡슐화한다.

## PROTOCOL_CONFIG

```ts
const PROTOCOL_CONFIG = {
  MAX_TOTAL_SIZE: 100 * 1024 * 1024, // 100MB 한계 (인/디코딩 양쪽에서 검사)
  SPLIT_MESSAGE_SIZE: 3 * 1024 * 1024, // 이 크기 초과 시 청크 분할
  CHUNK_SIZE: 300 * 1024,              // 청크 본문 크기
  GC_INTERVAL: 10 * 1000,              // 청크 누적기 GC 주기
  EXPIRE_TIME: 60 * 1000,              // 미완성 메시지 만료
} as const;
```

`as const`. 임계값 조정 필요 시 이 상수를 참조한다.

## ServiceProtocol

```ts
interface ServiceProtocol {
  encode(uuid: string, message: ServiceMessage): { chunks: Bytes[]; totalSize: number };
  decode<T extends ServiceMessage>(bytes: Bytes): ServiceMessageDecodeResult<T>;
  dispose(): void;
}
```

- 청크 헤더 28B: UUID 16B + TotalSize 8B(uint64, 상위 4B 는 0) + Index 4B(uint32), Big Endian.
- 본문: `json.stringify([name, body?])` UTF-8.
- `dispose()` 는 내부 `LazyGcMap` 의 GC 타이머를 해제. 인스턴스 종료 시 반드시 호출.

## ServiceMessageDecodeResult

```ts
type ServiceMessageDecodeResult<T extends ServiceMessage> =
  | { type: "complete"; uuid: string; message: T }
  | { type: "progress"; uuid: string; totalSize: number; completedSize: number };
```

- `complete`: 모든 청크 수신·재조립 완료. 메시지 디스패치 가능.
- `progress`: 청크 일부만 도착. 진행률 표시·`progress` 알림 송신에 사용.

## createServiceProtocol()

`ServiceProtocol` 인스턴스를 생성한다. 서버·클라이언트 각자 1 개씩 보유하는 것이 일반적.

```ts
const proto = createServiceProtocol();
const { chunks } = proto.encode(uuid, { name: "User.findOne", body: [{ id: 1 }] });
for (const c of chunks) socket.send(c);

const res = proto.decode<ServiceServerMessage>(receivedBytes);
if (res.type === "complete") handle(res.message);
```

예외:

- `MAX_TOTAL_SIZE` 초과: `ArgumentError("메시지 크기가 제한을 초과했습니다.")`.
- 헤더(<28B) 미달: `ArgumentError("버퍼 크기가 헤더 크기보다 작습니다.")`.
- 본문 JSON 파싱 실패: `ArgumentError("메시지 디코딩에 실패했습니다.", { uuid, cause })`.
- 무결성 위반(누적 크기 > totalSize): `ArgumentError("프로토콜 무결성 위반: ...")`.

중복 청크는 인덱스가 이미 채워진 경우 무시(방어). 만료(`EXPIRE_TIME`) 시 누적 항목은 GC 가 폐기.
