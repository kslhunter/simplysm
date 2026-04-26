# Simplysm 작업 지침

이 파일은 Codex가 `simplysm` 저장소에서 작업할 때 따르는 루트 지침이다. 프로젝트 소개나
기술 스택 설명이 아니라, 작업을 시작하고 수정 범위를 결정하고 검증하는 기준만 둔다.

## 먼저 읽기

작업을 시작하기 전에 아래 문서를 읽는다. 상세 규칙은 이 파일에 복사하지 않고 원문을 기준으로
판단한다.

- [sd-codex-rules.md](.codex/rules/sd-codex-rules.md)
- [sd-options.md](.codex/rules/sd-options.md)
- [sd-simplysm-v14.md](.codex/rules/sd-simplysm-v14.md)

## 세션 시작 체크

1. 사용자 요청이 코드 수정, 문서 수정, 분석, 검증 중 무엇인지 먼저 구분한다.
2. 관련 패키지를 찾고 `packages/<pkg>/AGENTS.md`가 있으면 읽는다.
3. `@simplysm/*`를 import하는 파일을 만들거나 고치면, 작업 전에 해당 문서를 읽는다.
   문서 위치는 `.codex/references/sd-simplysm-v14/<pkg>/README.md`이다.
4. 기존 변경사항은 사용자 작업으로 간주한다. 되돌리거나 덮어쓰기 전에 반드시 현재 diff를 확인한다.
5. 모호한 요구사항은 추측으로 진행하지 않는다. 필요한 경우 사용자에게 확인하고 응답을 기다린다.

## 작업 언어

- 사용자 안내, 작업 요약, 저장소 문서는 별도 요청이 없으면 한국어로 작성한다.
- 공개 소비자 문서는 패키지를 사용하는 LLM이 바로 코드를 작성할 수 있는 작업 라우터 형태로 작성한다.

## 어디를 볼지

요청을 받으면 아래 기준으로 첫 조사 위치를 정한다.

- Angular UI, 컴포넌트, 프로바이더: `packages/angular`
- 브라우저 유틸리티: `packages/core-browser`
- 플랫폼 중립 유틸리티: `packages/core-common`
- Node.js 유틸리티: `packages/core-node`
- Excel 처리: `packages/excel`
- FTP/SFTP 스토리지: `packages/storage`
- ORM 쿼리·스키마: `packages/orm-common`
- ORM Node 드라이버: `packages/orm-node`, `tests/orm`
- 서비스 공통 프로토콜: `packages/service-common`
- 서비스 클라이언트: `packages/service-client`, `tests/service`
- 서비스 서버: `packages/service-server`, `tests/service`
- Capacitor 플러그인: `packages/capacitor-plugin-*`
- 빌드, 검사, 배포 CLI: `packages/sd-cli`, `tests/sd-cli-client`, `tests/sd-cli-server`
- Codex 설정 동기화와 스킬: `packages/sd-codex`, `.codex/skills`, `.codex/rules`
- Claude 설정 동기화: `packages/sd-claude`
- ESLint 규칙과 공유 설정: `packages/lint`, `eslint.config.ts`

## 수정 경계

- 워크스페이스는 `packages/*`, `tests/*`이다.
- 루트 설정 파일은 전체 워크스페이스 동작이 바뀔 때만 수정한다.
  대상은 `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `eslint.config.ts`, `sd.config.ts`이다.
- `pnpm-lock.yaml`은 의존성 추가, 제거, 버전 변경이 있을 때만 갱신한다.
- 공개 API를 바꾸면 같은 작업에서 소비자 문서와 `_api-index.md` 갱신 여부를 확인한다.
- 패키지 내부 규칙은 해당 패키지의 `AGENTS.md`에 둔다. 루트 문서에 패키지 내부 구조를 길게 반복하지 않는다.
- 생성물은 생성 명령을 실행한 경우에만 갱신한다.

## 명령 실행

```bash
pnpm check [--target <pkg>]           # 타입체크와 lint를 함께 확인
pnpm typecheck [--target <pkg>]       # 타입 오류만 확인
pnpm lint [--target <pkg>]            # lint 오류만 확인
pnpm test                             # 전체 Vitest 테스트
vitest run <path>                     # 변경 범위에 맞는 테스트 파일 실행
```

```bash
pnpm dev [--target <pkg>]             # 서버 패키지 개발 모드
pnpm watch [--target <pkg>]           # 라이브러리 watch 빌드
pnpm build [--target <pkg>]           # 프로덕션 빌드
pnpm sd-cli --help                    # sd-cli 옵션 확인
```

금지 명령과 우회 금지는 `.codex/rules/sd-codex-rules.md`를 따른다. 특히 `git reset`,
`git checkout`, `git restore`, `git clean`, `git stash`, `sed`, `npx tsc`, `npx eslint`를
사용하지 않는다.

## 코드 작성 기준

- TypeScript ESM 기준으로 작성하고, `verbatimModuleSyntax`에 맞춰 type-only import를 분리한다.
- `@simplysm/*`는 공개 진입점 기준으로 import한다. `@simplysm/<pkg>/src/...` 하위 경로 import는 금지한다.
- 내부 모듈 import에는 `.js` 확장자를 붙이지 않는다.
- 정적 import를 우선한다. 정적 import가 불가능한 경우에만 동적 `import()`를 사용한다.
- 하위 폴더에 re-export 전용 `index.ts`를 만들지 않는다. 공개 export는 `src/index.ts`에서 관리한다.
- `Buffer`/`buffer`, `events`/`eventemitter3`, 직접 `process.env`/`import.meta.env` 접근을 사용하지 않는다.
- hard private(`#field`) 대신 TypeScript `private` 멤버를 사용한다.
- 일반 값 비교는 `===`/`!==`, nullish 검사는 `== null`/`!= null`을 사용한다.
- 타입 추론을 약화하는 수정이나 불필요한 `as` 캐스팅을 추가하지 않는다.

## 검증 기준

- 타입 또는 lint에 영향을 주는 변경은 `pnpm check [--target <pkg>]`를 우선 실행한다.
- 런타임 로직을 바꾸면 관련 `vitest run <path>`를 실행한다.
- ORM 통합 테스트는 `tests/orm/docker-compose.test.yml`의 DB 서비스가 필요하다.
- 서비스 통합 테스트는 `tests/service`를 우선 확인한다.
- `sd-cli` 번들·실행 동작은 `tests/sd-cli-client`, `tests/sd-cli-server`를 확인한다.
- 검증을 실행하지 못하면 최종 응답에 실행하지 못한 이유와 남은 위험을 적는다.

## 구조 판단 기준

- 의존 방향은 기능 패키지에서 코어 패키지로 흐르게 유지한다.
- `core-common`에는 플랫폼 중립 코드만 둔다.
- 브라우저 전용 코드는 `core-browser`, Node.js 전용 코드는 `core-node`에 둔다.
- 서비스 서버 변경은 `service-common`, `service-client`, `orm-node`와의 계약 영향을 확인한다.
- ORM Node 변경은 `orm-common`의 쿼리·스키마 계약과 `tests/orm` 영향을 확인한다.
