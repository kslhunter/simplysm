# 패키지 문서 생성 프로세스

이 문서는 단일 패키지에 대한 usage.md 및 docs/ 문서 생성 프로세스를 기술한다.
subagent가 패키지 경로와 출력 경로(`.claude/references/sd-{name}{ver}/{패키지명}/`)를 전달받아 아래 순서대로 수행한다.

## Step 2: 엔트리포인트 & Export 체인 추적

### Step 2-1: 엔트리포인트 찾기

`package.json`의 `main` 또는 `exports` 필드에서 엔트리포인트 경로를 읽는다.
`dist/` 경로이면 `src/`로 변환하고 확장자를 소스 확장자(`.ts`, `.tsx`)로 변환한다.

```
main: "./dist/index.js" → src/index.ts (또는 src/index.tsx)
```

엔트리포인트 파일이 존재하지 않으면 사용자에게 알리고 해당 패키지를 건너뛴다.

### Step 2-2: Export 체인 재귀 추적

엔트리포인트 파일을 Read 도구로 읽고, 아래 패턴을 추적한다:

| 패턴 | 처리 |
|------|------|
| `export * from "./path"` | 해당 파일을 재귀적으로 읽어 모든 export를 수집 |
| `export * as name from "./path"` | namespace export로 기록하고, 해당 파일의 export를 수집 |
| `export { A, B } from "./path"` | 명시된 항목만 수집 |
| `export class/function/type/interface/const/enum` | 직접 export로 기록 |
| `import "./path"` (side-effect import) | 부수효과 모듈로 기록 (prototype extension 등) |

추적 시 상대 경로를 실제 파일 경로로 변환한다. 확장자가 생략된 경우 `.ts`, `.tsx`, `/index.ts`, `/index.tsx` 순서로 탐색한다.

### Step 2-3: 카테고리 수집

엔트리포인트 파일의 `//#region {name}` ~ `//#endregion` 주석을 파싱하여 카테고리를 수집한다.
region 주석이 없으면, re-export되는 파일의 디렉토리 구조를 카테고리로 사용한다.

### Step 2-4: API 정보 수집

추적된 각 소스 파일을 Read 도구로 읽어, export된 항목의 정보를 수집한다:

- **이름**: export 식별자
- **종류**: class, function, type, interface, const, enum
- **시그니처**: 타입 파라미터, 매개변수, 반환 타입
- **JSDoc**: `/** ... */` 주석이 있으면 설명으로 활용
- **카테고리**: 2-3에서 수집한 region 또는 디렉토리 기반

파일 수가 많으면(20개 이상) Agent 도구로 파일 그룹별 병렬 분석을 수행한다.

## Step 2B: 스타일 에셋 분석

`package.json`에 `style` 필드가 있거나, `files` 배열에 `"scss"`가 포함되어 있으면 이 단계를 수행한다. 둘 다 해당하지 않으면 건너뛴다.

### Step 2B-1: SCSS 파일 탐색

`scss/` 디렉토리의 엔트리포인트(`scss/styles.scss` 등)부터 `@use`/`@forward` 체인을 따라가며 모든 SCSS 파일을 수집한다.

### Step 2B-2: 스타일 API 수집

수집된 SCSS 파일을 Read 도구로 읽어, 아래 항목을 추출한다:

| 항목 | 추출 대상 | 예시 |
|------|-----------|------|
| CSS 클래스 | 최상위 선택자로 정의된 클래스 (컴포넌트 내부 중첩 제외) | `.flex-row`, `.flex-fill` |
| CSS 커스텀 프로퍼티 | `:root` 또는 테마 클래스에서 선언된 `--*` 변수 | `--color-primary`, `--font-size` |
| 테마 | `.sd-theme-*` 등 테마 전환 클래스와 해당 클래스가 오버라이드하는 변수 목록 | `.sd-theme-dark` |
| 공개 mixin/function | `@mixin`, `@function` 중 `_`로 시작하지 않는 것 (사용자가 `@use`로 호출 가능) | `@mixin flex-direction($dir)` |

각 항목은 카테고리 "Styling"으로 분류하고, 하위 분류(Classes, CSS Custom Properties, Themes, Mixins)로 나눈다.

## Step 3: 분량 판단 & 문서 구조 결정

수집된 API 항목 수와 카테고리 수로 문서 구조를 결정한다. Step 2B에서 수집된 스타일 항목도 카테고리·항목 수에 포함한다.

| 조건 | 문서 구조 |
|------|-----------|
| 카테고리 3개 이하 **그리고** API 항목 30개 이하 | usage 단독 |
| 위 조건에 해당하지 않음 | usage.md (개요+목차) + docs/ (카테고리별 분할) |

## Step 4: 문서 생성

### 작성 원칙

- **대화언어로 작성**한다
- **소스에서 읽은 내용만** 문서화한다 — 시그니처는 직접 복사하고, 존재하지 않는 파라미터·반환 타입·동작을 만들어내지 않는다
- **모든 export를 빠짐없이 문서화한다** — Step 2에서 수집한 export 목록의 모든 항목이 문서에 포함되어야 한다. "덜 중요하다"는 이유로 생략하지 않는다
- **interface/type은 필드별 설명 테이블을 포함한다** — 시그니처만 나열하지 않고, 각 필드의 타입과 설명을 테이블로 작성한다. 소스에 필드가 있는 interface를 빈 `{}`로 표시하는 것은 금지한다 — 필드가 많더라도 모든 필드를 테이블로 나열한다
- **union type은 discriminant와 각 variant를 설명한다** — discriminated union인 경우, 어떤 필드로 분기되는지와 각 variant를 나열한다

### Step 4-1: usage.md 생성

출력 경로: `.claude/references/sd-{name}{ver}/{패키지명}/usage.md`

```markdown
# @simplysm/{package-name}

{package.json의 description. 없으면 엔트리포인트의 export 구조에서 추론하여 한 줄 요약}

## Installation

\`\`\`bash
npm install @simplysm/{package-name}
\`\`\`

## API Overview

{usage 단독인 경우: 카테고리별로 API 전체 나열 — 4-2 형식과 동일}
{docs/ 분할인 경우: 카테고리별 요약 테이블 + docs/ 링크}

### {Category Name}

| API | Type | Description |
|-----|------|-------------|
| `FunctionName` | function | {JSDoc 첫 줄 또는 시그니처 기반 요약} |
| `ClassName` | class | {요약} |

{docs/ 분할인 경우 각 카테고리 끝에:}
→ See [docs/{category}.md](./docs/{category}.md) for details.

{Step 2B에서 스타일 항목이 수집된 경우:}
### Styling

| API | Type | Description |
|-----|------|-------------|
| `.flex-row` | CSS class | {설명} |
| `--color-primary` | CSS custom property | {설명} |
| `.sd-theme-dark` | theme class | {설명} |

{docs/ 분할인 경우:}
→ See [docs/styling.md](./docs/styling.md) for details.

## Usage Examples

{주요 API 1~3개에 대한 사용 예제. 소스 코드의 JSDoc @example이 있으면 활용.
없으면 시그니처를 기반으로 최소한의 사용 예제를 작성.}
```

### Step 4-2: docs/*.md 생성 (분할 대상 패키지만)

카테고리별로 `.claude/references/sd-{name}{ver}/{패키지명}/docs/{category}.md`를 생성한다. 파일명은 카테고리를 영어 kebab-case로 변환한다.

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

#### Styling 카테고리 문서 형식 (docs/styling.md)

Step 2B에서 스타일 항목이 수집된 경우, `{출력 경로}/docs/styling.md`를 아래 형식으로 생성한다:

```markdown
# Styling

## CSS Classes

| Class | Description |
|-------|-------------|
| `.flex-row` | {설명} |
| `.flex-fill` | {설명} |

## CSS Custom Properties

| Property | Default | Description |
|----------|---------|-------------|
| `--color-primary` | `#...` | {설명} |

## Themes

### `.sd-theme-dark`

{테마 설명. 오버라이드하는 변수 목록.}

## Mixins / Functions

| Name | Signature | Description |
|------|-----------|-------------|
| `flex-direction` | `@mixin flex-direction($dir)` | {설명} |
```

### Step 4-4: 완전성 검증

문서 생성 후, Step 2에서 수집한 export 목록과 생성된 문서를 대조한다:

1. export 목록의 각 항목이 usage.md 또는 docs/*.md에 존재하는지 확인한다
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

