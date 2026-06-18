# @simplysm/service-client — 저수준 전송 계층

`ServiceClient` 가 생성자에서 내부적으로 조립하는 저수준 모듈들. WebSocket 연결·하트비트·자동 재연결(SocketProvider), 요청/응답 uuid 매칭과 메시지 디스패치(ServiceTransport), 인코딩/디코딩의 Worker 오프로딩(ClientProtocolWrapper). 일반 사용에서는 `ServiceClient` 만 쓰면 되며, 이 계층은 소켓·청크·하트비트 동작을 이해해야 할 때만 읽는다.

## SocketProvider / createSocketProvider

WebSocket 1개의 연결·하트비트·자동 재연결 담당.

`createSocketProvider(url, clientName, maxReconnectCount): SocketProvider` — 프로바이더 생성. 이 모듈은 import 시점에 글로벌 `WebSocket` 이 없으면 `ws` 패키지로 polyfill 한다(Node 환경).

- `url: string` — `ws(s)://host:port/ws`. 접속 시 `ver=2`, 생성된 `clientId`(UUID), `clientName` 쿼리를 붙임.
- `clientName: string` — 접속 쿼리에 실리는 식별명.
- `maxReconnectCount: number` — 최대 재연결 시도 횟수. 0 이면 재연결 안 함.

내부 상수: ping 5초 간격 전송, 30초 무수신 시 타임아웃, 재연결 3초 간격. 1바이트 `0x01` ping 전송, 수신한 1바이트 `0x02` pong 은 무시(하트비트 타임스탬프만 갱신).

`SocketProvider` 멤버:

- `clientName: string` (readonly) — 생성 시 받은 식별명.
- `connected: boolean` (getter) — 소켓이 OPEN 상태인지.
- `connect(): Promise<void>` — 접속 시작. 실패 시 throw, 성공 시 재연결 카운트 리셋 후 `state: "connected"` emit.
- `close(): Promise<void>` — 수동 종료. 이후 자동 재연결 안 함. 소켓 CLOSED 까지 대기 후 `state: "closed"` emit.
- `send(data: Bytes): Promise<void>` — 바이트 전송. 일정 시간 내 미연결이면 throw("서버에 연결되지 않았습니다. 인터넷 연결을 확인해 주세요.").
- `on(type, listener)` / `off(type, listener)` — 이벤트 구독/해제.

`SocketProviderEvents`:

- `message: Bytes` — 수신 바이트(1바이트 ping/pong 제어 프레임 제외).
- `state: "connected" | "closed" | "reconnecting"` — 연결 상태 전이. `"connected"` = 연결/재연결 성공, `"closed"` = 수동 종료 또는 재연결 한도 초과, `"reconnecting"` = 재연결 시도 중.

하트비트 타임아웃 감지 시 소켓을 강제 정리하고(늦은 `onclose` 로 인한 중복 재연결 방지를 위해 핸들러 해제) 수동 종료가 아니면 재연결을 시도. 재연결은 재귀 대신 루프로 수행하며 최대 시도 초과 시 `state: "closed"` emit.

## ServiceTransport / createServiceTransport

요청별 uuid 매칭, 응답/에러/진행률/서버이벤트 디스패치 담당.

`createServiceTransport(socket, protocol): ServiceTransport` — 트랜스포트 생성. 소켓 `message` 를 받아 decode 후 종류별 분기. 소켓이 `closed`/`reconnecting` 되면 대기 중인 모든 요청을 reject("요청 취소됨: ...") 하여 메모리 해제.

- `socket: SocketProvider` — 하위 소켓.
- `protocol: ClientProtocolWrapper` — 인코드/디코드 래퍼.

`ServiceTransport` 멤버:

- `send(message, progress?): Promise<unknown>` — 요청 1건 전송 후 응답 Promise 반환. uuid 생성 → 리스너 선등록 → encode → 청크 순차 전송. 응답(`response`) 수신 시 resolve, 에러(`error`) 수신 시 서버 에러 필드를 머지한 `Error` 로 reject. `message = ServiceClientMessage`, `progress = ServiceProgress`(선택).
- `on(type, listener)` / `off(type, listener)` — 이벤트 구독/해제.

`ServiceTransportEvents`:

- `event: { keys: string[]; data: unknown }` — 서버가 푸시한 `evt:on` 메시지. `EventClient` 가 이걸 구독해 keys 에 매칭되는 로컬 리스너로 디스패치.

decode 실패 시에도 헤더 16바이트에서 uuid 를 선추출해 해당 요청만 reject. 분할 응답이면 완료 시 `progress.response` 로 100% 를 한 번 더 보고. 서버측 진행 메시지(`name: "progress"`)는 `progress.server` 로 전달.

## ClientProtocolWrapper / createClientProtocolWrapper

인코드/디코드를 크기 기준으로 Worker 에 오프로딩하는 래퍼. `@simplysm/service-common` 의 `ServiceProtocol` 을 감쌈. Worker 미가용·임계값(30KB) 이하면 메인 스레드 처리로 폴백.

`createClientProtocolWrapper(protocol): ClientProtocolWrapper` — 래퍼 생성.

`ClientProtocolWrapper` 멤버:

- `encode(uuid, message): Promise<{ chunks: Bytes[]; totalSize: number }>` — 메시지를 청크 배열로 인코드. body 가 `Uint8Array`, 30KB 초과 문자열, 길이 100 초과 배열, 또는 첫 항목이 `Uint8Array` 인 배열이면 Worker 사용(그 외·Worker 미가용 시 메인 스레드). `message = ServiceMessage`.
- `decode(bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>` — 수신 바이트 디코드. 청크 재조립(stateful)은 한 메시지의 청크가 서로 다른 누적기로 흩어지지 않도록 항상 메인 스레드 단일 누적기에서 수행하고(#35), 재조립 완료 후 30KB 초과 JSON 파싱(stateless)만 Worker 에 위임. 미완료(progress) 상태면 그대로 반환.
- `dispose(): void` — 프로토콜과 Worker 리졸버 정리. `ServiceClient.close()` 에서 호출.

Worker 는 browser DOM Worker 또는 Node `worker_threads` 중 가용한 쪽을 lazy 초기화하며, Worker 작업이 60초 내 응답하지 않으면 해당 작업을 시간 초과로 reject 한다.
