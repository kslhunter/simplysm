---
name: sd-claude-docs
description: 프로젝트 분석을 통해 CLAUDE.md(개발자용)와 README.md/docs(소비자용) 문서를 동시 생성하는 스킬. "init", "CLAUDE.md 생성", "README 생성", "LLM 문서 만들어줘", "패키지 문서 생성" 등을 요청할 때 사용한다.
effort: low
---

# sd-claude-docs: CLAUDE.md + README.md/docs 통합 생성

프로젝트를 분석하여 **CLAUDE.md**(모노레포 내부 개발자용 컨텍스트)와 **README.md + docs/**(패키지 소비자용 API 문서)를 한 번에 생성·갱신한다. 설정 파일·스크립트·소스 코드에서 검증 가능한 사실만 추출하며, 기존 문서는 섹션 단위로 병합한다.

- **라이브러리 프로젝트** (`private: true`가 아닌 패키지 1개 이상 존재): CLAUDE.md + 각 패키지 `README.md` (+ 분량 조건에 해당 시 `docs/{category}/{entry}.md` 트리)
- **소비앱** (모든 패키지가 `private: true`): CLAUDE.md만 생성

**두 문서의 독립성.** CLAUDE.md는 **모노레포 내부 개발자(LLM 포함)**용, README.md + docs/는 **패키지 소비자**용이다. 대상·관점이 달라 중복되지 않는다. README.md + docs/는 **wiki 스타일**로 구성한다 — 각 export된 class/component(Entry)는 자체 md 파일로 분리되어, 소비자(특히 LLM)가 필요한 Entry 하나만 조회할 수 있게 한다. README.md는 인덱스, 상세는 각 Entry 파일에 둔다.

## 사용법

```
/sd-claude-docs              ← 전체 패키지 대상
/sd-claude-docs angular      ← packages/angular 만
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

라이브러리 프로젝트에서 패키지 소비자용 문서는 **해당 패키지 루트**에 위치한다.

| 구분 | CLAUDE.md | README.md | docs/ |
|------|-----------|-----------|-------|
| 모노레포 (각 패키지) | `{패키지 경로}/CLAUDE.md` | `{패키지 경로}/README.md` | `{패키지 경로}/docs/{category}/{entry}.md` |
| 모노레포 루트 | `./CLAUDE.md` | — | — |
| 단일 패키지 (루트=패키지) | `./CLAUDE.md` | `./README.md` | `./docs/{category}/{entry}.md` |

`private: true` 패키지는 README.md / docs/를 생성하지 않는다 (CLAUDE.md만).

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
- **커스텀 CLI** (예: `tsx packages/.../cli.ts`): Bash에서 `--help`를 먼저 실행한다 (5초 타임아웃). 유용한 정보가 있으면 그 결과를 사용한다. `--help`가 실패하거나 정보가 부족할 때만 소스 코드를 Read로 분석한다.

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

### 1-4. `.claude/rules/` 스캔

디렉토리가 존재하면 모든 `.md` 파일을 읽어 이미 다루고 있는 주제를 목록화한다. 해당 주제는 **CLAUDE.md에서 제외**한다 — 파일 간 규칙 중복은 LLM이 고유 지침 대신 중복 컨텍스트를 처리하게 되어 지침의 효과를 약화시킨다.

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

subagent가 개별 파일을 하나씩 Read하는 대신 병합 파일 1회 Read로 전체 소스를 파악할 수 있게 한다. 컨텍스트 소비를 대폭 줄이는 핵심 단계이다.

각 패키지에 대해 Bash로 실행 (여러 패키지면 병렬):

```bash
bash .claude/skills/sd-claude-docs/merge-source.sh {패키지경로} ./tmp/{패키지명}-source.txt
```

### 3-2. subagent 병렬 실행

처리 대상 목록의 각 경로에 대해 **Agent 도구로 subagent(effort: `low`)를 병렬 실행**한다. 하나의 메시지에서 모든 Agent 호출을 동시에 보낸다.

#### subagent 프롬프트

```
{패키지 경로}의 CLAUDE.md와 README.md/docs를 생성·갱신한다.

`.claude/skills/sd-claude-docs/references/package-docs.md`를 읽고 그 지침을 따른다.

전달 사항:
- 패키지 경로: {패키지 경로}
- 소스 병합 파일: {./tmp/{패키지명}-source.txt의 절대 경로}
- 루트 수준 설정 (이 내용과 중복되는 정보는 패키지 CLAUDE.md에 반복하지 않는다):
  {Step 1에서 추출한 코딩 규칙·컴파일러 설정 목록}
```

각 subagent는 소스 병합 파일을 한 번 Read하여 CLAUDE.md(Key Patterns)와 README.md/docs(API 문서) 모두에 활용한다.

### subagent 반환 정보

- 패키지 경로
- CLAUDE.md 생성/갱신/건너뜀 여부
- README.md 생성/갱신/건너뜀 여부 + 구조 (README 단독 / README + docs 트리)
- Entry 수 / 총 API 항목 수
- 생성된 파일 목록

## Step 4: 루트 CLAUDE.md 생성

Step 2의 "Step 4 수행" 열이 "수행"인 경우에만 진행한다.

### 4-1. 콘텐츠 구성

Step 1 결과와 Step 3의 각 패키지 CLAUDE.md를 조합하여 루트 CLAUDE.md를 생성한다. `.claude/rules/`에서 이미 다루는 주제(1-4에서 감지)는 **제외**한다. 패키지 CLAUDE.md에 기술된 상세(아키텍처, 패턴 등)는 루트에 중복하지 않고, 아키텍처 섹션에서 패키지 간 의존 관계와 역할 요약만 포함한다.

#### 포함할 섹션

- **프로젝트 정보**: 루트 `package.json`의 `name`/`description`, 패키지 매니저
- **모노레포 구조**: 워크스페이스 경로 나열, 각 패키지 10단어 이내 요약
- **기술 스택**: 주요 프레임워크·번들러·테스트 도구 (최대 10개)
- **명령어**: 1-2의 스크립트를 카테고리별 bash 코드 블록으로 포매팅, 인라인 주석 추가
- **아키텍처**: 패키지 간 의존 관계 및 역할 요약
- **코딩 규칙**: 1-3에서 선별한 규칙을 불릿 리스트로 포매팅

실질적 내용이 없는 섹션은 생략한다. 필요 시 위 외 섹션도 추가한다 (예: 통합 테스트).

### 4-2. 병합

공통 규칙의 "문서 병합 규칙"을 적용한다.

### 참고 예시

아래 **섹션 구조와 포매팅 스타일**을 따른다.

````markdown
# Simplysm

pnpm 모노레포. 패키지 경로: `packages/*`, 테스트: `tests/*`

## 명령어

### 개발

```bash
pnpm dev [targets..]                     # 서버 패키지를 개발 모드로 실행
pnpm watch [targets..]                   # 라이브러리 패키지를 watch 빌드
```

### 코드 품질

```bash
pnpm check [targets..]                   # 전체 검사
pnpm typecheck [targets..]               # TypeScript 타입 체크
```

## 아키텍처

의존 방향: 위 → 아래. `core-common`은 내부 의존성 없는 리프 패키지이다.

```
UI:       angular (Angular)
서비스:   service-server / service-client / service-common
코어:     core-common (중립) / core-browser / core-node
```

## 코딩 규칙

- `import type` 필수 (`verbatimModuleSyntax`), `#private` 금지 → `private` 키워드 사용
- `console.*` 금지, `Buffer` 금지 → `Uint8Array`
````

## Step 5: 결과 보고

```markdown
## sd-claude-docs 결과

| 패키지 | CLAUDE.md | README.md | 구조 | Entry / API |
|--------|-----------|-----------|------|-------------|
| root | 생성 | — | — | — |
| @simplysm/core-common | 갱신 | 갱신 | README 단독 | 8 / 35 |
| @simplysm/angular | 갱신 | 갱신 | README + docs 트리 | 72 / 126 |
| @simplysm/internal | 생성 | — (private) | — | — |

### 생성된 파일 목록
- CLAUDE.md (root)
- packages/core-common/CLAUDE.md
- packages/core-common/README.md
- packages/core-common/docs/utils/string-utils.md
- packages/angular/CLAUDE.md
- packages/angular/README.md
- packages/angular/docs/{category}/{entry}.md …
- ...
```
