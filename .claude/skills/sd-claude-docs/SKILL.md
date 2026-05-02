---
name: sd-claude-docs
description: 프로젝트 분석을 통해 CLAUDE.md(개발자용)와 README.md/docs(소비자용) 문서를 동시 생성하는 스킬. "init", "CLAUDE.md 생성", "README 생성", "LLM 문서 만들어줘", "패키지 문서 생성" 등을 요청할 때 사용한다.
model: haiku
---

# sd-claude-docs: CLAUDE.md + README.md/docs 통합 생성

프로젝트를 분석하여 **CLAUDE.md**(모노레포 내부 개발자용 컨텍스트)와 **소비자 문서(README.md + _api-index.md + Entry 파일)**를 한 번에 생성·갱신한다. 설정 파일·스크립트·소스 코드에서 검증 가능한 사실만 추출하며, 기존 문서는 섹션 단위로 병합한다.

- **라이브러리 프로젝트** (`private: true`가 아닌 패키지 1개 이상 존재): CLAUDE.md + 각 패키지 소비자 문서
- **소비앱** (모든 패키지가 `private: true`): CLAUDE.md만 생성

**두 문서의 독립성.** CLAUDE.md는 **모노레포 내부 개발자(LLM 포함)**용, 소비자 문서는 **패키지 소비자**용이다. 대상·관점이 달라 중복되지 않는다.

**작업 기반 발견성.** 소비자 문서는 **작업 라우터 구조**로 구성한다:
- **README.md** = 작업 라우터 ("하려는 작업 → 읽을 파일" 매핑에 전념. API 목록은 두지 않는다)
- **_api-index.md** = API 참조 인덱스 (API 이름을 이미 알 때 문서를 찾는 보조 파일)
- **{category}/{entry}.md** = Entry 상세 (각 Entry 상단에 "읽어야 하는 상황" 필수)

## 사용법

```
/sd-claude-docs              ← 전체 패키지 대상
/sd-claude-docs angular      ← packages/angular 만
```

## 공통 규칙

### 작성 언어

모든 문서는 **사용자가 대화에서 사용한 언어**로 작성한다. "적절히", "필요에 따라", "상황에 따라" 같은 모호한 표현을 사용하지 않는다.

### 문서 병합 규칙

기존 문서가 있으면 섹션(`##` 제목) 단위로 비교한다.

1. 동일 주제의 기존 섹션 → 새 콘텐츠로 **대체**
2. 대응 섹션이 없는 기존 섹션 → 그대로 **보존**
3. 기존 섹션 위치를 유지하고, 새로 생성된 섹션은 마지막 기존 섹션 **뒤에** 추가

### 출력 경로 규칙

| 구분 | CLAUDE.md | README.md | _api-index.md | Entry 파일 |
|------|-----------|-----------|---------------|------------|
| 모노레포 (각 패키지) | `{패키지 경로}/CLAUDE.md` | `{문서 루트}/{패키지명}/README.md` | `{문서 루트}/{패키지명}/_api-index.md` | `{문서 루트}/{패키지명}/{category}/{entry}.md` |
| 모노레포 루트 | `./CLAUDE.md` | — | — | — |
| 단일 패키지 (루트=패키지) | `./CLAUDE.md` | `./README.md` | `./_api-index.md` | `./{category}/{entry}.md` |

`private: true` 패키지는 README.md / Entry 파일을 생성하지 않는다 (CLAUDE.md만).

#### `{문서 루트}` 결정

루트 `package.json`의 `version` 필드에서 메이저 버전을 추출하여 `{문서 루트}`를 결정한다.

```
version: "14.0.51" → 메이저 버전: 14 → {문서 루트}: .claude/references/sd-simplysm-v14
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

디렉토리가 존재하면 `.claude/rules/*.md`에 매칭되는 룰 본문 파일을 읽어 이미 다루고 있는 주제를 목록화한다. 단, `*.eval.md` 파일은 룰의 Eval 시나리오이므로 제외한다. 해당 주제의 상세 규칙 본문은 **CLAUDE.md에서 제외**한다 — 파일 간 규칙 중복은 LLM이 고유 지침 대신 중복 컨텍스트를 처리하게 되어 지침의 효과를 약화시킨다.

### 1-5. 프로젝트 유형 감지

모노레포면 모든 패키지의 `package.json`을, 단일 패키지면 루트 `package.json`을 확인한다.

- **라이브러리 프로젝트**: `private: true`가 아닌 패키지가 1개 이상
- **소비앱**: 모든 패키지가 `private: true`

## Step 2: 처리 대상 결정

인자와 워크스페이스 구성으로 처리 대상 패키지 경로를 결정한다. 단일 패키지 프로젝트는 루트를 패키지로 취급한다.

| 경우 | 처리 대상 | Step 4 수행 | Step 5 수행 |
|------|-----------|-------------|-------------|
| 인자 있음 | `packages/{인자}/package.json`이 존재하면 해당 1개 경로. 없으면 사용자에게 알리고 종료. | 건너뜀 | 처리 대상 패키지 섹션만 갱신 |
| 인자 없음 + 모노레포 | `packages/` 하위 모든 패키지 경로 | 수행 | 처리 대상 패키지 섹션 모두 갱신 |
| 인자 없음 + 단일 패키지 | 루트 경로 1개 (루트 = 패키지) | 소비앱이면 4-3만 수행, 라이브러리면 건너뜀 | 인덱스 파일이 없으면 건너뜀 |

## Step 3: 각 패키지 처리

### 3-1. 소스 병합

subagent가 개별 파일을 하나씩 Read하는 대신 병합 파일 1회 Read로 전체 소스를 파악할 수 있게 한다. 컨텍스트 소비를 대폭 줄이는 핵심 단계이다.

타임스탬프 변수를 생성한 뒤, 각 패키지에 대해 Bash로 실행 (여러 패키지면 병렬):

```bash
TS=$(date +%y%m%d%H%M%S)
python .claude/skills/sd-claude-docs/merge-source.py {패키지경로} ./.tmp/docs/$TS/{패키지명}-source.txt
```

### 3-2. subagent 병렬 실행

처리 대상 목록의 각 경로에 대해 **Agent 도구로 subagent(effort: `low`)를 병렬 실행**한다. 하나의 메시지에서 모든 Agent 호출을 동시에 보낸다.

#### subagent 프롬프트

```
{패키지 경로}의 CLAUDE.md와 소비자 문서를 생성·갱신한다.

`.claude/skills/sd-claude-docs/references/package-docs.md`를 읽고 그 지침을 따른다.

전달 사항:
- 패키지 경로: {패키지 경로}
- 패키지명: {패키지 디렉토리명}
- 프로젝트 유형: {라이브러리 | 소비앱}  # Step 1-5에서 감지한 전체 프로젝트 유형
- 문서 루트: {문서 루트}
- 소비자 문서 출력 경로: `{문서 루트}/{패키지명}/`
- 소스 병합 파일: {./.tmp/docs/$TS/{패키지명}-source.txt의 절대 경로}
- 루트 수준 설정 (이 내용과 중복되는 정보는 패키지 CLAUDE.md에 반복하지 않는다):
  {Step 1에서 추출한 코딩 규칙·컴파일러 설정 목록}
```

각 subagent는 소스 병합 파일을 한 번 Read하여 CLAUDE.md(Key Patterns)와 소비자 문서(API 문서) 모두에 활용한다.

### subagent 반환 정보

- 패키지 경로
- CLAUDE.md 생성/갱신/건너뜀 여부
- 소비자 문서 생성/갱신/건너뜀 여부 + 구조 (README 단독 / README + _api-index + Entry 트리)
- Entry 수 / 총 API 항목 수
- 생성된 파일 목록 (_api-index.md 포함)
- **표준 API 매핑 항목 후보**: 표준 라이브러리·외부 라이브러리·직접 구현이 이 패키지에 동등 기능이 있는 케이스 0~N건. 각 항목은 `{도메인 영역}: {금지 사항} → {대안}` 형식의 한 줄 (예: `바이트 배열: Buffer 금지 → Uint8Array (복잡한 연산은 BytesUtils)`). 추출 지침은 `references/package-docs.md`의 "표준 API 매핑 항목 추출" 섹션 참조. 확인된 항목이 없으면 빈 배열.
- **도메인 용어 후보**: 프로젝트 유형이 `소비앱`일 때만 수집한다 (`라이브러리`는 빈 배열). 패키지 내 화면명·라우트·엔터티·코멘트에서 추출한 도메인 어휘 0~N건. 각 항목은 `term` / `classification` / `meaning` / `occurrences` / `confusion_with`. 추출 지침은 `references/package-docs.md`의 "도메인 용어 후보 수집" 섹션 참조.

## Step 4: 루트 CLAUDE.md 생성/갱신

Step 2의 "Step 4 수행" 열에 따라 진입한다. 진입 후 프로젝트 유형·구조에 따라 하위 단계를 선택 수행한다.

| 프로젝트 유형 / 구조 | 4-1 (콘텐츠) | 4-2 (병합) | 4-3 (도메인 용어집) |
|---|---|---|---|
| 라이브러리 모노레포 | 수행 | 수행 | — |
| 소비앱 모노레포 | 수행 | 수행 | 수행 |
| 소비앱 단일 패키지 | — | — | 수행 (대상: 패키지 CLAUDE.md = 루트 CLAUDE.md) |
| 라이브러리 단일 패키지 | — | — | — |

### 4-1. 콘텐츠 구성

루트 CLAUDE.md는 Claude가 이 저장소에서 작업하기 전에 읽고 따르는 **작업 지침서**로 작성한다. 프로젝트 소개서, 기술 스택 요약서, 아키텍처 설명서처럼 작성하지 않는다.

Step 1 결과와 Step 3의 각 패키지 CLAUDE.md를 조합하여 루트 CLAUDE.md를 생성한다. `.claude/rules/`에서 이미 다루는 주제(1-4에서 감지)의 상세 규칙 본문은 **제외**한다. 패키지 CLAUDE.md에 기술된 상세(패키지 내부 구조, 패턴, API 사용법 등)는 루트에 중복하지 않는다. 루트에는 작업자가 어느 패키지와 어떤 문서를 먼저 봐야 하는지 판단할 수 있는 수준의 라우팅 정보만 둔다.

#### 작성 원칙

- **작업자가 바로 행동할 수 있게 작성한다**: "무엇을 읽고 → 어디를 수정하고 → 어떤 명령으로 검증하는가"를 중심으로 쓴다.
- **설명보다 지침을 우선한다**: 기술 스택·아키텍처·패키지 역할은 작업 판단에 필요한 만큼만 짧게 쓴다.
- **중복을 피한다**: `.claude/rules/*.md`, 패키지 CLAUDE.md, 소비자 README/docs에 이미 있는 상세 내용은 링크하거나 한 줄로 라우팅한다.
- **금지와 대안을 함께 쓴다**: 금지 명령어·금지 API·금지 패턴을 쓰는 경우 허용되는 명령어·API·패턴을 같은 항목에 적는다.
- **명령어는 실제 스크립트 기준으로 쓴다**: 일반적인 `npm run script -- --flag` 습관을 추측으로 적용하지 않는다. `package.json` 스크립트가 `pnpm sd-cli <command>`처럼 커스텀 CLI를 감싸면 `--target` 같은 옵션은 중간 `--` 없이 작성한다.
- **검증 명령 우선순위를 드러낸다**: `check`(typecheck+lint 일괄)가 있으면 `--fix` 형태를 기본 검증으로 표기한다. `typecheck`/`lint` 단독 명령은 "`check` 실패 후 단계 격리 분석용"임을 코멘트에 명시한다.

#### 포함할 섹션

- **작업 언어**: 사용자 응답 언어, 저장소 문서 언어, 공개 소비자 문서 작성 관점
- **저장소 구조와 수정 경계**: 워크스페이스 경로, 루트/패키지/테스트/문서 산출물의 책임 경계
- **패키지 라우팅**: 사용자 요청 유형별로 먼저 볼 패키지·테스트·문서 경로를 표로 정리
- **명령어**: 1-2의 스크립트를 작업 유형별 bash 코드 블록으로 포매팅, 각 명령을 언제 쓰는지 인라인 주석 추가
- **코딩 규칙**: 1-3에서 선별한 규칙 중 작업 중 실수하기 쉬운 전역 금지·필수 규칙을 불릿 리스트로 포매팅
- **테스트와 검증 기준**: 변경 유형별 최소 검증 명령, 통합 테스트 전제 조건, 실행하지 못한 경우 보고 기준
- **주의할 변경사항**: lockfile, 생성물, 공개 API, 설정 파일처럼 파급이 큰 파일을 언제 함께 갱신해야 하는지 기술

실질적 내용이 없는 섹션은 생략한다. 필요 시 위 외 섹션도 추가한다 (예: 네이티브 앱 실행, 브라우저 검증).

#### 제외할 내용

- 프로젝트 홍보 문구, 긴 개요, 기술 스택 나열만을 위한 섹션
- 패키지 내부 디렉토리별 상세 설명 — 패키지 CLAUDE.md에 둔다
- 공개 API 사용법, 예제, anti-pattern — 소비자 README/docs에 둔다
- `.claude/rules/*.md`에 이미 있는 상세 규칙 본문
- 작업 판단에 쓰이지 않는 의존 관계 다이어그램

### 4-2. 병합

공통 규칙의 "문서 병합 규칙"을 적용한다.

### 4-3. 도메인 용어집 (소비앱 한정)

루트 CLAUDE.md(소비앱 단일 패키지면 패키지 CLAUDE.md)의 `## 도메인 용어집` 섹션에 사용자가 실제 업무에서 부르는 용어·약칭과 코드 상의 화면·엔터티 매핑을 기록한다.

1. Step 3 subagent 반환의 "도메인 용어 후보"를 모두 모아 패키지 간 중복을 통합한다 (동일 `term`은 `occurrences` 합치고 가장 강한 분류 채택).
2. 각 용어 항목을 결정 사안으로 두고 `.claude/rules/sd-clarify.md` 지침을 적용한다.
3. 확정된 용어로 섹션을 갱신한다. 코드 정합성 기준:
   - 코드에 더 이상 등장하지 않는 기존 용어 → 제거
   - 매핑 대상(화면·엔터티)이 바뀐 용어 → 새 매핑으로 갱신
   - 사용자가 답변으로 확정한 의미 풀이·동음이의 분기 본문은 보존하되, 코드 변경에 맞춰 매핑 대상만 조정
   - 신규 용어 → 추가
   - 기존 용어와 의미가 겹칠 가능성이 있는 신규 용어 → 2단계로 돌아가 sd-clarify로 통합 여부 결정

```markdown
## 도메인 용어집

- "PO" → 맥락 따라 분기:
  - 고객사에서 받는 경우 = `고객사 PO` 화면 (매출)
  - 구매처로 보내는 경우 = `New PO` 화면 (매입)
- `매출 PO` = `고객사 PO` 화면 (고객사 수주)
- `매입 PO` = `New PO` 화면 (구매처 발주)
```

표기: 화면명·코드 식별자는 백틱, 고객 발화·약칭 등 동음이의 키워드는 큰따옴표. 한 항목은 1줄 (동음이의 분기는 들여쓰기 하위 불릿 허용).

### 참고 예시

아래 **섹션 구조와 포매팅 스타일**을 따른다.

````markdown
# Simplysm

pnpm 기반 TypeScript ESM 모노레포. 이 파일은 Claude가 작업 전에 읽는 저장소 작업 지침이다.

## 작업 언어

- 사용자 안내와 작업 요약은 한국어로 작성한다.
- 공개 소비자 문서는 패키지를 사용하는 LLM이 바로 코드를 작성할 수 있는 작업 라우터 형태로 작성한다.

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
pnpm check --fix [--target <pkg>]        # 기본 검증 (typecheck + lint 일괄, lint 자동 수정 포함)
pnpm typecheck [--target <pkg>]          # check 실패 후 타입 단계만 격리 분석할 때
pnpm lint [--target <pkg>]               # check 실패 후 lint 단계만 격리 분석할 때
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

## Step 5: 버전 인덱스 갱신

처리 대상이 있는 모든 경우에 수행한다 (단일 패키지 인자 시에도). 인덱스 파일이 없으면 건너뛴다.

### 5-1. 인덱스 파일 결정

`{문서 루트}`의 디렉토리명을 사용하여 인덱스 파일 경로를 결정한다.

```
{문서 루트} = .claude/references/sd-simplysm-v14
디렉토리명 = sd-simplysm-v14
인덱스 파일 = .claude/rules/sd-simplysm-v14.md
```

인덱스 파일이 존재하지 않으면 본 Step을 건너뛴다 (인덱스 파일은 사용자가 최초 1회 직접 작성한다).

### 5-2. 표준 API 매핑 섹션 갱신

인덱스 파일의 `## 표준 API → simplysm 매핑` 섹션을 다음 규칙으로 갱신한다.

**보존 우선 정책.** 인덱스 파일은 사용자가 직접 큐레이션한 매핑 모음이다. 임의 덮어쓰기 금지.

1. `## 표준 API → simplysm 매핑` 섹션이 없으면 본 Step 전체를 건너뛴다.
2. Step 3에서 처리한 각 패키지에 대해, 인덱스 파일에서 `### \`@scope/{패키지명}\`` 헤더를 찾는다.
   - **헤더 블록이 이미 있는 경우**: 기존 항목 전부 **보존**. subagent가 새로 발견한 항목 중 기존 항목과 중복되지 않는 것만 블록 끝에 **추가**한다. 도메인 라벨 표기를 기존 항목 형식과 맞춘다 (예: `바이트 배열: ...`).
   - **헤더 블록이 없는 경우**: 패키지 헤더 + 항목 불릿을 섹션 마지막 패키지 헤더 직후에 **신규 추가**한다.
3. Step 3에서 처리하지 않은 패키지의 헤더 블록은 **그대로 유지**한다.
4. 항목 형식: `{도메인 영역}: {금지 사항} → {대안}` 한 줄. 코드 식별자는 백틱으로 감싼다.

레이아웃 예시:

```markdown
## 표준 API → simplysm 매핑

표준 API·외부 라이브러리·직접 구현으로 처리하던 작업이 `@simplysm/*`에 동등 기능이 있으면 simplysm 쪽을 사용한다.
세부 사용법은 각 패키지 README를 참조한다.

### `@simplysm/core-common`

- 바이트 배열: `Buffer` 금지 → `Uint8Array` (복잡한 연산은 `BytesUtils`)
- 이벤트: `events`/`eventemitter3` 금지 → `EventEmitter`

### `@simplysm/core-node`

- 파일 시스템: `node:fs`/`fs/promises` 직접 사용 금지 → `Fsx`
```

## Step 6: 결과 보고

사용자가 무엇이 바뀌었는지만 빠르게 알 수 있게 한다. 소비자 문서는 패키지별 `변경/전체` 파일 수, 그 외는 변경된 파일 경로 목록.

```markdown
## sd-claude-docs 결과

### 패키지 소비자 문서
- @simplysm/core-common: 5/10
- @simplysm/angular: 73/126

### 그 외 변경된 파일
- CLAUDE.md
- packages/core-common/CLAUDE.md
- packages/angular/CLAUDE.md
- .claude/rules/sd-simplysm-v14.md
```
