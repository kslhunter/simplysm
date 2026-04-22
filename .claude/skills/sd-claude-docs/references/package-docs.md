# package-docs: 단일 패키지 문서 생성 지침

subagent가 한 패키지 경로를 받아 해당 패키지의 **CLAUDE.md**와 (private 패키지가 아니면) **README.md + docs/**를 생성·갱신한다. subagent는 이 한 파일만 읽으면 두 산출물을 모두 생성할 수 있다.

## 공통 규칙

### 작성 원칙

- **대화언어로 작성**한다. "적절히", "필요에 따라", "상황에 따라" 같은 모호한 표현을 사용하지 않는다.
- **소스에서 읽은 내용만** 문서화한다 — 시그니처는 직접 복사하고, 존재하지 않는 파라미터·반환 타입·동작을 만들어내지 않는다 (hallucination 금지).
- **기존 문서의 시그니처를 신뢰하지 않는다** — 기존 README.md/docs/**/*.md의 코드블록(시그니처·멤버 이름·타입·required 유무 등)을 그대로 재사용하지 않는다. 반드시 소스를 Read하여 확인한 내용만 작성한다.

### 병합 규칙

기존 문서가 있으면 섹션(`##` 제목) 단위로 비교한다.

1. 동일 주제의 기존 섹션 → 새 콘텐츠로 **대체**
2. 대응 섹션이 없는 기존 섹션 → 그대로 **보존**
3. 기존 섹션 위치를 유지하고, 새 섹션은 마지막 기존 섹션 **뒤에** 추가

### 소스 분석 공유

CLAUDE.md의 "Key Patterns"와 README/docs의 "API 문서"는 동일한 소스 코드 분석에서 파생된다. 전달받은 **소스 병합 파일**을 Read하여 전체 소스를 한번에 파악하고, 두 산출물에 모두 활용한다. 추가 정보가 필요한 경우(다른 패키지의 타입 정의 등)에만 개별 Read를 수행한다.

## CLAUDE.md 생성

출력 경로: `{패키지 경로}/CLAUDE.md`

### 최상단 안내 문구

`private: true`가 아닌 패키지인 경우, 제목(`# CLAUDE.md`) 바로 아래에 아래 인용 블록을 삽입한다. 이미 존재하면 갱신하지 않고 그대로 둔다.

```markdown
> 이 패키지의 사용법 및 지침은 [README.md](./README.md) 및 [docs/](./docs/)를 참조한다.
```

`private: true` 패키지는 이 문구를 삽입하지 않는다 (README.md/docs/가 생성되지 않으므로).

### 분석 대상

1. `package.json` — 이름, 설명, dependencies (Read)
2. `tsconfig.json` — 패키지 고유 컴파일러 옵션 (Read)
3. **소스 병합 파일** — 전달받은 경로를 Read하여 전체 소스를 한번에 분석. `=== 파일경로 ===` 구분자로 파일 경계를 식별하며, 디렉토리 구조·반복 패턴·export 체인·API 정보를 모두 이 파일에서 파악한다
4. 테스트 디렉토리 (존재 시) — Glob으로 구조 확인 후 대표 파일 1~2개만 Read
5. 추가 정보 필요 시 (다른 패키지의 타입 정의 등) — 개별 Read

### 포함할 섹션

- **Package Overview**: 패키지명, 한 줄 설명, 소스 파일 수
- **Architecture**: `src/` 하위 디렉토리 트리, 각 디렉토리의 역할 설명
- **Key Patterns**: 소스 코드에서 반복되는 패턴을 코드 예시와 함께 기술. 패턴이 여러 개면 하위 섹션(`###`)으로 분리
- **Testing**: 테스트 디렉토리가 있으면 테스트 구조·패턴·규칙 기술. 없으면 섹션 생략
- 그 외 패키지 고유 정보 (예: 스타일링, 컴파일러 설정)

### 제외할 내용

아래는 루트 CLAUDE.md에만 포함한다. 패키지 CLAUDE.md에 반복하지 않는다:

- 명령어 (pnpm scripts)
- 프로젝트 전체 코딩 규칙 (lint, prettier 등)
- 패키지 매니저 정보
- 프로젝트 전체 기술 스택
- 루트와 동일한 컴파일러/빌드 설정 — 패키지에만 **고유한** 설정만 기술한다

subagent 프롬프트에서 전달받은 "루트 수준 설정" 목록과 중복되는 내용은 반복하지 않는다.

### 예시

````markdown
# CLAUDE.md

> 이 패키지의 사용법 및 지침은 [README.md](./README.md) 및 [docs/](./docs/)를 참조한다.

## Package Overview

`@scope/package-name` — 한 줄 설명. 42 TypeScript 소스 파일 (core + utilities).

## Architecture

```
src/
├── core/         ← 핵심 로직: services(5), models(3)
├── utils/        ← 유틸리티 함수
└── index.ts      ← public API re-exports
```

### Bootstrap

`initialize()` (`core/init.ts`)이 기반을 설정:
- 설정 로드
- 서비스 등록

## Key Patterns

### Service Structure

모든 서비스가 따르는 공통 패턴:

```typescript
@Injectable()
export class FooService {
  private readonly config = inject(ConfigProvider);

  async execute(input: FooInput): Promise<FooOutput> {
    // ...
  }
}
```

### Utility Functions

`src/utils/`의 순수 함수들. 사이드 이펙트 없음:
- `transformX()` — X 데이터 변환
- `validateY()` — Y 유효성 검증

## Testing

**프레임워크**: Vitest

테스트 디렉토리가 src 구조를 미러링: `tests/core/`, `tests/utils/`

```typescript
describe("FooService", () => {
  it("should ...", () => {
    const svc = new FooService(mockConfig);
    expect(svc.execute(input)).resolves.toEqual(expected);
  });
});
```
````

## README.md + docs/ 생성

**`private: true` 패키지는 이 섹션 전체를 건너뛴다.**

출력 경로: `{패키지 경로}/README.md` (분할 구조면 `{패키지 경로}/docs/{category}/{entry}.md` 트리 추가).

**wiki 스타일 원칙:** 각 export된 class/component/함수(Entry)는 자체 md 파일로 분리한다. README.md는 카테고리별 Entry 인덱스(링크) 역할에 집중하고, 상세 설명은 각 Entry 파일에 둔다. 소비자(특히 LLM)가 필요한 Entry 파일 하나만 조회하여 사용할 수 있게 하는 것이 목적이다.

### 엔트리포인트 찾기

`package.json`의 `main` 또는 `exports` 필드에서 엔트리포인트 경로를 읽는다.
`dist/` 경로이면 `src/`로 변환하고 확장자를 소스 확장자(`.ts`, `.tsx`)로 변환한다.

```
main: "./dist/index.js" → src/index.ts (또는 src/index.tsx)
```

엔트리포인트 파일이 존재하지 않으면 사용자에게 알리고 README.md/docs/ 생성을 건너뛴다.

### Export 체인 재귀 추적

소스 병합 파일 내에서 엔트리포인트 파일(`=== {경로} ===` 구분자로 식별)을 찾고, 아래 패턴을 추적한다:

| 패턴 | 처리 |
|------|------|
| `export * from "./path"` | 병합 파일 내 해당 파일 섹션에서 모든 export 수집 |
| `export * as name from "./path"` | namespace export로 기록하고, 해당 파일의 export 수집 |
| `export { A, B } from "./path"` | 명시된 항목만 수집 |
| `export class/function/type/interface/const/enum` | 직접 export로 기록 |
| `import "./path"` (side-effect import) | 부수효과 모듈로 기록 (prototype extension 등) |

상대 경로를 병합 파일 내 파일 경로와 매칭한다. 확장자 생략 시 `.ts`, `.tsx`, `/index.ts`, `/index.tsx` 순서로 탐색한다.

### 카테고리 수집

엔트리포인트 파일의 `//#region {name}` ~ `//#endregion` 주석을 파싱하여 카테고리를 수집한다. region 주석이 없으면 re-export되는 파일의 디렉토리 구조를 카테고리로 사용한다.

### API 정보 수집

소스 병합 파일에서 추적된 각 파일의 export 항목 정보를 수집한다:

- **이름**: export 식별자
- **종류**: class, function, type, interface, const, enum
- **시그니처**: 타입 파라미터, 매개변수, 반환 타입
- **JSDoc**: `/** ... */` 주석이 있으면 설명으로 활용
- **카테고리**: 위에서 수집한 region 또는 디렉토리 기반

### Entry 그룹핑 (wiki 페이지 단위)

수집된 export를 **Entry**(= 분할 시 1개 md 파일이 되는 단위)로 그룹핑한다. Entry는 LLM이 wiki 페이지 하나처럼 조회할 수 있는 최소 응집 단위다.

**그룹핑 규칙 (위에서부터 순차 적용):**

1. **Anchor 선정**: export된 class/component/directive/대표 함수를 anchor로 삼는다. Anchor 하나당 Entry 1개.
2. **Prefix 매칭으로 흡수**: anchor 이름(또는 `I`·`T` 접두사를 제거한 식별자)으로 **시작하는 이름**을 가진 interface/type/enum/const는 해당 anchor Entry에 흡수된다.
   - 예: anchor `FtpStorage` → `FtpStorageConfig`, `FtpStorageOption`, `TFtpStorageMode`, `IFtpStorageEntry`, `FTP_STORAGE_*` 상수 모두 같은 Entry
3. **Anchor 시그니처 참조 타입 흡수**: anchor의 public 멤버(파라미터/반환 타입/프로퍼티 타입)에서 참조되며 **다른 anchor에서는 참조되지 않는** 타입은 해당 anchor Entry에 흡수된다.
4. **Standalone Entry**: 어느 anchor에도 흡수되지 않은 export(독립 함수, 공용 interface, 독립 상수 등)는 각자 1개의 Entry가 된다.
5. **유틸 클러스터**: 상호 참조가 강한 유틸 타입 쌍(예: `DateTime`·`DateOnly`·`Time`처럼 3개 이하가 서로를 타입 매개변수로 사용하는 경우)은 알파벳순 첫 항목을 anchor로 삼아 하나의 Entry로 묶는다.

**Entry 정보:**

- `name`: anchor 식별자 (예: `DbContext`, `FtpStorage`)
- `kebabName`: 파일명용 kebab-case (예: `db-context`, `ftp-storage`). standalone Entry는 해당 export 이름을 kebab-case로 변환
- `category`: 위에서 수집한 카테고리
- `kind`: anchor의 종류 (class/component/directive/function/interface/type/const/enum)
- `members`: 이 Entry에 포함된 모든 export 목록

### 스타일 에셋 분석

`package.json`에 `style` 필드가 있거나 `files` 배열에 `"scss"`가 포함된 경우에만 수행한다. 둘 다 아니면 건너뛴다.

소스 병합 파일에 `scss/**/*.scss` 파일이 포함되어 있으므로, 병합 파일 내에서 분석한다.

**SCSS 파일 탐색**: 병합 파일 내 `scss/` 경로의 엔트리포인트(`scss/styles.scss` 등)부터 `@use`/`@forward` 체인을 따라 모든 SCSS 파일을 수집한다.

**스타일 API 수집** (병합 파일 내 SCSS 파일에서):

| 항목 | 추출 대상 | 예시 |
|------|-----------|------|
| CSS 클래스 | 최상위 선택자로 정의된 클래스 (컴포넌트 내부 중첩 제외) | `.flex-row`, `.flex-fill` |
| CSS 커스텀 프로퍼티 | `:root` 또는 테마 클래스에서 선언된 `--*` 변수 | `--color-primary`, `--font-size` |
| 테마 | 테마 전환 클래스(프로젝트 네이밍 관례에 따름)와 해당 클래스가 오버라이드하는 변수 목록 | `.theme-dark`, `.sd-theme-*` 등 |
| 공개 mixin/function | `@mixin`, `@function` 중 `_`로 시작하지 않는 것 | `@mixin flex-direction($dir)` |

카테고리 "Styling"으로 분류하고 하위 분류(Classes, CSS Custom Properties, Themes, Mixins)로 나눈다.

### 분량 판단 & 문서 구조 결정

수집된 Entry 수와 카테고리 수로 구조를 결정한다. 스타일 항목은 카테고리 `styling` 하나로 계산한다.

| 조건 | 구조 |
|------|------|
| 카테고리 1개 **그리고** Entry 10개 이하 | README.md 단독 |
| 그 외 | README.md (개요+카테고리 인덱스) + `docs/{category}/{entry}.md` (entry별 1 파일) |

**분할 구조 원칙:** wiki 스타일을 목표로 한다. 각 Entry는 해당 anchor 1개에만 집중한 md 파일이 되며, 카테고리는 **서브디렉토리**로만 표현된다 (카테고리 파일 `docs/{category}.md`을 만들지 않는다).

### 문서 작성 원칙

- **기존 문서가 없으면** 분석 결과로 신규 작성. **있으면** `docs/` 하위 모든 파일(서브디렉토리 포함)을 읽어 분석 결과 기준으로 정합성을 맞춘다.
- **소스와 무관한 내용(사용 가이드, 주의사항, 규칙 등)은 보존**이 원칙이되, 현재 소스 및 산출물과 상충하면(없어진 API 언급, 옛 동작 기준 설명, 더 이상 유효하지 않은 규칙, 산출물 문서 링크 등) 소스 및 산출물 기준으로 수정한다.
- **모든 export를 빠짐없이 문서화**한다 — 수집한 export 목록의 모든 항목이 문서에 포함되어야 한다. "덜 중요하다"는 이유로 생략하지 않는다.
- **interface/type은 필드별 설명 테이블을 포함**한다 — 시그니처만 나열하지 않고 각 필드의 타입과 설명을 테이블로 작성한다. 소스에 필드가 있는 interface를 빈 `{}`로 표시하는 것은 금지한다.
- **union type은 discriminant와 각 variant를 설명**한다 — discriminated union인 경우 어떤 필드로 분기되는지와 각 variant를 나열한다.

### README.md 형식

README.md는 **인덱스** 역할에 집중한다. 분할 구조에서는 각 Entry의 상세를 README에 복사하지 않고 링크만 제공한다.

```markdown
# {package-name}

{package.json의 description. 없으면 엔트리포인트의 export 구조에서 추론한 한 줄 요약}

## Installation

\`\`\`bash
npm install {package-name}
\`\`\`

## API Overview

{README 단독인 경우: 카테고리별로 모든 Entry를 Entry 형식으로 인라인 포함 (docs/는 생성하지 않음)}
{분할 구조인 경우: 카테고리별 Entry 인덱스 테이블만, 각 row가 해당 entry md 파일로 직접 링크}

### {Category Name}

| Entry | Kind | Description |
|-------|------|-------------|
| [`DbContext`](./docs/{category}/db-context.md) | class | {한 줄 요약} |
| [`FtpStorage`](./docs/{category}/ftp-storage.md) | class | {한 줄 요약} |
| [`formatNumber`](./docs/{category}/format-number.md) | function | {한 줄 요약} |

{카테고리 끝에 별도 "See details" 링크를 두지 않는다 — 테이블 row 자체가 링크다.}

{스타일 항목이 수집된 경우:}
### Styling

| Entry | Description |
|-------|-------------|
| [CSS Classes](./docs/styling/classes.md) | 레이아웃·유틸리티 클래스 목록 |
| [CSS Custom Properties](./docs/styling/variables.md) | 디자인 토큰 변수 |
| [Themes](./docs/styling/themes.md) | 테마 전환 클래스 |
| [Mixins / Functions](./docs/styling/mixins.md) | 공개 SCSS mixin/function |

{README 단독인 경우: 위 테이블 대신 스타일 전체 목록을 인라인으로 포함}

## Usage Examples

{대표 Entry 1~3개에 대한 사용 예제. JSDoc @example이 있으면 활용. 없으면 시그니처 기반 최소 예제.
상세 예제는 각 Entry 문서에 두고, 여기는 "패키지를 처음 접하는 사람을 위한 간단 소개" 수준만 유지한다.}
```

### docs/{category}/{entry}.md 형식 (분할 대상만)

각 Entry마다 `{패키지 경로}/docs/{category-kebab}/{entry.kebabName}.md`를 1개 생성한다. 카테고리는 서브디렉토리로 매핑한다.

**파일 구성 원칙:**

- Entry에 포함된 모든 export(anchor + 흡수된 interface/type/enum/const)를 한 파일에서 문서화한다
- anchor를 파일 맨 위에 둔다. 그 다음 관련 타입/상수/예제 순으로 배치
- 다른 Entry 심볼 언급 시 백틱 식별자 또는 상대 링크(`[\`OtherEntry\`](../{category}/other-entry.md)`)를 사용한다. 정의를 이 파일에 복사하지 않는다

```markdown
# {EntryName}

{anchor JSDoc 설명. 없으면 시그니처 기반 한 줄 요약.}

\`\`\`typescript
{anchor 시그니처 — 소스에서 직접 복사}
\`\`\`

{anchor가 class/component인 경우: public 멤버 목록 테이블.
Kind 열은 패키지에 맞는 용어를 사용한다 — 일반 class는 `property`/`getter`/`method`/`static`,
Angular 컴포넌트는 추가로 `input`/`input (required)`/`output`/`model`/`signal`/`computed` 등}

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `host` | property | `string` | ... |
| `connected` | getter | `boolean` | ... |
| `connect` | method | `(opt: Option) => Promise<void>` | ... |

{anchor가 function인 경우: 파라미터 + 반환 타입 설명}

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `input` | `...` | ... |

## Returns

`ReturnType` — ...

## Related Types

{Entry에 흡수된 interface/type/enum/const를 각각 섹션으로 나열}

### `FtpStorageConfig`

\`\`\`typescript
{시그니처}
\`\`\`

| Field | Type | Description |
|-------|------|-------------|
| `fieldName` | `type` | ... |

### `TFtpStorageMode`

{union type인 경우: discriminant 필드와 각 variant 나열}

## Usage

\`\`\`typescript
{JSDoc @example 또는 시그니처 기반 최소 예제}
\`\`\`
```

**표시 규칙:**

- anchor와 흡수된 타입 모두 `##` 또는 `###` 섹션으로 반드시 노출한다. interface 필드가 많다고 `{}`로 축약하지 않는다
- 비어 있는 섹션(예: 멤버 없음)은 생략한다

### Styling 분할 구조 (`docs/styling/*.md`)

스타일 항목이 수집된 경우, 아래 4개 파일로 분할하여 생성한다. 모두 `docs/styling/` 서브디렉토리에 둔다.

- `docs/styling/classes.md` — 전역 CSS 클래스 목록
- `docs/styling/variables.md` — CSS 커스텀 프로퍼티
- `docs/styling/themes.md` — 테마 클래스와 각 테마가 오버라이드하는 변수
- `docs/styling/mixins.md` — 공개 SCSS mixin / function

각 파일 형식:

```markdown
<!-- classes.md -->
# CSS Classes

| Class | Description |
|-------|-------------|
| `.flex-row` | {설명} |

<!-- variables.md -->
# CSS Custom Properties

| Property | Default | Description |
|----------|---------|-------------|
| `--color-primary` | `#...` | {설명} |

<!-- themes.md -->
# Themes

## `.theme-dark` (또는 프로젝트 네이밍 관례의 테마 클래스)

{설명 + 오버라이드 변수 목록 테이블}

<!-- mixins.md -->
# Mixins / Functions

| Name | Signature | Description |
|------|-----------|-------------|
| `flex-direction` | `@mixin flex-direction($dir)` | {설명} |
```

README 단독 구조이면 위 4개 섹션을 README의 `## Styling` 하위에 인라인으로 포함하고, `docs/styling/` 서브디렉토리는 만들지 않는다.

### 이전 구조 잔여 파일 정리

분할 구조 전환으로 더 이상 유효하지 않은 **레이아웃 파일만** 정리한다. 이 단계는 파일 레이아웃(구조)만 다루며, 내용의 정합성은 다음 "완전성 및 정확성 검증" 단계에서 처리한다.

1. 이전 구조(`docs/{category}.md` 단일 파일)에서 wiki 구조(`docs/{category}/{entry}.md` 트리)로 전환되면서 더 이상 쓰이지 않는 **카테고리 단위 단일 파일**(예: `docs/utils.md`, `docs/pipes.md`, `docs/drivers.md` 등 카테고리가 디렉토리가 아닌 단일 md로 남은 경우)이 있으면 삭제한다.
2. 이전에 styling이 단일 파일(`docs/styling.md`)이었고 이번 실행에서 분할 구조(`docs/styling/*.md`)로 전환되면 이전 `docs/styling.md`를 삭제한다. 반대로 README 단독 구조로 전환되어 `docs/styling/` 서브디렉토리가 불필요해지면 해당 서브디렉토리를 삭제한다.
3. `docs/` 하위의 그 외 파일(현재 Entry 파일, recipe, 가이드 등)은 이 단계에서 삭제하지 않는다. 이들의 존속 여부는 다음 검증 단계 결과에 따라 결정된다.

### 완전성 및 정확성 검증

문서 작업 후, 수집한 export 목록과 `docs/` 하위 **모든 파일**(자동 생성 Entry 파일·styling 파일·recipe·가이드 등 수동 작성물 전부 포함) 및 README.md를 대조한다. 자동 생성물과 수동 작성물에 **동일한 정합성 규칙**을 적용한다.

#### 완전성

1. export 목록의 각 항목이 README.md 또는 `docs/` 하위 어느 파일(서브디렉토리 포함)에 존재하는지 확인
2. 누락된 항목이 있으면 해당 API를 문서에 추가
3. 문서에 있는 심볼 참조 중 **현재 export에 없는 것**(제거·이름 변경된 API)은 소스 기준으로 수정하거나 제거
4. **주제 자체가 소멸한 문서는 파일 통째로 삭제**: recipe·가이드·사용 예시처럼 특정 API 중심으로 작성된 파일의 경우, 해당 문서가 다루는 핵심 주제(제목·첫 문단·코드 예제에서 중심이 되는 anchor 심볼)가 현재 export에서 **전부 사라졌다면** 파일 내 심볼 참조를 하나씩 고치는 대신 **파일 자체를 삭제**한다. 주제가 일부만 바뀐 경우(일부 API만 사라짐)에는 내용을 수정하고 파일은 유지한다.
5. **README의 Entry 인덱스 링크 무결성**: 모든 `[...](./docs/...)` 링크의 대상 파일이 실제로 존재하는지 확인. 깨진 링크는 수정하거나 제거 (4번에서 파일이 삭제된 경우 해당 링크도 제거)

#### 정확성

문서의 각 API 항목에 대해, 소스 병합 파일 내 해당 소스를 다시 확인하여 아래 항목을 대조한다:

| 검증 항목 | 확인 내용 |
|-----------|-----------|
| 클래스/함수명 | 제네릭 파라미터 포함 일치 여부 |
| 멤버 이름 | property/getter/setter/method 및 프레임워크 특수 멤버(Angular `input`/`output`/`model`/`signal`/`computed` 등) 이름 일치 여부 |
| 멤버 종류 | 멤버가 어떤 종류인지 구분 정확성 (패키지에 해당하는 용어로) |
| 타입 | 파라미터 타입, 반환 타입 일치 여부 |
| required/optional | 필수/선택 구분 정확성 (Angular `input()` vs `input.required()`, interface의 `?` 유무 등) |
| 기본값 | 기본값이 있는 경우 정확한 값 |

불일치가 발견되면 **소스 코드를 기준으로** 문서를 수정한다.

#### 검증 결과 표시

```
완전성 검증: 52/52 API 문서화됨
정확성 검증: 52/52 API 시그니처 일치
```

불일치가 있는 경우:

```
완전성 검증: 52/52 API 문서화됨
정확성 검증: 50/52 API 시그니처 일치
불일치: DbContext (tables→repositories 필드명 변경), FtpStorage (port: required→optional)
→ 소스 기준으로 문서를 수정합니다.
```

### package.json `files` 배열 동기화

생성된 `docs/`가 npm publish에 포함되도록 `{패키지 경로}/package.json`의 `files` 배열을 점검한다.

1. `package.json`에 `files` 필드가 없으면 이 단계를 건너뛴다 (npm이 기본으로 전체 파일 포함).
2. `files` 필드가 있으면:
   - 실행 후 `{패키지 경로}/docs/`가 존재하면, `files` 배열에 `"docs"`가 **없을 때 추가**한다.
   - 실행 후 `{패키지 경로}/docs/`가 존재하지 않으면(분량 축소로 단독 구조로 전환되었거나 Step 3 판단으로 `docs/`를 생성하지 않은 경우), `files` 배열에 `"docs"`가 **있을 때 제거**한다.
3. `README.md`는 npm이 `files` 선언과 무관하게 항상 포함하므로 `files`에 추가할 필요가 없다.
