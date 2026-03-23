# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Simplysm

Yarn 4 monorepo. 21개 패키지가 `packages/*`에 위치. npm에 `@simplysm/*` 스코프로 퍼블리시.
설정 파일: `simplysm.js` (패키지 타입 및 퍼블리시 대상 정의).

런타임: Volta 관리 — Node 20.20.0, Yarn 4.13.0.

## 명령어

모든 명령어는 내부적으로 `sd-cli`를 통해 실행 (`yarn run _sd-cli_ <command>`).
`--debug` 플래그로 상세 로깅 활성화 가능.

### 개발

```bash
yarn watch                                # 전체 패키지 watch 빌드 (개발 모드)
yarn watch --packages sd-angular          # 특정 패키지만 watch
yarn watch --emitOnly                     # emit만 (체크 생략)
yarn watch --noEmit                       # 체크만 (emit 생략)
```

### 빌드 & 퍼블리시

```bash
yarn build                                # 프로덕션 빌드 (전체)
yarn build --packages sd-core-common      # 특정 패키지 빌드
yarn publish                              # 빌드 + npm 퍼블리시
yarn publish --noBuild                    # 빌드 없이 퍼블리시
```

### 코드 품질

```bash
yarn check                                # 타입체크 + 린트 (전체)
yarn check packages/sd-core-common        # 특정 패키지 경로 체크
yarn check --type lint                    # 린트만
yarn check --type typecheck               # 타입체크만
yarn eslint:fix                           # ESLint 자동 수정
```

### 테스트

```bash
npx vitest                                # watch 모드
npx vitest run                            # 전체 테스트 1회 실행
npx vitest run packages/sd-core-common    # 특정 패키지 테스트
```

테스트 파일: `**/*.spec.ts`, 환경: Node, globals 활성화, `vite-tsconfig-paths`로 `@simplysm/*` 경로 해석.

## 아키텍처

의존성 방향: 위 → 아래. `sd-core-common`이 내부 의존성 없는 최하위 기반.

```
UI:       sd-angular (Angular 20)
Service:  sd-service-server (Fastify) / sd-service-client (WebSocket) / sd-service-common
ORM:      sd-orm-node (MySQL/SQLite/MSSQL) / sd-orm-common / sd-orm-common-ext
Core:     sd-core-common (neutral) / sd-core-browser / sd-core-node
Tools:    sd-cli (build/check/publish), eslint-plugin, sd-excel, sd-storage (FTP/SFTP)
Mobile:   capacitor-plugin-* (Capacitor 7) / cordova-plugin-* (legacy)
```

경로 별칭: `@simplysm/*` → `packages/*/src/index.ts` (`tsconfig.base.json`에 정의).

## TypeScript

- `strict: true`, `noImplicitAny: false`, `noImplicitReturns: true`, `noImplicitOverride: true`
- `experimentalDecorators: true`, `emitDecoratorMetadata: true`
- `useDefineForClassFields: false` (class field는 assignment semantics 사용)
- `verbatimModuleSyntax` 미활성화 — 단, 관례적으로 `import type` 선호
- Target: ES2022, Module: ESNext, 모든 패키지 ESM (`"type": "module"`)

## Angular 컴포넌트 규칙 (sd-angular)

- **signal 기반 input**: `input()` 함수 사용 (`@Input` 데코레이터 아님)
- `standalone: true`, `ChangeDetectionStrategy.OnPush`, `ViewEncapsulation.None`
- 호스트 바인딩은 `host` 메타데이터에 `data-*` 속성으로 표현 (`@HostBinding` 미사용)
- CSS 스타일링은 `&[data-sd-theme="primary"]` 같은 data 셀렉터 사용
- composable setup 함수 패턴: `inject()` 기반 DI (예: `setupInvalid()`)
- 커스텀 시그널 래퍼 `$signal`에 `$mark()` 메서드로 반응성 추적

## ORM 패턴 (sd-orm-common)

`reflect-metadata` 기반 데코레이터로 스키마 정의:

```typescript
@Table({ description: "..." })
class Entity {
  @Column({ description: "...", dataType?: ..., nullable?: ... })
  column!: string;

  @ForeignKey([columnNames], () => TargetType, "description")
  relation?: TargetType;
}
```

뷰, 프로시저, 관계 지원. `DbDefUtils.mergeTableDef()`로 메타데이터 집계.

## Service 패턴 (sd-service-server)

- `SdServiceBase<TAuthInfo>` 추상 클래스 상속으로 서비스 구현
- WebSocket(v1/v2) 및 HTTP 멀티 프로토콜 지원
- `@Authorize(permissions?)` 데코레이터로 인가 처리
- `getConfigAsync<T>(section)` 으로 클라이언트별 설정 관리

## 로깅

`console.*`은 lint 경고 — 대신 `SdLogger` 사용:

```typescript
const _logger = SdLogger.get(["simplysm", "sd-service-server", "ClassName"]);
_logger.log(...);  // debug, log, info, warn, error
```

계층적 그룹 기반 로깅. 콘솔 색상 및 파일 출력 설정 가능.

## 코딩 규칙

- `eqeqeq` 강제 (`===`/`!==`), null 체크만 예외 (`== null` / `!= null` 허용)
- `strict-boolean-expressions`: 문자열/숫자에 `if (str)` 금지 — `str !== ""` 등 명시적 비교 사용. nullable boolean/object는 허용
- `#private` 필드 금지 (`no-hard-private`) — TypeScript `private` 키워드 사용
- `@simplysm/no-subpath-imports-from-simplysm`: @simplysm 패키지의 deep subpath import 금지
- `unused-imports/no-unused-imports` 강제; 미사용 변수는 `_` 접두사
- 모든 promise 처리 필수 (`no-floating-promises`, `return-await` 항상 필요)
- `prefer-readonly`: 재할당 없는 클래스 멤버에 readonly 강제
- `@simplysm/ts-no-unused-injects`: 미사용 Angular injection 감지
- `@simplysm/ts-no-unused-protected-readonly`: 미사용 protected readonly 멤버 감지
- Prettier: 100자, 2칸 들여쓰기, 세미콜론, trailing comma, LF 줄바꿈
