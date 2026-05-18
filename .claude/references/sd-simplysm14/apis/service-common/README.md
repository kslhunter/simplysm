# @simplysm/service-common

서버/클라이언트가 공유하는 서비스 프로토콜·메시지 타입·서비스 인터페이스·앱 구조 정의·이벤트 정의 유틸.

## 사용 트리거 인덱스

- **`createServiceProtocol` / `ServiceProtocol` / `ServiceMessageDecodeResult` / `PROTOCOL_CONFIG`** — 서버/클라이언트 transport 의 바이너리 V2 프로토콜(헤더 28B + JSON, 3MB↑ 자동 청킹, 100MB 한계) 인/디코더 생성. 자세히: [protocol.md](./protocol.md)
- **메시지 타입 (`ServiceMessage` / `ServiceClientMessage` / `ServiceServerMessage` / `ServiceServerRawMessage` 및 9 종의 개별 메시지)** — 프로토콜 위에 실리는 메시지 식별·타입 가드·핸들러 분기. 자세히: [messages.md](./messages.md)
- **서비스 인터페이스 (`OrmService` / `AutoUpdateService` / `AppStructureService` / `DbConnOptions`)** — 서버 구현·클라이언트 호출 양쪽이 공유하는 빌트인 서비스의 시그니처. 자세히: [service-types.md](./service-types.md)
- **앱 구조 (`AppStructureItem` / `AppStructureGroupItem` / `AppStructureLeafItem` / `AppStructureSubPermission` / `FlatPermission` + `isUsableModules` / `isUsableModulesChain` / `getFlatPermissions`)** — 메뉴/권한 트리 정의와 모듈 기반 가용성 평가·평탄화. 자세히: [app-structure.md](./app-structure.md)
- **`defineEvent` / `ServiceEventDef`** — 서버 발신·클라이언트 구독에서 `info`/`data` 타입을 공유하기 위한 이벤트 정의.
- **`ServiceUploadResult`** — 파일 업로드 결과(저장 경로·원본명·바이트 크기).

## defineEvent / ServiceEventDef

```ts
function defineEvent<TInfo, TData>(eventName: string): ServiceEventDef<TInfo, TData>
interface ServiceEventDef<TInfo, TData> { eventName: string; readonly $info: TInfo; readonly $data: TData; }
```

`$info`/`$data` 는 런타임 미사용, 타입 추출 전용 마커. 서버는 `defineEvent` 로 정의·export 하고, 클라이언트는 `import type` 으로 가져와 `addListener<typeof Evt>(...)` / `emitEvent<typeof Evt>(...)` 에 전달해 `info` 필터·`data` 페이로드를 정적으로 검증한다.

## ServiceUploadResult

```ts
interface ServiceUploadResult { path: string; filename: string; size: number; }
```

서버 업로드 핸들러가 클라이언트로 반환하는 결과. `path` 는 서버 내부 저장 경로다.
