# @simplysm/service-server

Fastify 기반 서비스 서버. HTTP/WebSocket 양 전송 위에서 "서비스(`이름`+`메서드 맵`)" 단위로 RPC, JWT 인증, 정적 파일, 업로드, 이벤트 브로드캐스트, V1 레거시 호환을 제공한다.

## 사용 트리거 인덱스

- **`ServiceServer` / `createServiceServer` / `ServiceServerOptions`** — 서버 인스턴스 생성·기동·종료·이벤트 브로드캐스트·JWT 발급. 자세히: [server.md](./server.md)
- **`defineService` / `auth` / `ServiceContext` / `ServiceMethods`** — 서비스 정의 및 메서드/팩토리 인증 래퍼, 컨텍스트 헬퍼. 자세히: [define-service.md](./define-service.md)
- **`AuthTokenPayload` / `signJwt` / `verifyJwt` / `decodeJwt`** — JWT 토큰 페이로드 타입 및 직접 서명/검증 유틸. 자세히: [auth.md](./auth.md)
- **빌트인 서비스 (`OrmService` / `AutoUpdateService` / `AppStructureService`)** — `services` 옵션에 그대로 등록해 ORM 프록시·자동 업데이트·앱 메뉴 트리 제공. 자세히: [builtin-services.md](./builtin-services.md)
- **전송/프로토콜/레거시 내부** (`handleHttpRequest`, `handleUpload`, `handleStaticFile`, `createWebSocketHandler`, `createServiceSocket`, `createServerProtocolWrapper`, `handleV1Connection` 등) — `ServiceServer.listen()` 이 자동 사용. 커스텀 Fastify 라우트 직조 시에만 직접 호출. 자세히: [internals.md](./internals.md)

## `getConfig`

```ts
import { getConfig } from "@simplysm/service-server";
const conf = await getConfig<{ orm: { default: DbConnConfig } }>(filePath);
```

`<rootPath>/.config.json` 같은 JSON 설정 파일을 읽고 LazyGcMap 캐시 + `FsWatcher` 로 핫리로드한다. 보통은 `ctx.getConfig(section)` 으로 충분하며, 이 함수를 직접 호출할 일은 root/client 경로 외 설정 파일을 읽을 때만 있다.
