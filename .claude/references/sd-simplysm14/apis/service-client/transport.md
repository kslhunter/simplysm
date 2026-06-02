# @simplysm/service-client — 저수준 전송 계층

`ServiceClient` 가 생성자에서 내부적으로 조립하는 저수준 모듈들. WebSocket 연결·하트비트·재연결(SocketProvider), 요청/응답 매칭과 메시지 디스패치(ServiceTransport), 인코딩/디코딩의 Worker 오프로딩(ClientProtocolWrapper). 일반 사용에서는 `ServiceClient` 만 쓰면 되고, 이 계층은 직접 다룰 일이 드물다.

## SocketProvider / createSocketProvider

WebSocket 1개의 연결·하트비트·자동 재연결을 담당.

- `createSocketProvider(url: string, clientName: string, maxReconnectCount: number): SocketProvider` — 프로바이더 생성. `url` = `ws(s)://host:port/ws`, `clientName` = 접속 쿼리에 실리는 식별명, `maxReconnectCount` = 최대 재연결 시도(0 이면 재연결 안 함). 내부 상수: 하트비트 ping 5초 간격, 30초 무수신 시 타임아웃, 재연결 3초 간격. 1바이트 `0x01` ping 전송, `0x02` pong 수신은 무시.
- `clientName: string` (readonly) — 생성 시 받은 식별명.
- `connected: boolean` (getter) — 소켓이 OPEN 인지.
- `connect(): Promise<void>` — 접속 시작. 실패 시 throw, 성공 시 재연결 카운트 리셋하고 `state: "connected"` emit.
- `close(): Promise<void>` — 수동 종료. 이후 자동 재연결 안 함. `state: "closed"` emit.
- `send(data: Bytes): Promise<void>` — 바이트 전송. 일정 시간 내 미연결이면 throw.
- `on/off(type, listener)` — 이벤트 구독/해제. 이벤트(`SocketProviderEvents`): `message: Bytes`(수신 바이트), `state: "connected"|"closed"|"reconnecting"`(연결 상태 변화).

타임아웃 감지 시 소켓을 강제 정리하고(중복 onclose 재연결 방지로 핸들러 해제) 수동 종료가 아니면 재연결을 시도한다. 최대 시도 초과 시 `state: "closed"` emit.

## ServiceTransport / createServiceTransport

요청별 uuid 매칭, 응답/에러/진행률/서버이벤트 디스패치를 담당.

- `createServiceTransport(socket: SocketProvider, protocol: ClientProtocolWrapper): ServiceTransport` — 트랜스포트 생성. 소켓 `message` 를 받아 decode 후 종류별 분기. 소켓이 `closed`/`reconnecting` 되면 대기 중인 모든 요청을 reject(메모리 해제).
- `send(message: ServiceClientMessage, progress?: ServiceProgress): Promise<unknown>` — 요청 1건 전송 후 응답 Promise 반환. uuid 생성→리스너 등록→encode→청크 순차 전송. 응답 수신(`response`) 시 resolve, 에러(`error`) 시 서버 에러 필드를 머지한 `Error` 로 reject.
- `on/off(type, listener)` — 이벤트 구독/해제. 이벤트(`ServiceTransportEvents`): `event: { keys: string[]; data: unknown }`(서버가 푸시한 `evt:on` 메시지. `EventClient` 가 이걸 구독해 로컬 리스너로 디스패치).

decode 실패 시에도 헤더에서 uuid 를 선추출해 해당 요청만 reject 한다. 분할 응답이면 완료 시 `progress.response` 로 100% 를 한 번 더 보고.

## ClientProtocolWrapper / createClientProtocolWrapper

인코드/디코드를 크기 기준으로 Worker 에 오프로딩하는 래퍼. `@simplysm/service-common` 의 `ServiceProtocol` 을 감쌈.

- `createClientProtocolWrapper(protocol: ServiceProtocol): ClientProtocolWrapper` — 래퍼 생성. 임계값 30KB. Worker 미가용·임계값 이하면 메인 스레드 처리로 폴백.
- `encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>` — 메시지를 청크 배열로 인코드. body 가 Uint8Array, 30KB 초과 문자열, 길이 100 초과 배열, 또는 Uint8Array 항목 배열이면 Worker 사용.
- `decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>` — 수신 바이트 디코드. 청크 재조립(stateful)은 한 메시지의 청크가 흩어지지 않도록 **항상 메인 스레드 단일 누적기**에서 수행하고, 재조립 완료 후 30KB 초과 JSON 파싱(stateless)만 Worker 에 위임. 미완료(progress) 면 그대로 반환.
- `dispose(): void` — 프로토콜과 Worker 리졸버 정리. `ServiceClient.close()` 에서 호출.
