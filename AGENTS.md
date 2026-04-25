# Repository Guidelines

## 언어

- 사용자 언어: 한국어
- 안내 문서와 작업 요약은 특별한 요청이 없으면 한국어로 작성합니다.

## 프로젝트 구조

- pnpm 기반 TypeScript 모노레포입니다.
- 패키지 위치: `packages/*`
- 패키지 공개 진입점: 보통 `packages/<package>/src/index.ts`
- 워크스페이스 import: `@simplysm/*`
- 패키지 테스트: `packages/<package>/tests`
- 루트 통합 테스트:
  - `tests/orm`
  - `tests/service`
  - `tests/sd-cli-client`
  - `tests/sd-cli-server`
- 공통 설정:
  - `tsconfig.json`
  - `vitest.config.ts`
  - `eslint.config.ts`
  - `sd.config.ts`
  - `pnpm-workspace.yaml`

## 주요 명령

- `pnpm install`: 워크스페이스 의존성 설치
- `pnpm build`: 전체 빌드 실행
- `pnpm check`: 전체 검사 파이프라인 실행
- `pnpm typecheck`: TypeScript 타입 검사
- `pnpm lint`: lint 검사
- `pnpm test`: 전체 Vitest 테스트 실행
- `pnpm dev`: 개발 모드 실행
- `pnpm watch`: watch 모드 실행
- `pnpm vitest run packages/excel/tests/excel-cell.spec.ts`: 특정 테스트 파일만 실행

## 금지 명령

- `git stash`, `git checkout`, `git restore`, `git reset`, `git clean` 사용 금지
- `cd`로 작업 디렉터리를 이동하지 말고, 명령 실행 위치를 명시
- `npx tsc` 사용 금지: `pnpm typecheck` 사용
- `npx eslint` 사용 금지: `pnpm lint` 사용
- `sed` 사용 금지

## 작업 및 확인 규칙

- 사용자 요청에 없는 다음 단계를 추측해 진행하지 않습니다.
- 요구사항, 영향 범위, 실행 주소, 검증 기준이 불명확하면 추측하지말고, 반드시 사용자에게 확인 질문을 합니다.
- 사용자가 직접 확인해야 하는 사항이 있으면 작업을 멈추고 확인 결과를 요청합니다.
- 질문이나 선택지가 필요하면 결정 대상을 먼저 적습니다.
- 가벼운 결정은 2~4개 선택지와 `수행 안 함`을 함께 제시합니다.
- 설계, 공개 API, 설정, 복수 파일에 영향을 주는 결정은 현재 상태, 변경 후 모습, 영향 범위, 장단점을 함께 설명합니다.
- 여러 결정을 한 번에 묻지 말고 하나씩 처리합니다.
- 작업 중 사용자가 수정한 것으로 보이는 변경은 임의로 되돌리지 않습니다.

## 코드 스타일

- TypeScript ESM을 사용합니다.
- `strict` 기반 컴파일러 설정을 유지합니다.
- Prettier 설정을 따릅니다.
  - 들여쓰기: 2칸
  - 줄 너비: 100자
  - 세미콜론: 사용
  - trailing comma: 사용
  - 줄바꿈: LF
- 내부 구현 경로보다 패키지 공개 API와 `@simplysm/*` import를 우선합니다.
- 내부 모듈 import에는 `.js` 확장자를 붙이지 않습니다.
- 정적 import가 가능하면 `import()`를 사용하지 않습니다.
- 구조화된 문법 처리는 파서를 사용하고, 정규식이나 문자열 치환으로 우회하지 않습니다.
- 일반 값 비교는 `===`/`!==`를 사용합니다.
- null 또는 undefined 검사는 `== null`/`!= null`을 사용합니다.
- 부재, 미설정, 제거 의도를 표현하는 값은 `undefined`를 우선 사용합니다. 새 코드에서 `null` 반환값이나 상태값을 도입하지 않습니다.
- 외부 API, DOM API, Angular/라이브러리 타입처럼 기존 계약이 `null`을 요구하는 경우에만 `null`을 사용합니다.
- 타입 추론을 약화시키는 수정과 불필요한 `as` 캐스팅은 피합니다.

## 파일 및 export 규칙

- 테스트 파일: `*.spec.ts`
- 기대 출력 파일: `*.expected.ts`
- 검증 문서: `*.verify.md`
- Angular 컴포넌트 및 provider: `sd-*.ts`
- `src/index.ts` 외의 하위 폴더 barrel export는 만들지 않습니다.
- 다른 패키지의 API를 재export하지 않습니다.

## 테스트 지침

- Vitest 프로젝트 구성:
  - Node
  - Playwright browser
  - Angular
  - 통합 테스트
- 변경한 코드와 가장 가까운 패키지 테스트를 우선 추가하거나 수정합니다.
- 패키지 경계를 넘는 동작은 루트 `tests/*` 통합 테스트에 둡니다.
- ORM 통합 테스트는 `tests/orm/docker-compose.test.yml`의 데이터베이스 서비스가 필요합니다.
- 출력 기반 테스트에서 결과가 의도적으로 바뀐 경우에만 관련 `*.expected.ts` 또는 `*.acc.spec.ts` 파일을 갱신합니다.
- Playwright 브라우저 검증은 접속 주소가 확인된 뒤 수행합니다.
- 사용자가 주소를 제공하지 않았다면 임의로 서버를 실행하지 말고 먼저 주소를 확인합니다.

## 무조건 먼저 읽어야 할 자료

- [sd-codex-rules.md](.codex/rules/sd-codex-rules.md)
- [sd-options.md](.codex/rules/sd-options.md)
- [sd-simplysm-v14.md](.codex/rules/sd-simplysm-v14.md)
