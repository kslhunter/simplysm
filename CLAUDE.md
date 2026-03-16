# Simplysm

pnpm 모노레포. 패키지 경로: `packages/*`, 테스트: `tests/*`

## 기술 스택

SolidJS, TypeScript, Vite, Vitest, ESLint, Prettier, Tailwind CSS v3, Playwright, esbuild, Fastify

## 명령어

모든 명령어는 내부적으로 `pnpm sd-cli <command>`를 실행한다. `--debug` 플래그를 모든 명령어에 사용할 수 있다.
`[targets..]`를 지정하지 않으면 `sd.config.ts`에 정의된 모든 패키지가 대상이 된다.
대상은 패키지 경로로 지정한다 (예: `packages/core-common`, `tests/orm`).

### 개발

```bash
pnpm dev [targets..]                     # 클라이언트+서버 패키지를 개발 모드로 실행
pnpm dev packages/solid-demo             # 특정 패키지만 개발 모드로 실행
pnpm dev -o key=value                    # sd.config.ts에 옵션 전달

pnpm watch [targets..]                   # 라이브러리 패키지 빌드 watch 모드
pnpm watch packages/core-common          # 특정 패키지만 watch
```

### 빌드 & 배포

```bash
pnpm build [targets..]                   # 프로덕션 빌드
pnpm build packages/solid                # 특정 패키지만 빌드

pnpm pub [targets..]                     # 빌드 후 배포 (npm/sftp)
pnpm pub --no-build                      # 빌드 없이 배포만
pnpm pub --dry-run                       # 실제 배포 없이 시뮬레이션
```

### 코드 품질 검사

```bash
pnpm typecheck [targets..]               # TypeScript 타입 검사
pnpm lint [targets..]                    # ESLint + Stylelint 실행
pnpm lint:fix [targets..]               # 린트 이슈 자동 수정 (--fix)
pnpm check [targets..]                   # 전체 검사 (타입 검사 + 린트 + 테스트 병렬 실행)
pnpm vitest [targets..]                  # vitest watch 모드
```

### 기타

```bash
pnpm sd-cli device -p <package>          # Android 기기에서 앱 실행
pnpm sd-cli init                         # 새 프로젝트 초기화
pnpm sd-cli replace-deps                 # sd.config.ts의 replaceDeps 설정에 따라 로컬 소스 심링크
```

## 아키텍처

의존 방향: 위 → 아래. `core-common`은 내부 의존성이 없는 리프 패키지이다.

```
앱:       solid-demo (클라이언트) / solid-demo-server (서버)
UI:       solid (SolidJS + Tailwind)
서비스:   service-server (Fastify) / service-client / service-common
ORM:      orm-node (MySQL/PostgreSQL/MSSQL) / orm-common
코어:     core-common (중립) / core-browser / core-node
도구:     sd-cli, lint, excel, storage, sd-claude, mcp-playwright
모바일:   capacitor-plugin-auto-update / capacitor-plugin-broadcast / capacitor-plugin-file-system / capacitor-plugin-usb-storage
```

## 통합 테스트

`tests/` 폴더에 위치한다. `pnpm vitest run tests/orm` 등으로 실행한다.

- `tests/orm` — DB 연결, DbContext, escape 테스트 (MySQL, PostgreSQL, MSSQL). Docker 필요.
- `tests/service` — 서비스 클라이언트-서버 통신 테스트.

## Claude Code 설정

`.claude/` 디렉토리(rules, skills, hooks)는 이 프로젝트에서 직접 작성·관리한다. 작성된 내용은 `@simplysm/sd-claude` 패키지를 통해 다른 프로젝트에 복사·배포된다.

## 코딩룰

- `import type` 필수 (`verbatimModuleSyntax`), `#private` 금지 → `private` 키워드 사용
- `console.*` 금지, `if (str)` 금지 → 명시적 비교 `str !== ""` 사용 (nullable boolean/object는 허용)
- `Buffer` 금지 → `Uint8Array`, `events` 금지 → `@simplysm/core-common`의 `EventEmitter` 사용
- `===` 강제 (`== null`만 허용), `throw`는 Error 객체만 허용
- 미사용 import 자동 제거, 미사용 변수는 `_` 접두사 허용
- `@typescript-eslint/no-floating-promises`: 반드시 await 또는 void 처리
- `@typescript-eslint/prefer-readonly`: 재할당하지 않는 속성은 readonly 사용
- SolidJS: props 구조분해 금지, `.map()` 대신 `<For>` 사용, `className` 대신 `class` 사용
- Tailwind CSS: 클래스 순서 자동 정렬, 커스텀 클래스 금지, 충돌 클래스 금지
- Prettier: 100자, 2칸 들여쓰기, 세미콜론, trailing comma, LF
- TypeScript: strict 모드, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `useUnknownInCatchVariables`
