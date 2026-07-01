# @simplysm/sd-service-common

sd-service 클라이언트/서버가 공유하는 통신 프로토콜(메시지 타입 + 바이너리 인코딩/디코딩)과 서비스 메서드 인터페이스 계약 정의.

## 사용 트리거 인덱스

- **SdServiceProtocol** — WebSocket 등 바이너리 채널로 보낼 서비스 메시지를 인코딩(자동 분할)하거나, 수신 패킷을 디코딩(분할 조립)할 때.
- **TSdServiceMessage 계열 타입** — 클라/서버가 주고받는 메시지의 형태(요청·응답·이벤트·에러·인증)를 타입으로 다룰 때.
- **ISdServiceMessageDecodeResult** — `decode()` 결과가 진행 중(progress)인지 완료(complete)인지 분기할 때.
- **서비스 인터페이스 계약** — (`ISdOrmService`, `ISdCryptoService`, `ISdSmtpClientService`, `ISdAutoUpdateService`) 서버 측 서비스 구현체 또는 클라 측 호출 프록시의 메서드 시그니처를 맞출 때.
- **설정/옵션 타입** — (`ICryptoConfig`, `ISmtpClient*`, `TDbConnOptions`) 해당 서비스 호출 시 넘길 옵션 객체를 구성할 때.
- **SdServiceEventListenerBase / ISdServiceUploadResult** — 서비스 이벤트 리스너 정의나 파일 업로드 응답을 다룰 때.

## 프로토콜 인코딩/디코딩 (SdServiceProtocol)

상태(분할 패킷 누적 버퍼)를 갖는 클래스. 인스턴스를 채널당 하나 유지하고, 종료 시 `dispose()` 호출.

- `encode(uuid: string, message: TSdServiceMessage): { chunks: Buffer[]; totalSize: number }` — 메시지를 JSON(`[name, body]` 배열) 직렬화 후 28바이트 헤더(UUID 16B + totalSize BigUint64 + index Uint32, big-endian)를 붙여 Buffer로 인코딩. `totalSize`가 100MB(`_MAX_TOTAL_SIZE`) 초과면 throw. 3MB(`_SPLIT_MESSAGE_SIZE`) 이하면 단일 청크, 초과면 300KB(`_CHUNK_SIZE`) 단위로 분할해 각 청크에 동일 uuid·totalSize와 증가하는 index를 부여.
- `decode<T extends TSdServiceMessage>(buffer: Buffer): ISdServiceMessageDecodeResult<T>` — 헤더를 읽어 uuid별로 청크를 누적. buffer가 28바이트 미만이면 throw, totalSize 100MB 초과면 throw. 같은 index 중복 패킷은 무시(중복 방어). 누적 크기 < totalSize면 `{ type: "progress" }` 반환, 모두 모이면 누적 버퍼를 합쳐 JSON 파싱 후 `{ type: "complete", message }` 반환하고 해당 uuid 누적분 삭제.
- `dispose(): void` — 내부 누적 맵(`LazyGcMap`, 10초 주기 GC·60초 만료)을 비움.

`SD_SERVICE_MESSAGE_MAX_TOTAL_SIZE = 100 * 1024 * 1024` — 메시지 최대 총 크기 상수(100MB). 클래스 내부 `_MAX_TOTAL_SIZE`와 동일 값.

### ISdServiceMessageDecodeResult<T>

`decode()` 반환 유니온. `type` 으로 분기:
- `{ type: "complete"; uuid: string; message: T }` — 분할 조립 완료. 파싱된 메시지 사용 가능.
- `{ type: "progress"; uuid: string; totalSize: number; completedSize: number }` — 아직 수신 중. 진행률(completedSize/totalSize) 표시 등에 사용.

## 메시지 프로토콜 타입 (protocol.types)

방향별 유니온 (`name` 리터럴로 판별):
- `TSdServiceMessage` — 모든 메시지의 합집합.
- `TSdServiceClientMessage` — 클라→서버: request, auth, evt:add, evt:remove, evt:gets, evt:emit.
- `TSdServiceServerMessage` — 서버→클라 비-raw: reload, response, error, evt:on.
- `TSdServiceServerRawMessage` — `ISdServiceProgressMessage | TSdServiceServerMessage`. 분할 진행 알림을 포함한 서버 송신 전체.

개별 메시지 인터페이스 (`name` = 판별 리터럴):
- `ISdServiceReloadMessage` (`"reload"`, 서버→클라 알림) — body: `clientName: string | undefined`(대상 클라이언트명), `changedFileSet: Set<string>`(변경 파일 목록). 핫리로드 트리거용.
- `ISdServiceProgressMessage` (`"progress"`, 서버) — body: `totalSize: number`(총 바이트), `completedSize: number`(수신 완료 바이트). 분할 메시지 수신 진행 알림.
- `ISdServiceErrorMessage` (`"error"`, 서버) — body: `name`,`message`,`code`,`stack?`,`detail?`,`cause?`. 에러 발생 알림.
- `ISdServiceAuthMessage` (`"auth"`, 클라) — body: `string`(인증 토큰).
- `ISdServiceRequestMessage` (`` `${string}.${string}` `` = `${service}.${method}`, 클라) — body: `any[]`(메서드 파라미터 배열). 서비스 메서드 호출 요청.
- `ISdServiceResponseMessage` (`"response"`, 서버) — body?: `any`(메서드 반환값).
- `ISdServiceAddEventListenerMessage` (`"evt:add"`, 클라) — body: `key: string`(uuid 리스너키, 후속 제거용), `name: string`(이벤트명=Type.name), `info: any`(발생 시 리스너 필터링용 추가 정보).
- `ISdServiceRemoveEventListenerMessage` (`"evt:remove"`, 클라) — body: `key: string`(제거할 리스너키).
- `ISdServiceGetEventListenerInfosMessage` (`"evt:gets"`, 클라) — body: `name: string`(조회할 이벤트명). 등록된 리스너 info 목록 요청.
- `ISdServiceEmitEventMessage` (`"evt:emit"`, 클라) — body: `keys: string[]`(대상 리스너키 목록), `data: any`(발생 데이터). 클라가 이벤트 발생시킴.
- `ISdServiceEventMessage` (`"evt:on"`, 서버 알림) — body: `keys: string[]`, `data: any`. 서버가 리스너에게 이벤트 전달.

## 서비스 인터페이스 계약

서버 구현체와 클라 호출 프록시가 공유하는 메서드 시그니처. 구현 본문은 다른 패키지(server/client)에 있음.

### ISdOrmService — DB 연결/쿼리 실행 (sd-orm 기반)
- `getInfo(opt: TDbConnOptions & { configName: string }): Promise<{ dialect; database?; schema? }>` — 설정명 기준 DB 방언/대상 DB·스키마 조회.
- `connect(opt: Record<string, any>): Promise<number>` — 연결 생성, 연결 ID 반환.
- `close(connId: number): Promise<void>` — 연결 종료.
- `beginTransaction(connId, isolationLevel?: ISOLATION_LEVEL): Promise<void>` — 트랜잭션 시작(격리수준 선택).
- `commitTransaction(connId): Promise<void>` / `rollbackTransaction(connId): Promise<void>` — 커밋/롤백.
- `executeParametrized(connId, query: string, params?: any[]): Promise<any[][]>` — 파라미터 바인딩 쿼리 실행, 결과셋 배열들 반환.
- `executeDefs(connId, defs: TQueryDef[], options?: (IQueryResultParseOption | undefined)[]): Promise<any[][]>` — 쿼리 정의 객체 배열 실행, options로 결과셋별 파싱 옵션 지정.
- `bulkInsert(connId, tableName, columnDefs: IQueryColumnDef[], records): Promise<void>` — 대량 INSERT.
- `bulkUpsert(connId, tableName, columnDefs: IQueryColumnDef[], records): Promise<void>` — 대량 UPSERT.
- `TDbConnOptions = { configName?: string; config?: Record<string, any> } & Record<string, any>` — 연결 옵션. `configName`(서버 설정 키로 연결) 또는 `config`(인라인 접속 정보) 중 선택, 추가 임의 키 허용.

### ISdCryptoService — 암호화 (sd-crypto 설정 기반)
- `encrypt(data: string | Buffer): Promise<string>` — 해시/단방향 암호화 문자열 반환.
- `encryptAes(data: Buffer): Promise<string>` — AES 양방향 암호화, 암호문 문자열 반환.
- `decryptAes(encText: string): Promise<Buffer>` — AES 복호화, 원문 Buffer 반환.
- `ICryptoConfig { key: string }` — 암호화에 사용할 키 설정.

### ISdSmtpClientService — 이메일 발송
- `send(options: ISmtpClientSendOption): Promise<string>` — SMTP 접속정보를 옵션에 직접 담아 발송, 메시지 ID 반환.
- `sendByConfig(configName: string, options: ISmtpClientSendByDefaultOption): Promise<string>` — 서버 설정명으로 접속정보를 가져와 발송.
- `ISmtpClientSendOption` — `host`(필수 SMTP 호스트), `port?`(포트), `secure?: boolean`(TLS 사용 여부), `user?`/`pass?`(인증), `from`(보내는이), `to`/`cc?`/`bcc?`(수신), `subject`, `html`(본문), `attachments?: ISmtpClientSendAttachment[]`.
- `ISmtpClientSendByDefaultOption` — 위에서 접속정보(host~pass·from) 제외: `to`,`cc?`,`bcc?`,`subject`,`html`,`attachments?`. 접속정보는 configName으로 보강.
- `ISmtpClientSendAttachment` — `filename`(필수), `content?: Buffer`(인라인 데이터), `path?: any`(파일 경로), `contentType?: string`(MIME).
- `ISmtpClientDefaultConfig` — sendByConfig용 서버 기본 설정: `senderName`(필수 발신자 이름), `senderEmail?`, `user?`/`pass?`, `host`(필수), `port?`, `secure?: boolean`.

### ISdAutoUpdateService — 앱 자동 업데이트
- `getLastVersion(platform: string): { version: string; downloadPath: string } | undefined` — 플랫폼별 최신 버전·다운로드 경로 조회, 없으면 undefined.

## 이벤트/업로드 보조 타입 (types)

- `SdServiceEventListenerBase<I, O>` — 서비스 이벤트 리스너 정의용 베이스 클래스. `info: I`(addEventListener 시 넘기는 필터링 정보 타입), `data: O`(이벤트 발생 시 전달 데이터 타입). 상속해 이벤트 종류를 타입으로 선언하는 용도(런타임 값 없음, `!` 단언 필드).
- `ISdServiceUploadResult` — 파일 업로드 응답: `path: string`(저장 경로), `filename: string`(파일명), `size: number`(바이트 크기).
