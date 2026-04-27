# `ServiceServerOptions`

> **읽어야 하는 상황**: 서버 생성 옵션(rootPath, port, ssl, auth, services, legacyV1Handlers)을 구성할 때. 특히 `auth` 필드의 세 가지 상태(`{ jwtSecret }`, `false`, `undefined`) 또는 V1 레거시 요청 핸들러 등록을 이해해야 할 때.

서버 생성 시 전달하는 옵션 인터페이스.

```typescript
interface ServiceServerOptions {
  rootPath: string;
  port: number;
  ssl?: {
    pfxBytes: Uint8Array;
    passphrase: string;
  };
  auth?: {
    jwtSecret: string;
  } | false;
  services: ServiceDefinition[];
  legacyV1Handlers?: V1RequestHandler[];
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `rootPath` | `string` | 서버 루트 경로. 정적 파일은 `{rootPath}/www/`에서 서빙되고, 설정 파일은 `{rootPath}/.config.json`에서 읽는다 |
| `port` | `number` | 리스닝 포트 번호 |
| `ssl` | `{ pfxBytes: Uint8Array; passphrase: string }` (optional) | HTTPS 설정. PFX 인증서 바이트와 비밀번호. 설정하지 않으면 HTTP로 동작한다 |
| `auth` | `{ jwtSecret: string } \| false` (optional) | JWT 인증 설정. 세 가지 상태가 있다 |
| `services` | `ServiceDefinition[]` | 등록할 서비스 정의 배열 |
| `legacyV1Handlers` | `V1RequestHandler[]` (optional) | V1 WebSocket 레거시 요청을 자동 업데이트 fallback 전에 처리할 사용자 핸들러 체인 |

`auth` 필드의 세 가지 상태:

| 값 | 의미 |
|----|------|
| `{ jwtSecret: "..." }` | 인증 활성화. `auth()`로 래핑된 서비스/메서드는 토큰 검증을 수행한다 |
| `false` | 인증 의도적 비활성화. `auth()`로 래핑된 서비스/메서드도 인증 검사를 스킵한다 |
| `undefined` (미설정) | 인증 미사용. `auth()`로 래핑된 서비스가 있으면 `listen()` 시 에러를 던진다 |

## V1 레거시 요청 핸들러

`legacyV1Handlers`는 구형 클라이언트가 자동 업데이트 전에 호출하는 V1 명령을 처리할 때 사용한다. 서버는 등록 순서대로 핸들러를 실행하고, 어떤 핸들러도 처리하지 않으면 기존 `SdAutoUpdateService.getLastVersion` fallback을 시도한다. 그래도 처리되지 않으면 `UPGRADE_REQUIRED` 오류를 반환한다.

각 V1 메시지는 요청별 `ServiceContext`로 처리된다. 따라서 같은 WebSocket에서 여러 요청이 동시에 처리되어도 `serviceContext.clientName`, `serviceContext.clientPath`, `serviceContext.getConfig()`는 해당 요청의 `clientName`을 기준으로 동작한다.

```typescript
const server = createServiceServer({
  rootPath,
  port: 3000,
  services: [AutoUpdateService],
  legacyV1Handlers: [
    async ({ request, serviceContext }) => {
      if (request.command !== "LegacyBootstrap.getConfig") return { handled: false };

      const config = await serviceContext.getConfig("legacy-bootstrap");
      return { handled: true, body: config };
    },
  ],
});
```
