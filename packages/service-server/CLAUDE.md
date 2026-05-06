# CLAUDE.md — `@simplysm/service-server`

루트 `CLAUDE.md` 의 모노레포 가이드를 먼저 따른다.

## 역할

Fastify 기반 서비스 서버. WebSocket(메시지) + HTTP(파일/정적) 트랜스포트, JWT 인증, 빌트인 서비스(앱 구조·자동 업데이트·ORM), 워커 풀로 무거운 처리 격리. 빌드 타겟 `node`.

`sd-cli` 의 `server` 빌드 타겟으로 배포되는 앱이 이 패키지를 진입점으로 쓴다.

## 구조

| 경로                              | 내용                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------- |
| `service-server.ts`               | `ServiceServer` 진입. 트랜스포트·서비스·워커 풀 조립.                          |
| `core/define-service.ts`          | 핸들러 정의 헬퍼(서비스 시그니처 ↔ 구현 매핑).                                  |
| `core/service-executor.ts`        | 메시지 1건의 라이프사이클(인증·라우팅·에러 변환·응답).                          |
| `services/app-structure-service.ts`| 권한·메뉴 등 앱 구조 응답.                                                     |
| `services/auto-update-service.ts` | zip diff 기반 자동 업데이트 패키지 제공.                                       |
| `services/orm-service.ts`         | 클라이언트 측 원격 ORM 의 서버 핸들러 — `orm-node` 어댑터로 위임.              |
| `auth/jwt-manager.ts` / `auth-token-payload.ts` | JWT 발급·검증(`jose` 사용).                                       |
| `transport/socket/` / `transport/http/` | Fastify 플러그인 등록(`@fastify/websocket`, `@fastify/static`, `@fastify/multipart`, `@fastify/cors`, `@fastify/helmet`). |
| `protocol/protocol-wrapper.ts`    | 클라이언트 wrapper 와 대칭되는 시리얼라이즈/프레이밍.                           |
| `workers/service-protocol.worker.ts` | 메시지 처리 워커(요청 파싱·디스패치 격리).                                  |
| `legacy/v1-auto-update-handler.ts`| 구버전 클라이언트 호환 엔드포인트.                                              |
| `utils/config-manager.ts`         | 런타임 config 로딩(서버 옵션·서비스 토글).                                      |

워크스페이스 의존: `@simplysm/core-common`, `@simplysm/core-node`, `@simplysm/orm-common`, `@simplysm/orm-node`, `@simplysm/service-common`.
외부: `fastify`, `@fastify/*`, `jose`, `ws`, `bufferutil`, `utf-8-validate`, `semver`, `consola`.

## 작업 시 주의

- 새 서비스 추가:
  1. `service-common/service-types/<name>.types.ts` 에 시그니처.
  2. `services/<name>-service.ts` 에 `defineService(...)`.
  3. `service-server.ts` 의 서비스 등록 목록에 포함.
  4. 클라이언트 측 헬퍼는 `service-client/features/` 에.
- 인증 미들웨어는 `service-executor` 에서 일괄 처리. 개별 서비스 핸들러에서 토큰을 직접 다루지 마라.
- env 주입은 sd-cli 가 esbuild **banner** 로 처리(번들 최상단에서 `process.env` 세팅). `tests/sd-cli-server` 가 이 동작을 검증한다.
- `legacy/` 는 의도적으로 유지되는 구버전 호환 코드. 동작 변경 시 클라이언트 v1 회귀를 확인하라.
