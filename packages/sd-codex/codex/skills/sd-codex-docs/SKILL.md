---
name: sd-codex-docs
description: 프로젝트 분석을 통해 AGENTS.md(개발자용)와 README.md/docs(소비자용) 문서를 동시 생성하는 스킬. "init", "AGENTS.md 생성", "README 생성", "LLM 문서 만들어줘", "패키지 문서 생성" 등을 요청할 때 사용한다.
---

# sd-codex-docs: AGENTS.md + README.md/docs 통합 생성

프로젝트를 분석하여 **AGENTS.md**(모노레포 내부 개발자용 컨텍스트)와 **소비자 문서(README.md + _api-index.md + Entry 파일)**를 한 번에 생성·갱신한다. 설정 파일·스크립트·소스 코드에서 검증 가능한 사실만 추출하며, 기존 문서는 섹션 단위로 병합한다.

- **라이브러리 프로젝트** (`private: true`가 아닌 패키지 1개 이상 존재): AGENTS.md + 각 패키지 소비자 문서
- **소비앱** (모든 패키지가 `private: true`): AGENTS.md만 생성

**두 문서의 독립성.** AGENTS.md는 **모노레포 내부 개발자(LLM 포함)**용, 소비자 문서는 **패키지 소비자**용이다. 대상·관점이 달라 중복되지 않는다.

**작업 기반 발견성.** 소비자 문서는 **작업 라우터 구조**로 구성한다:
- **README.md** = 작업 라우터 ("하려는 작업 → 읽을 파일" 매핑에 전념. API 목록은 두지 않는다)
- **_api-index.md** = API 참조 인덱스 (API 이름을 이미 알 때 문서를 찾는 보조 파일)
- **{category}/{entry}.md** = Entry 상세 (각 Entry 상단에 "읽어야 하는 상황" 필수)

## 사용법

```
$sd-codex-docs              ← 전체 패키지 대상
$sd-codex-docs angular      ← packages/angular 만
```

## 공통 규칙

### 작성 언어

모든 문서는 **대화언어**로 작성한다. "적절히", "필요에 따라", "상황에 따라" 같은 모호한 표현을 사용하지 않는다.

### 문서 병합 규칙

기존 문서가 있으면 섹션(`##` 제목) 단위로 비교한다.

1. 동일 주제의 기존 섹션 → 새 콘텐츠로 **대체**
2. 대응 섹션이 없는 기존 섹션 → 그대로 **보존**
3. 기존 섹션 위치를 유지하고, 새로 생성된 섹션은 마지막 기존 섹션 **뒤에** 추가

### 출력 경로 규칙

| 구분 | AGENTS.md | README.md | _api-index.md | Entry 파일 |
|------|-----------|-----------|---------------|------------|
| 모노레포 (각 패키지) | `{패키지 경로}/AGENTS.md` | `{문서 루트}/{패키지명}/README.md` | `{문서 루트}/{패키지명}/_api-index.md` | `{문서 루트}/{패키지명}/{category}/{entry}.md` |
| 모노레포 루트 | `./AGENTS.md` | — | — | — |
| 단일 패키지 (루트=패키지) | `./AGENTS.md` | `./README.md` | `./_api-index.md` | `./{category}/{entry}.md` |

`private: true` 패키지는 README.md / Entry 파일을 생성하지 않는다 (AGENTS.md만).

#### `{문서 루트}` 결정

루트 `package.json`의 `version` 필드에서 메이저 버전을 추출하여 `{문서 루트}`를 결정한다.

```
version: "14.0.51" → 메이저 버전: 14 → {문서 루트}: .codex/references/sd-simplysm-v14
```

모노레포에서 `{패키지명}`은 패키지 디렉토리명이다 (예: `packages/angular` → `angular`). README.md 내부의 Entry 파일 링크는 상대 경로를 사용한다 (예: `[SdThemeProvider](./providers/sd-theme-provider.md)`).

## Step 1: 사전 분석

### 1-1. 패키지 매니저 감지

프로젝트 루트의 lock 파일로 식별한다:

1. `pnpm-lock.yaml` → pnpm
2. `yarn.lock` → yarn
3. `bun.lock` 또는 `bun.lockb` → bun
4. 그 외 → npm

### 1-2. 스크립트 분석

루트 `package.json`의 `scripts` 섹션을 읽고 각 스크립트의 CLI 도구를 분석한다.

- **잘 알려진 도구** (`tsc`, `vitest`, `eslint`, `prettier`, `playwright` 등): 명령어를 그대로 기록
- **커스텀 CLI** (예: `tsx packages/.../cli.ts`): `--help`를 먼저 실행한다 (5초 타임아웃). 유용한 정보가 있으면 그 결과를 사용한다. `--help`가 실패하거나 정보가 부족할 때만 소스 코드를 읽어 분석한다.

### 1-3. 코딩 규칙 추출

아래 설정 파일을 찾아 읽는다 (없는 파일은 건너뛴다):

- ESLint: `eslint.config.*`, `.eslintrc.*`
- Prettier: `.prettierrc*`, `prettier.config.*`
- EditorConfig: `.editorconfig`
- TypeScript: `tsconfig.json` → `compilerOptions`
- Stylelint: `.stylelintrc*`, `stylelint.config.*`

선별 기준:

- 도구 기본값과 다른 설정 (예: TypeScript `verbatimModuleSyntax: true`, Prettier `printWidth: 100`)
- error 수준의 비표준 규칙 (예: `no-console: error`)
- 특정 API를 금지하거나 요구하는 규칙 (예: `Buffer` 금지 → `Uint8Array` 사용)

### 1-4. `.codex/rules/` 스캔

디렉토리가 존재하면 `.codex/rules/*.md`에 매칭되는 룰 본문 파일을 읽어 이미 다루고 있는 주제를 목록화한다. 단, `*.eval.md` 파일은 룰의 Eval 시나리오이므로 제외한다. 해당 주제의 상세 규칙 본문은 **AGENTS.md에서 제외**한다 — 파일 간 규칙 중복은 LLM이 고유 지침 대신 중복 컨텍스트를 처리하게 되어 지침의 효과를 약화시킨다.

루트 AGENTS.md에는 `.codex/rules/*.md`에 매칭되는 룰 본문 파일을 상대 경로 Markdown 링크로 나열하는 `무조건 항상 읽어야 할 자료` 섹션을 반드시 포함한다. 단, `*.eval.md` 파일은 포함하지 않는다. 링크 목록은 실행 시점의 파일 목록에서 생성하고, 파일명 오름차순으로 정렬한다. 현재 존재하는 파일명을 하드코딩하지 않는다.

### 1-5. 프로젝트 유형 감지

모노레포면 모든 패키지의 `package.json`을, 단일 패키지면 루트 `package.json`을 확인한다.

- **라이브러리 프로젝트**: `private: true`가 아닌 패키지가 1개 이상
- **소비앱**: 모든 패키지가 `private: true`

## Step 2: 처리 대상 결정

인자 유무와 워크스페이스 구성으로 **처리 대상 패키지 경로 목록**을 확정한다. 단일 패키지 프로젝트는 루트를 "가상 패키지"로 취급하여 동일 프로세스를 적용한다 (자기참조 없음).

| 경우 | 처리 대상 | Step 4 수행 |
|------|-----------|-------------|
| 인자 있음 | `packages/{인자}/package.json`이 존재하면 해당 1개 경로. 없으면 사용자에게 알리고 종료. | 건너뜀 |
| 인자 없음 + 모노레포 | `packages/` 하위 모든 패키지 경로 | 수행 |
| 인자 없음 + 단일 패키지 | 루트 경로 1개 (루트 = 패키지) | 건너뜀 |

## Step 3: 각 패키지 처리

### 3-1. 소스 병합

subagent가 개별 파일을 하나씩 읽는 대신 병합 파일 1회 읽기로 전체 소스를 파악할 수 있게 한다. 컨텍스트 소비를 대폭 줄이는 핵심 단계이다.

각 패키지에 대해 `.codex/skills/sd-codex-docs/merge-source.sh`를 실행하여 `./.tmp/docs/{yyMMddHHmmss}/{패키지명}-source.txt` 파일로 저장한다.

- `{yyMMddHHmmss}`는 실제 현재 시각을 `yyMMddHHmmss` 형식으로 기재한다.
- 여러 패키지면 병렬로 수행한다.

### 3-2. subagent 병렬 실행

처리 대상 목록의 각 경로에 대해, 이 스킬 실행 요청을 `spawn_agent` 사용 승인으로 보고 `spawn_agent`로 subagent를 병렬 실행한다. 하나의 메시지에서 모든 `spawn_agent` 호출을 동시에 보낸다. 각 `spawn_agent` 호출에는 `fork_context: false`, `model: "gpt-5.3-codex-spark"`, `reasoning_effort: "low"`를 명시한다.

#### subagent 프롬프트

```
{패키지 경로}의 AGENTS.md와 소비자 문서를 생성·갱신한다.

`.codex/skills/sd-codex-docs/references/package-docs.md`를 읽고 그 지침을 따른다.

전달 사항:
- 패키지 경로: {패키지 경로}
- 패키지명: {패키지 디렉토리명}
- 문서 루트: {문서 루트}
- 소비자 문서 출력 경로: `{문서 루트}/{패키지명}/`
- 소스 병합 파일: {./.tmp/docs/{yyMMddHHmmss}/{패키지명}-source.txt의 절대 경로}
- 루트 수준 설정 (이 내용과 중복되는 정보는 패키지 AGENTS.md에 반복하지 않는다):
  {Step 1에서 추출한 코딩 규칙·컴파일러 설정 목록}
```

각 subagent는 소스 병합 파일을 한 번 읽어 AGENTS.md(Key Patterns)와 소비자 문서(API 문서) 모두에 활용한다.

### subagent 반환 정보

- 패키지 경로
- AGENTS.md 생성/갱신/건너뜀 여부
- 소비자 문서 생성/갱신/건너뜀 여부 + 구조 (README 단독 / README + _api-index + Entry 트리)
- Entry 수 / 총 API 항목 수
- 생성된 파일 목록 (_api-index.md 포함)

## Step 4: 루트 AGENTS.md 생성

Step 2의 "Step 4 수행" 열이 "수행"인 경우에만 진행한다.

### 4-1. 콘텐츠 구성

루트 AGENTS.md는 Codex가 이 저장소에서 작업하기 전에 읽고 따르는 **작업 지침서**로 작성한다. 프로젝트 소개서, 기술 스택 요약서, 아키텍처 설명서처럼 작성하지 않는다.

Step 1 결과와 Step 3의 각 패키지 AGENTS.md를 조합하여 루트 AGENTS.md를 생성한다. `.codex/rules/`에서 이미 다루는 주제(1-4에서 감지)의 상세 규칙 본문은 **제외**하되, 1-4에서 수집한 룰 본문 파일은 루트 AGENTS.md의 `무조건 항상 읽어야 할 자료` 섹션에 링크로 포함한다. 패키지 AGENTS.md에 기술된 상세(패키지 내부 구조, 패턴, API 사용법 등)는 루트에 중복하지 않는다. 루트에는 작업자가 어느 패키지와 어떤 문서를 먼저 봐야 하는지 판단할 수 있는 수준의 라우팅 정보만 둔다.

#### 작성 원칙

- **작업자가 바로 행동할 수 있게 작성한다**: "무엇을 읽고 → 어디를 수정하고 → 어떤 명령으로 검증하는가"를 중심으로 쓴다.
- **설명보다 지침을 우선한다**: 기술 스택·아키텍처·패키지 역할은 작업 판단에 필요한 만큼만 짧게 쓴다.
- **중복을 피한다**: `.codex/rules/*.md`, 패키지 AGENTS.md, 소비자 README/docs에 이미 있는 상세 내용은 링크하거나 한 줄로 라우팅한다.
- **금지와 대안을 함께 쓴다**: 금지 명령어·금지 API·금지 패턴을 쓰는 경우 허용되는 명령어·API·패턴을 같은 항목에 적는다.
- **명령어는 실제 스크립트 기준으로 쓴다**: 일반적인 `npm run script -- --flag` 습관을 추측으로 적용하지 않는다. `package.json` 스크립트가 `pnpm sd-cli <command>`처럼 커스텀 CLI를 감싸면 `--target` 같은 옵션은 중간 `--` 없이 작성한다.

#### 포함할 섹션

- **작업 언어**: 사용자 응답 언어, 저장소 문서 언어, 공개 소비자 문서 작성 관점
- **무조건 항상 읽어야 할 자료**: `.codex/rules/*.md`에 매칭되는 룰 본문 파일을 상대 경로 Markdown 링크로 나열 (`*.eval.md` 제외)
- **저장소 구조와 수정 경계**: 워크스페이스 경로, 루트/패키지/테스트/문서 산출물의 책임 경계
- **패키지 라우팅**: 사용자 요청 유형별로 먼저 볼 패키지·테스트·문서 경로를 표로 정리
- **명령어**: 1-2의 스크립트를 작업 유형별 bash 코드 블록으로 포매팅, 각 명령을 언제 쓰는지 인라인 주석 추가
- **코딩 규칙**: 1-3에서 선별한 규칙 중 작업 중 실수하기 쉬운 전역 금지·필수 규칙을 불릿 리스트로 포매팅
- **테스트와 검증 기준**: 변경 유형별 최소 검증 명령, 통합 테스트 전제 조건, 실행하지 못한 경우 보고 기준
- **주의할 변경사항**: lockfile, 생성물, 공개 API, 설정 파일처럼 파급이 큰 파일을 언제 함께 갱신해야 하는지 기술

실질적 내용이 없는 섹션은 생략한다. 단, `.codex/rules/*.md`에 매칭되는 룰 본문 파일이 1개 이상이면 `무조건 항상 읽어야 할 자료` 섹션은 생략하지 않는다. 필요 시 위 외 섹션도 추가한다 (예: 네이티브 앱 실행, 브라우저 검증).

#### 제외할 내용

- 프로젝트 홍보 문구, 긴 개요, 기술 스택 나열만을 위한 섹션
- 패키지 내부 디렉토리별 상세 설명 — 패키지 AGENTS.md에 둔다
- 공개 API 사용법, 예제, anti-pattern — 소비자 README/docs에 둔다
- `.codex/rules/*.md`에 이미 있는 상세 규칙 본문
- 작업 판단에 쓰이지 않는 의존 관계 다이어그램

### 4-2. 병합

공통 규칙의 "문서 병합 규칙"을 적용한다.

### 참고 예시

아래 **섹션 구조와 포매팅 스타일**을 따른다.

````markdown
# Simplysm

pnpm 기반 TypeScript ESM 모노레포. 이 파일은 Codex가 작업 전에 읽는 저장소 작업 지침이다.

## 작업 언어

- 사용자 안내와 작업 요약은 한국어로 작성한다.
- 공개 소비자 문서는 패키지를 사용하는 LLM이 바로 코드를 작성할 수 있는 작업 라우터 형태로 작성한다.

## 무조건 항상 읽어야 할 자료

- [파일명.md](.codex/rules/파일명.md)
- ...

## 저장소 구조와 수정 경계

- 워크스페이스는 `packages/*`, `tests/*`이다.
- 공개 패키지 코드를 수정하면 해당 패키지의 소비자 문서도 함께 확인한다.
- 루트 설정, lockfile, 생성물은 관련 변경이 있을 때만 수정한다.

## 패키지 라우팅

| 요청 유형 | 먼저 볼 위치 | 함께 확인할 위치 |
|-----------|--------------|------------------|
| Angular UI | `packages/angular` | `{문서 루트}/angular/README.md` |
| 서비스 서버 | `packages/service-server` | `tests/service` |
| ORM | `packages/orm-common`, `packages/orm-node` | `tests/orm` |

## 명령어

```bash
pnpm check [--target <pkg>]              # 패키지 변경 후 타입체크와 lint 실행
pnpm typecheck [--target <pkg>]          # 타입 오류만 확인
pnpm lint [--target <pkg>]               # lint 오류만 확인
vitest run <path>                        # 변경 범위에 맞는 테스트 실행
```

## 코딩 규칙

- `import type` 필수 (`verbatimModuleSyntax`), `#private` 금지 → `private` 키워드 사용
- `console.*` 금지, `Buffer` 금지 → `Uint8Array`

## 테스트와 검증 기준

- 타입·lint 영향이 있는 변경은 `pnpm check [--target <pkg>]`로 검증한다.
- 런타임 로직 변경은 관련 `vitest run <path>`를 함께 실행한다.
- 실행하지 못한 검증은 최종 응답에 이유와 남은 위험을 적는다.

## 주의할 변경사항

- 공개 API를 바꾸면 소비자 문서와 API 인덱스를 함께 갱신한다.
- 의존성 변경이 있을 때만 lockfile을 갱신한다.
- 생성물은 생성 명령을 실행한 경우에만 갱신한다.
````

## Step 5: 결과 보고

```markdown
## sd-codex-docs 결과

| 패키지 | AGENTS.md | 소비자 문서 | 구조 | Entry / API |
|--------|-----------|-------------|------|-------------|
| root | 생성 | — | — | — |
| @simplysm/core-common | 갱신 | 갱신 | README 단독 | 8 / 35 |
| @simplysm/angular | 갱신 | 갱신 | README + _api-index + Entry 트리 | 72 / 126 |
| @simplysm/internal | 생성 | — (private) | — | — |

### 생성된 파일 목록
- AGENTS.md (root)
- packages/core-common/AGENTS.md
- {문서 루트}/core-common/README.md
- packages/angular/AGENTS.md
- {문서 루트}/angular/README.md
- {문서 루트}/angular/_api-index.md
- {문서 루트}/angular/{category}/{entry}.md …
- ...
```
