---
name: sd-readme
description: LLM 인덱싱용 README.md 및 docs/ 생성. 사용자가 패키지의 README.md 생성이나 갱신을 요청할 때 사용
argument-hint: "[패키지명...]"
---

# sd-readme: LLM 인덱싱용 README 생성

프로젝트의 패키지에 대해 LLM 인덱싱에 최적화된 README.md 및 docs/ 문서를 생성하거나 업데이트한다.

## 1. 인자 파싱

`$ARGUMENTS`에서 대상 패키지를 결정한다.
- `$ARGUMENTS`가 비어있으면 → `"private": true`가 아닌 모든 패키지를 대상으로 한다
- `$ARGUMENTS`에 패키지명이 있으면 → 해당 패키지만 대상으로 한다 (공백 구분으로 다수 가능)
  - 패키지명은 디렉토리명 (예: `core-common`), 또는 `package.json`의 `name` 필드 값 (예: `@simplysm/core-common`) 중 어느 것이든 매칭한다

## 2. 프로젝트 유형 감지

다음 순서로 monorepo 워크스페이스를 감지한다. 하나라도 매칭되면 monorepo로 판단한다:

1. **pnpm**: `pnpm-workspace.yaml` 파일이 존재하면 `packages` 필드에서 glob 패턴을 추출하여 패키지 디렉토리를 탐색한다
2. **yarn/npm**: 루트 `package.json`의 `workspaces` 필드를 확인한다
   - `workspaces`가 배열인 경우: 직접 glob 패턴 목록으로 사용
   - `workspaces.packages`가 배열인 경우: yarn berry 형식
3. **단일 패키지**: 위 어느 것도 해당하지 않으면 현재 프로젝트 자체를 대상으로 한다

## 3. 대상 패키지 목록 수집

- **monorepo**: 2단계에서 감지한 glob 패턴으로 패키지 디렉토리를 탐색한다
  - 각 디렉토리의 `package.json`을 확인하여 `"private": true`인 패키지는 제외한다
  - 1단계에서 특정 패키지명이 지정되었으면 해당 패키지만 필터링한다
- **단일 패키지**: 현재 프로젝트 루트를 유일한 대상으로 한다 (`"private": true`여도 처리한다 — 단일 패키지는 명시적으로 스킬을 호출한 것이므로)

## 4. 패키지별 README 생성/업데이트

대상 패키지가 여러 개이면 Agent tool로 병렬 처리할 수 있다.

각 패키지에 대해 다음을 수행한다:

### 4-1. 소스 코드 분석

Agent tool (subagent_type: Explore)을 활용하여 패키지를 분석한다:
- `package.json`: name, description, dependencies, peerDependencies
- `src/` 디렉토리 구조 및 export된 API
- 주요 클래스/함수/타입의 시그니처와 용도

### 4-2. 생성/업데이트 모드 결정

- `README.md`가 없으면 → **생성 모드**: 처음부터 작성
- `README.md`가 있으면 → **업데이트 모드**: 기존 내용을 읽고, 현재 코드 상태와 비교하여 변경사항만 반영

### 4-3. 분리 여부 판단 (LLM 자율)

- README.md 하나로 충분하다고 판단되면 → README.md에 모든 내용을 포함
- 내용이 많아 분리가 필요하다고 판단되면 → README.md에 개요 + docs/ 링크, `docs/{category}.md`에 상세 내용

### 4-4. 파일 작성

**README.md 구조 (작은 패키지, docs/ 불필요 시):**

````markdown
# {패키지명}

{패키지 설명 - 목적과 핵심 기능}

## 설치

{설치 방법}

## 주요 기능

### {기능 카테고리 1}

{사용법, 주요 API 시그니처, 예제 코드}

### {기능 카테고리 2}

{사용법, 주요 API 시그니처, 예제 코드}
````

**README.md 구조 (큰 패키지, docs/ 분리 시):**

````markdown
# {패키지명}

{패키지 설명 - 목적과 핵심 기능}

## 설치

{설치 방법}

## 문서

| 카테고리 | 설명 |
|---------|------|
| [{카테고리1}](docs/{category1}.md) | {간단한 설명} |
| [{카테고리2}](docs/{category2}.md) | {간단한 설명} |

## 빠른 시작

{가장 기본적인 사용 예제}
````

**docs/{category}.md 구조:**

````markdown
# {카테고리명}

## {기능/API 1}

{상세 설명, 시그니처, 사용 예제}

## {기능/API 2}

{상세 설명, 시그니처, 사용 예제}
````

**내용 작성 원칙:**
- LLM이 코드 작성 시 참조할 수 있도록 API 시그니처와 사용 예제를 포함한다
- 사용법/가이드 + API 레퍼런스 하이브리드 형태로 작성한다
- 점진적 공개: 개요 → 주요 사용법 → 상세 API 순

## 5. 완료 안내

모든 패키지 처리가 완료되면 다음을 출력한다:
- 생성/업데이트된 파일 목록
- 각 파일의 생성/업데이트 여부
- 커밋 안내: "커밋하지 않습니다. 필요 시 `/sd-commit`을 실행하세요."
