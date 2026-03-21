---
name: sd-readme
description: |
  monorepo 각 패키지의 public API를 분석하여 LLM이 읽을 수 있는 README.md와 docs/ 문서를 자동 생성하는 스킬.
  /sd-readme를 입력하거나, "README 생성", "LLM 문서 만들어줘", "패키지 문서 생성" 등을 요청할 때 사용한다.
---

# sd-readme: 패키지 README/docs 생성

패키지의 `package.json` → 엔트리포인트 → export 체인을 추적하여 public API만 문서화한다.
npm 배포 후 사용자 프로젝트에서 LLM(Claude Code 등)이 `node_modules/` 안의 README.md를 읽고 API를 이해할 수 있도록 하는 것이 목적이다.

## 사용법

```
/sd-readme [패키지명]
/sd-readme              ← npm 배포 대상 전체 패키지
/sd-readme solid        ← packages/solid 만
```

## Step 1: 대상 패키지 결정

### 1-1. 패키지명을 지정한 경우

`packages/{패키지명}/package.json`이 존재하는지 확인한다. 없으면 사용자에게 알린다.
이 경우 root README.md는 **생성하지 않는다** (개별 패키지만 대상).

### 1-2. 패키지명을 지정하지 않은 경우

`packages/` 하위의 모든 패키지를 탐색하여, `package.json`에 `private: true`가 **없는** 패키지만 대상으로 한다.
이 경우 패키지별 README.md와 함께 **root README.md도 생성한다**.

### 1-3. 대상 목록 표시

```
대상 패키지:
1. @simplysm/core-common (src 35파일)
2. @simplysm/solid (src 126파일)
...
```

## Step 2: 엔트리포인트 & Export 체인 추적

각 패키지에 대해 다음을 수행한다.

### 2-1. 엔트리포인트 찾기

`package.json`의 `main` 또는 `exports` 필드에서 엔트리포인트 경로를 읽는다.
`dist/` 경로이면 `src/`로 변환하고 확장자를 소스 확장자(`.ts`, `.tsx`)로 변환한다.

```
main: "./dist/index.js" → src/index.ts (또는 src/index.tsx)
```

엔트리포인트 파일이 존재하지 않으면 사용자에게 알리고 해당 패키지를 건너뛴다.

### 2-2. Export 체인 재귀 추적

엔트리포인트 파일을 Read 도구로 읽고, 아래 패턴을 추적한다:

| 패턴 | 처리 |
|------|------|
| `export * from "./path"` | 해당 파일을 재귀적으로 읽어 모든 export를 수집 |
| `export * as name from "./path"` | namespace export로 기록하고, 해당 파일의 export를 수집 |
| `export { A, B } from "./path"` | 명시된 항목만 수집 |
| `export class/function/type/interface/const/enum` | 직접 export로 기록 |
| `import "./path"` (side-effect import) | 부수효과 모듈로 기록 (prototype extension 등) |

추적 시 상대 경로를 실제 파일 경로로 변환한다. 확장자가 생략된 경우 `.ts`, `.tsx`, `/index.ts`, `/index.tsx` 순서로 탐색한다.

### 2-3. 카테고리 수집

엔트리포인트 파일의 `//#region {name}` ~ `//#endregion` 주석을 파싱하여 카테고리를 수집한다.
region 주석이 없으면, re-export되는 파일의 디렉토리 구조를 카테고리로 사용한다.

### 2-4. API 정보 수집

추적된 각 소스 파일을 Read 도구로 읽어, export된 항목의 정보를 수집한다:

- **이름**: export 식별자
- **종류**: class, function, type, interface, const, enum
- **시그니처**: 타입 파라미터, 매개변수, 반환 타입
- **JSDoc**: `/** ... */` 주석이 있으면 설명으로 활용
- **카테고리**: 2-3에서 수집한 region 또는 디렉토리 기반

파일 수가 많으면(20개 이상) Agent 도구로 파일 그룹별 병렬 분석을 수행한다.

## Step 3: 분량 판단 & 문서 구조 결정

수집된 API 항목 수와 카테고리 수로 문서 구조를 결정한다.

| 조건 | 문서 구조 |
|------|-----------|
| 카테고리 3개 이하 **그리고** API 항목 30개 이하 | README 단독 |
| 위 조건에 해당하지 않음 | README.md (개요+목차) + docs/ (카테고리별 분할) |

판단 결과를 사용자에게 표시한다:

```
@simplysm/solid: 12 카테고리, 195 API 항목 → README.md + docs/ 분할
@simplysm/storage: 2 카테고리, 8 API 항목 → README.md 단독
```

## Step 4: 문서 생성

**작성 원칙:**
- **영어로 작성**한다
- **소스에서 읽은 내용만** 문서화한다 — 시그니처는 직접 복사하고, 존재하지 않는 파라미터·반환 타입·동작을 만들어내지 않는다
- **모든 export를 빠짐없이 문서화한다** — Step 2에서 수집한 export 목록의 모든 항목이 문서에 포함되어야 한다. "덜 중요하다"는 이유로 생략하지 않는다
- **interface/type은 필드별 설명 테이블을 포함한다** — 시그니처만 나열하지 않고, 각 필드의 타입과 설명을 테이블로 작성한다. 소스에 필드가 있는 interface를 빈 `{}`로 표시하는 것은 금지한다 — 필드가 많더라도 모든 필드를 테이블로 나열한다
- **union type은 discriminant와 각 variant를 설명한다** — discriminated union인 경우, 어떤 필드로 분기되는지와 각 variant를 나열한다

### 4-1. README.md 생성 (모든 패키지)

```markdown
# @simplysm/{package-name}

{package.json의 description. 없으면 엔트리포인트의 export 구조에서 추론하여 한 줄 요약}

## Installation

\`\`\`bash
npm install @simplysm/{package-name}
\`\`\`

## API Overview

{README 단독인 경우: 카테고리별로 API 전체 나열 — 4-2 형식과 동일}
{docs/ 분할인 경우: 카테고리별 요약 테이블 + docs/ 링크}

### {Category Name}

| API | Type | Description |
|-----|------|-------------|
| `FunctionName` | function | {JSDoc 첫 줄 또는 시그니처 기반 요약} |
| `ClassName` | class | {요약} |

{docs/ 분할인 경우 각 카테고리 끝에:}
→ See [docs/{category}.md](./docs/{category}.md) for details.

## Usage Examples

{주요 API 1~3개에 대한 사용 예제. 소스 코드의 JSDoc @example이 있으면 활용.
없으면 시그니처를 기반으로 최소한의 사용 예제를 작성.}
```

### 4-2. docs/*.md 생성 (분할 대상 패키지만)

카테고리별로 `packages/{name}/docs/{category}.md`를 생성한다. 파일명은 카테고리를 kebab-case로 변환한다.

```markdown
# {Category Name}

## `ExportName`

{JSDoc 설명. 없으면 시그니처에서 추론한 한 줄 설명.}

\`\`\`typescript
{export 시그니처 — 소스에서 직접 복사}
\`\`\`

{class인 경우: public 메서드/프로퍼티 목록}
{function인 경우: 파라미터 + 반환 타입 설명}
{interface인 경우: 필드별 설명 테이블}

| Field | Type | Description |
|-------|------|-------------|
| `fieldName` | `type` | {필드 설명} |

{union type인 경우: discriminant 필드와 각 variant 나열}
```

### 4-3. root README.md 생성 (패키지명 미지정 시)

모든 패키지 README 생성 후 monorepo 루트에 README.md를 생성한다.

```markdown
# {monorepo 프로젝트명}

{루트 package.json의 description. 없으면 monorepo의 패키지 구성에서 추론하여 한 줄 요약}

## Packages

| Package | Description |
|---------|-------------|
| [`@simplysm/{name}`](./packages/{name}) | {package.json의 description} |
| ... | ... |
```

**작성 규칙:**
- `private: true`인 패키지는 테이블에서 **제외**한다
- 패키지명은 해당 패키지 디렉토리로의 상대 링크를 포함한다

### 4-4. 완전성 검증

문서 생성 후, Step 2에서 수집한 export 목록과 생성된 문서를 대조한다:

1. export 목록의 각 항목이 README.md 또는 docs/*.md에 존재하는지 확인한다
2. 누락된 항목이 있으면 해당 API를 문서에 추가한다
3. 검증 결과를 표시한다:

```
완전성 검증: 52/52 API 문서화됨
```

누락이 있는 경우:

```
완전성 검증: 50/52 API 문서화됨
누락: MissingType, MissingFunction
→ 누락된 API를 문서에 추가합니다.
```

## Step 5: package.json files 필드 동기화

각 대상 패키지의 `package.json`을 읽어 `files` 배열을 docs/ 존재 여부에 맞게 동기화한다.

| 조건 | 처리 |
|------|------|
| docs/ 분할로 생성됨 **그리고** `files`에 `"docs"` 없음 | `"docs"`를 `files` 배열에 추가 |
| README 단독으로 생성됨 **그리고** `files`에 `"docs"` 있음 | `files` 배열에서 `"docs"` 제거 |
| 그 외 (이미 일치하거나 `files` 필드 자체가 없음) | 변경 없음 |

## Step 6: 결과 보고

```markdown
## sd-readme 결과

| 패키지 | 구조 | API 항목 수 | 생성 파일 |
|--------|------|-------------|-----------|
| @simplysm/core-common | README + docs/ | 52 | README.md, docs/types.md, docs/utils.md, ... |
| @simplysm/storage | README 단독 | 8 | README.md |

### 생성된 파일 목록
- README.md (root — 패키지명 미지정 시)
- packages/core-common/README.md
- packages/core-common/docs/types.md
- ...

### package.json files 변경
- packages/core-common/package.json: `"docs"` 추가
- packages/storage/package.json: `"docs"` 제거
```
