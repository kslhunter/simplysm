# Simplysm

pnpm 기반 TypeScript ESM 모노레포. 루트 패키지는 `private: true`이며 공개 패키지는
`packages/*` 아래에 둔다.

## 작업 언어

- 사용자 안내, 작업 요약, 저장소 문서는 별도 요청이 없으면 한국어로 작성한다.
- 공개 소비자 문서는 패키지를 사용하는 LLM이 바로 코드를 작성할 수 있는 작업 라우터 형태로 작성한다.

## 프로젝트 정보

- 이름: `simplysm`
- 설명: 심플리즘 패키지
- 패키지 매니저: pnpm (`pnpm-lock.yaml`)
- 문서 루트: `.codex/references/sd-simplysm-v14`

## 모노레포 구조

워크스페이스 경로는 `packages/*`, `tests/*`이다.

| 패키지 | 역할 |
|--------|------|
| `angular` | Angular UI 컴포넌트와 프로바이더 |
| `capacitor-plugin-auto-update` | Capacitor 앱 자동 업데이트 |
| `capacitor-plugin-file-system` | Capacitor 파일 시스템 브리지 |
| `capacitor-plugin-intent` | Android Intent 브리지 |
| `capacitor-plugin-usb-storage` | USB 저장소 브리지 |
| `core-browser` | 브라우저 전용 코어 유틸리티 |
| `core-common` | 플랫폼 중립 코어 유틸리티 |
| `core-node` | Node.js 코어 유틸리티 |
| `excel` | Excel 파일 읽기와 쓰기 |
| `lint` | Simplysm ESLint 플러그인과 설정 |
| `orm-common` | ORM 공통 쿼리와 스키마 |
| `orm-node` | Node.js ORM 드라이버 |
| `sd-claude` | Claude Code 설정 동기화 스크립트 |
| `sd-cli` | 빌드, 검사, 배포 CLI |
| `service-client` | 서비스 클라이언트 런타임 |
| `service-common` | 서비스 공통 프로토콜과 타입 |
| `service-server` | Fastify 기반 서비스 서버 |
| `storage` | FTP/SFTP 스토리지 클라이언트 |

## 기술 스택

- TypeScript 5.9, ESM, `moduleResolution: bundler`
- Angular 21 계열, Vite 7, Vitest 4
- Playwright browser provider, Chromium
- ESLint 9 flat config, `typescript-eslint`, `angular-eslint`
- Fastify, WebSocket, ORM 드라이버(`mysql2`, `pg`, `tedious`)
- Capacitor plugin 패키지, esbuild, Sass

## 명령어

### 개발

```bash
pnpm dev [-- --target <pkg>]             # 서버 패키지를 개발 모드로 실행
pnpm watch [-- --target <pkg>]           # 라이브러리 패키지를 watch 빌드
pnpm sd-cli device --target <pkg>        # 네이티브 앱을 디바이스/데스크톱에서 실행
```

### 빌드와 배포

```bash
pnpm build [-- --target <pkg>]           # 프로덕션 빌드
pnpm pub [-- --target <pkg>]             # 빌드 후 패키지 배포
pnpm pub:no-build [-- --target <pkg>]    # 빌드 없이 배포 경로 실행
```

### 코드 품질

```bash
pnpm check [-- --target <pkg>]           # 타입체크와 lint 병렬 실행
pnpm typecheck [-- --target <pkg>]       # TypeScript 타입 검사
pnpm lint [-- --target <pkg>]            # lint 검사
pnpm test                                # 전체 Vitest 테스트
pnpm test -- <path>                      # 특정 테스트 파일 실행
```

### 도구

```bash
pnpm sd-cli --help                       # sd-cli 명령과 옵션 확인
pnpm sd-cli replace-deps                 # sd.config.ts replaceDeps 기준 로컬 소스 연결
pnpm cc-auth                             # Claude Code 인증 스크립트 실행
```

## 아키텍처

의존 방향은 기능 패키지에서 코어 패키지로 흐른다. `core-common`은 플랫폼 중립 기반
패키지이고, 브라우저/Node 전용 패키지는 이를 확장한다.

```text
UI:        angular -> core-browser/core-common/service-client/service-common
Capacitor: auto-update -> file-system/core-browser/core-common/service-*
Service:   service-server -> service-common/orm-node/core-node
           service-client -> service-common/orm-common/core-common
ORM:       orm-node -> orm-common/core-common
Core:      core-node/core-browser -> core-common
Tools:     sd-cli -> core-node/core-common/storage
Storage:   storage -> core-common
Lint:      lint -> ESLint/Angular ESLint 플러그인
Scripts:   sd-claude -> scripts/claude 자산
```

루트 통합 테스트는 `tests/orm`, `tests/service`, `tests/sd-cli-client`,
`tests/sd-cli-server`에 둔다. 패키지 단위 테스트는 `packages/<package>/tests`에 둔다.

## 코딩 규칙

- TypeScript는 `strict`, `noImplicitOverride`, `noImplicitReturns`,
  `noPropertyAccessFromIndexSignature`, `verbatimModuleSyntax`를 켠다.
- `@simplysm/*` import는 `packages/*/src/index.ts` 공개 진입점으로 해석한다.
- Prettier는 2칸 들여쓰기, 줄 너비 100, 세미콜론, trailing comma, LF를 사용한다.
- ESLint는 미사용 import, `console.*`, hard private, Simplysm 하위 경로 import를 오류로 처리한다.
- Node `Buffer`/`buffer`, `events`/`eventemitter3`, 직접 `process.env`/`import.meta.env`
  접근을 금지한다.
- 일반 동등 비교는 `===`/`!==`를 사용하고, nullish 검사는 `== null`/`!= null`을 사용한다.

## 테스트

Vitest 프로젝트는 Node, browser Playwright, Angular, `sd-cli-*`, ORM, service 통합 테스트로
분리된다. ORM 통합 테스트는 `tests/orm/docker-compose.test.yml`의 DB 서비스가 필요하다.

## 무조건 먼저 읽어야 할 자료

- [sd-codex-rules.md](.codex/rules/sd-codex-rules.md)
- [sd-options.md](.codex/rules/sd-options.md)
- [sd-simplysm-v14.md](.codex/rules/sd-simplysm-v14.md)
