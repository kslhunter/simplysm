# Simplysm

pnpm 모노레포. 패키지 경로: `packages/*`, 테스트: `tests/*`

## 기술 스택

TypeScript 5.9, SolidJS 1.9, Vite 7, Vitest 4, ESLint 9, Prettier 3, Tailwind CSS 3, Playwright, Fastify, esbuild

## 모노레포 구조

`sd.config.ts`에서 각 패키지의 빌드 타겟과 배포 방식을 정의한다.

| 패키지 | 타겟 | 설명 |
|--------|------|------|
| `core-common` | neutral | 플랫폼 중립 코어 유틸리티 |
| `core-browser` | browser | 브라우저 전용 유틸리티 |
| `core-node` | node | Node.js 전용 유틸리티 |
| `orm-common` | neutral | ORM 공통 정의 |
| `orm-node` | node | ORM 구현체 (MySQL/PostgreSQL/MSSQL) |
| `service-common` | neutral | 서비스 공통 정의 |
| `service-client` | neutral | 서비스 클라이언트 |
| `service-server` | node | 서비스 서버 (Fastify) |
| `solid` | browser | SolidJS + Tailwind UI 컴포넌트 |
| `solid-demo` | client | 데모 클라이언트 앱 |
| `solid-demo-server` | server | 데모 서버 앱 (PM2) |
| `excel` | neutral | 엑셀 파일 처리 |
| `storage` | node | 스토리지 유틸리티 |
| `sd-cli` | node | 모노레포 빌드/개발 CLI |
| `lint` | node | ESLint 플러그인/설정 |
| `sd-claude` | scripts | Claude Code 스킬/에셋 |
| `capacitor-plugin-*` | browser | Capacitor 네이티브 플러그인 (4개) |

## 명령어

모든 명령어는 내부적으로 `pnpm sd-cli <command>`를 실행한다. `--debug` 플래그는 모든 명령어에서 사용 가능하다.
`[targets..]`를 생략하면 `sd.config.ts`에 정의된 모든 패키지를 대상으로 한다.
대상은 패키지 경로로 지정한다 (예: `packages/core-common`, `tests/orm`).

### 개발

```bash
pnpm dev [targets..]                     # 클라이언트+서버 패키지를 개발 모드로 실행
pnpm dev packages/solid-demo             # 특정 패키지를 개발 모드로 실행
pnpm dev -o key=value                    # sd.config.ts에 옵션 전달

pnpm watch [targets..]                   # 라이브러리 패키지를 watch 빌드
pnpm watch packages/core-common          # 특정 패키지를 watch
```

### 빌드 & 배포

```bash
pnpm build [targets..]                   # 프로덕션 빌드
pnpm pub [targets..]                     # 빌드 후 배포 (npm/sftp)
pnpm pub:no-build                        # 빌드 없이 배포만
pnpm pub --dry-run                       # 실제 배포 없이 시뮬레이션
```

### 코드 품질

```bash
pnpm typecheck [targets..]               # TypeScript 타입 체크
pnpm lint [targets..]                    # ESLint + Stylelint
pnpm lint:fix [targets..]               # 린트 자동 수정 (--fix)
pnpm check [targets..]                   # 전체 검사 (typecheck + lint + test 병렬)
pnpm check --type typecheck,lint         # 특정 검사만 실행
pnpm vitest [targets..]                  # vitest watch 모드
```

### 기타

```bash
pnpm sd-cli device -p <package>          # Android 디바이스에서 앱 실행
pnpm sd-cli replace-deps                 # sd.config.ts의 replaceDeps 설정에 따라 로컬 심링크 교체
pnpm sd-cli init                         # 새 프로젝트 초기화
```

## 아키텍처

의존 방향: 위 → 아래. `core-common`은 내부 의존성 없는 리프 패키지이다.

```
앱:       solid-demo (클라이언트) / solid-demo-server (서버)
UI:       solid (SolidJS + Tailwind)
서비스:   service-server (Fastify) / service-client / service-common
ORM:      orm-node (MySQL/PostgreSQL/MSSQL) / orm-common
코어:     core-common (중립) / core-browser / core-node
도구:     sd-cli, lint, excel, storage, sd-claude
모바일:   capacitor-plugin-auto-update / broadcast / file-system / usb-storage
```

## 통합 테스트

`tests/`에 위치. `pnpm vitest run tests/orm` 등으로 실행한다.

- `tests/orm` — DB 연결, DbContext, escape 테스트 (MySQL, PostgreSQL, MSSQL). Docker 필요.
- `tests/service` — 서비스 클라이언트-서버 통신 테스트.

## 코딩 규칙

- `import type` 필수 (`verbatimModuleSyntax`), `#private` 금지 → `private` 키워드 사용
- `console.*` 금지, `if (str)` 금지 → 명시적 비교 `str !== ""` 사용 (nullable boolean/object는 허용)
- `Buffer` 금지 → `Uint8Array`, `events` 금지 → `@simplysm/core-common`의 `EventEmitter`
- SolidJS: props 구조분해 금지, `.map()` 대신 `<For>`, `className` 대신 `class`
- Prettier: `printWidth: 100`, `quoteProps: consistent`, `htmlWhitespaceSensitivity: ignore`
