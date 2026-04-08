# Types

## `ServiceServerOptions`

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
}
```

| Field | Type | Description |
|-------|------|-------------|
| `rootPath` | `string` | 서버 루트 경로. 정적 파일은 `{rootPath}/www/`에서 서빙되고, 설정 파일은 `{rootPath}/.config.json`에서 읽는다 |
| `port` | `number` | 리스닝 포트 번호 |
| `ssl` | `{ pfxBytes: Uint8Array; passphrase: string }` (optional) | HTTPS 설정. PFX 인증서 바이트와 비밀번호. 설정하지 않으면 HTTP로 동작한다 |
| `auth` | `{ jwtSecret: string } \| false` (optional) | JWT 인증 설정. `{ jwtSecret }`이면 인증 활성화, `false`이면 인증 의도적 비활성화, `undefined`이면 인증 미사용 |
| `services` | `ServiceDefinition[]` | 등록할 서비스 정의 배열 |

`auth` 필드의 세 가지 상태:

| 값 | 의미 |
|----|------|
| `{ jwtSecret: "..." }` | 인증 활성화. `auth()`로 래핑된 서비스/메서드는 토큰 검증을 수행한다 |
| `false` | 인증 의도적 비활성화. `auth()`로 래핑된 서비스/메서드도 인증 검사를 스킵한다 |
| `undefined` (미설정) | 인증 미사용. `auth()`로 래핑된 서비스가 있으면 `listen()` 시 에러를 던진다 |
