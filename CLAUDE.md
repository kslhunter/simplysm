# Simplysm

pnpm 모노레포. TypeScript ESM 프로젝트 (`"type": "module"`). 패키지 경로: `packages/*`, 통합 테스트: `tests/*`

**CRITICAL**: 이 프로젝트의 개발자는 **엄격한 완벽주의자**라는것을 항상 고려하라.

## 기술 스택

Node.js 20, Angular 21, TypeScript 5.9, Fastify 5.8, Vite 7, Vitest, esbuild, ESLint, Prettier

## 명령어

모든 명령어는 내부적으로 `pnpm sd-cli <command>`를 실행한다. `--debug` 플래그는 모든 명령어에서 사용 가능하다.
`--target`을 생략하면 `sd.config.ts`에 정의된 모든 패키지를 대상으로 한다.
대상은 패키지명으로 지정한다 (예: `--target core-common` 또는 `-t core-common`).

### 개발

```bash
pnpm dev                                 # 모든 서버 패키지를 개발 모드로 실행
pnpm dev -t my-server                    # 특정 패키지만 실행
pnpm dev -o optA -o optB                 # sd.config.ts에 옵션 전달
pnpm watch                               # 모든 라이브러리 패키지를 watch 빌드
pnpm watch -t core-common storage        # 특정 패키지만 watch 빌드
```

### 빌드 & 배포

```bash
pnpm build                               # 전체 프로덕션 빌드
pnpm build -t core-common storage        # 특정 패키지만 빌드
pnpm pub                                 # 빌드 후 배포 (npm/sftp)
pnpm pub:no-build                        # 빌드 없이 배포만
pnpm pub --dry-run                       # 실제 배포 없이 시뮬레이션
pnpm device -t my-client-app             # 네이티브 앱 디바이스/데스크톱 실행
```

### 코드 품질

작업 직후 자동 점검은 `sd-check` 스킬을 사용한다 (필요한 단계를 알아서 묶어 실행).
단발 검증은 `pnpm check --fix`가 기본. `pnpm typecheck` / `pnpm lint` 단독은 `check` 실패 후 단계 격리 분석용에 한정한다.

```bash
pnpm check --fix                         # 기본 검증 (typecheck + lint 일괄, lint 자동 수정 포함)
pnpm check                               # 자동 수정 없이 검사만
pnpm check -t core-common                # 특정 패키지만 검사
pnpm check --type lint                   # 특정 타입만 검사
pnpm check -t angular --type typecheck   # 특정 패키지의 특정 타입만 검사
pnpm typecheck                           # check 실패 후 타입 단계만 격리 분석할 때
pnpm lint                                # check 실패 후 lint 단계만 격리 분석할 때
pnpm lint --fix                          # lint 자동 수정만 단독 실행
vitest run [files..]                     # Vitest 테스트 (파일 직접 지정 가능)
```

## 아키텍처

의존 방향: 위 → 아래. `core-common`은 내부 의존성 없는 리프 패키지이다.

```
UI:       angular (Angular 21)
서비스:   service-server (Fastify) / service-client / service-common
ORM:      orm-node / orm-common
코어:     core-common (중립) / core-browser / core-node
유틸:     excel, storage (FTP/SFTP)
모바일:   capacitor-plugin-* (4개: auto-update, intent, file-system, usb-storage)
도구:     sd-cli (빌드/체크 CLI), lint (ESLint 공유 설정), sd-claude (Claude Code 에셋 동기화)
```

## 통합 테스트

`tests/`에 위치. targets 없이 전체 패키지 수행하거나 `vitest`명령을 수동으로 구성하여 수행해야 한다.

- `tests/orm` — DB 연결, DbContext 테스트 (MySQL, PostgreSQL, MSSQL). Docker 필요.
- `tests/service` — 서비스 클라이언트-서버 통신 테스트.
- `tests/sd-cli-client` — sd-cli 클라이언트 빌드 통합 테스트.
- `tests/sd-cli-server` — sd-cli 서버 빌드 통합 테스트.

## 코딩 규칙

- `import type` 필수 (`verbatimModuleSyntax`), `#private` 금지 → `private` 키워드 사용
- `if (str)` 금지 → 명시적 비교 `str !== ""` 사용 (nullable boolean/object는 허용)
- `===` 필수 (`null` 비교만 `==` 허용), `require-await` 필수, 미사용 import 자동 제거
- Prettier: `printWidth: 100`, `quoteProps: consistent`, `htmlWhitespaceSensitivity: ignore`, `endOfLine: lf`
- `@simplysm/*` 표준 API 매핑은 `.claude/rules/sd-simplysm-v14.md`의 "표준 API → simplysm 매핑" 섹션 참조

### 브라우저 호환성 (Chrome 61+)

- sd-cli의 `browserSupport.browserslist` 설정은 esbuild target으로 변환되어 **문법(syntax)만 다운레벨 컴파일**한다.
  최신 문법(`?.`, `??`, `&&=` 등)은 esbuild가 변환하므로 자유롭게 사용 가능하다.

- **런타임 API는 esbuild가 폴리필하지 않는다.**
  - 프로토타입 메서드, 전역 함수, 내장 객체의 신규 메서드 등 런타임 API를 사용할 때는 반드시 **Chrome 61에 해당 API가 존재하는지 확인**하고, 존재하지 않으면 사용하지 않는다.
  - 단, 소비 프로젝트에서 `polyfills.ts`로 폴리필 가능한 API(예: `Array.prototype.flat`, `Object.fromEntries` 등 표준 프로토타입 메서드)는 예외로 사용 가능하다.
  - 폴리필로 해결 불가능한 API(예: `WeakRef`, `FinalizationRegistry`, `Proxy` 등 엔진 네이티브 구현 필수)는 절대 사용하지 않는다.

**판단 방법:** 연산자·키워드·선언 형태 → 문법(esbuild 변환 가능, 사용 OK). 프로토타입 메서드·전역 함수·내장 객체 신규 메서드 → 런타임 API(Chrome 61 지원 여부 확인 필수).

## 참조 문서 유지보수

- `@simplysm/*` 패키지의 public API 변경 시 `.claude/references/sd-simplysm-v14/{패키지명}/README.md` 및 하위 Entry 파일의 수정이 필요할 수 있다.

## Claude 에셋 동기화

- `.claude/`(스킬·룰·참조 문서)가 원본이다. `packages/sd-claude/claude/`는 배포 직전 자동 복제되는 산출물이다.
- Claude 에셋 수정은 `.claude/`만 수정한다. `packages/sd-claude/claude/`를 직접 수정하면 다음 동기화 시 덮어쓰여 사라진다.