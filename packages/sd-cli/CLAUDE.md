# sd-cli 패키지 작업 지침

## init 템플릿 분기 처리 위치

`init` 명령의 scaffold 템플릿(`src/commands/init/templates/**/*.hbs`)과 입력 정규화(`src/commands/init/normalize.ts`)를 다룰 때 적용.

입력(`InitInput`)에 따라 결과가 달라지는 분기는 두 종류로 나뉘며, 처리 위치가 다름.

- **값 분기** — 같은 위치에 들어갈 *값*이 입력에 따라 달라짐 → `normalize.ts`에서 계산해 `NormalizedInput`의 단일 변수로 넘기고, 템플릿은 `{{var}}` 치환만 함. dialect별 값은 `DB_PORTS`·`DB_CREDENTIALS`처럼 맵으로 관리.
- **구조 분기** — 코드 *줄·블록의 포함 여부*가 입력에 따라 달라짐 → 템플릿의 `{{#if}}`·`{{#each}}`·`{{#unless}}`로 처리.

판정: 분기 결과가 "같은 자리에 다른 문자열"이면 값 분기, "줄/블록이 있거나 없거나"면 구조 분기.

- 나쁜 예: dialect별 `username`/`password`를 템플릿에서 `{{#if isMysql}}...{{/if}}`로 채움 — 값 분기를 템플릿에 둠.
- 좋은 예: `normalize.ts`의 `DB_CREDENTIALS[dialect]`로 `dbUsername`/`dbPassword`를 계산해 넘기고, 템플릿은 `username: "{{dbUsername}}"`만 둠.
- 좋은 예: dialect별 드라이버 의존성 줄(`mysql2`/`pg`/`mssql`)은 줄 포함 여부이므로 템플릿 `{{#if isMysql}}`로 둠.
