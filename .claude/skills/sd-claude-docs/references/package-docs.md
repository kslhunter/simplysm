# package-docs: 단일 패키지 문서 생성 지침

subagent가 한 패키지 경로를 받아 해당 패키지의 **CLAUDE.md**와 (private 패키지가 아니면) **소비자 문서(README.md + _api-index.md + Entry 파일)**를 생성·갱신한다. subagent는 이 한 파일만 읽으면 모든 산출물을 생성할 수 있다.

## LLM 매뉴얼 원칙

이 문서들은 **백과사전(wiki/API reference)이 아니라, 이 패키지를 소비하는 LLM(Claude Code)이 올바른 코드를 한 번에 쓰게 돕는 운영 매뉴얼**이다. 타겟 독자는 `Read` 툴로 md 파일을 로드해 소비자 코드를 작성하는 LLM 에이전트이며, 사람 개발자는 2차 독자다.

**핵심 설계 원리 — 작업 기반 발견성(Task-based Discoverability)**:

LLM은 "모달을 열어야 하는데" "목록 화면을 만들어야 하는데"처럼 **작업(task) 의도**를 갖고 문서에 접근한다. API 이름(`SdModalProvider`)을 미리 아는 경우는 드물다. 따라서:

- **README.md = 작업 라우터**. "하려는 작업 → 읽을 파일" 매핑이 README의 핵심 콘텐츠. API 이름·타입 나열은 README에 두지 않는다.
- **_api-index.md = API 참조 인덱스**. API 이름을 이미 알 때만 사용하는 보조 파일.
- **각 Entry 파일 첫 줄 = "읽어야 하는 상황"**. LLM이 파일을 열자마자 이 파일이 자기 작업에 맞는지 즉시 판단 가능해야 한다.

**우선순위**:

1. **언제 쓰고 언제 쓰지 말아야 하는가** (When to use / When NOT to use)
2. **전형적 호출 형태** (복붙 가능한 최소 예제 1개)
3. **정확한 시그니처** (호출에 필요한 수준까지)
4. **진짜 함정** (소스·JSDoc·테스트에서 확인된 것만. 쥐어짜내서 만들지 않는다)

타입 사전처럼 "모든 필드를 다 채우는 것"이 목표가 아니다. 시그니처는 LLM이 소스에서도 읽을 수 있으므로, 문서는 **소스에 없는 정보**(의도·선택 기준)에 집중한다. **매뉴얼은 "어떻게 해야 하는가"를 알려주는 것이 핵심이다.**

## 공통 규칙

### 작성 원칙

- **대화언어 + 3인칭 서술**. "You can use…", "I can help…" 금지 → "Processes X", "Returns Y" 형태. "적절히", "필요에 따라" 같은 모호한 표현 금지.
- **소스에서 읽은 내용만** 문서화한다. 시그니처는 직접 복사하고, 존재하지 않는 파라미터·반환 타입·동작을 만들어내지 않는다 (hallucination 금지).
- **기존 문서의 시그니처를 신뢰하지 않는다**. 기존 README.md 및 출력 경로 하위 Entry 파일의 코드블록을 그대로 재사용하지 않는다. 반드시 소스를 Read하여 확인한 내용만 작성한다.
- **일관된 용어**. 한 Entry 내에서 "Provider / Service / Module", "field / property / member" 같은 유사 용어를 혼용하지 않는다. LLM은 용어 동일성을 구조 신호로 사용한다.
- **상수에 근거**. 예제의 매직 넘버(`timeout: 30000`, `retries: 3` 등)에는 왜 그 값인지 1줄 주석을 단다. 근거 없는 상수는 LLM이 임의 값으로 변조한다.
- **예제는 최소한으로**. 각 요구사항을 충족하는 최소 예제 1개면 충분하다. 불필요하게 부풀리거나 에러 처리·엣지케이스를 억지로 끼워넣지 않는다.

### 병합 규칙

기존 문서가 있으면 섹션(`##` 제목) 단위로 비교한다.

1. 동일 주제의 기존 섹션 → 새 콘텐츠로 **대체**
2. 대응 섹션이 없는 기존 섹션 → 그대로 **보존**
3. 기존 섹션 위치를 유지하고, 새 섹션은 마지막 기존 섹션 **뒤에** 추가

### 소스 분석 공유

CLAUDE.md의 "Key Patterns"와 README/docs의 Entry 문서는 동일한 소스 코드 분석에서 파생된다. 전달받은 **소스 병합 파일**을 Read하여 전체 소스를 한번에 파악하고, 두 산출물에 모두 활용한다. 추가 정보가 필요한 경우(다른 패키지의 타입 정의 등)에만 개별 Read를 수행한다.

## CLAUDE.md 생성

출력 경로: `{패키지 경로}/CLAUDE.md`

### 최상단 안내 문구

`private: true`가 아닌 패키지인 경우, 제목(`# CLAUDE.md`) 바로 아래에 아래 인용 블록을 삽입한다. 이미 존재하면 갱신하지 않고 그대로 둔다. `{패키지명}`은 subagent 프롬프트에서 전달받은 패키지 디렉토리명이다.

```markdown
> 이 패키지의 사용법 및 지침은 `{문서 루트}/{패키지명}/README.md`를 참조한다.
```

`private: true` 패키지는 이 문구를 삽입하지 않는다 (소비자 문서가 생성되지 않으므로).

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

## 소비자 문서 생성

**`private: true` 패키지는 이 섹션 전체를 건너뛴다.**

출력 경로: subagent 프롬프트에서 전달받은 `소비자 문서 출력 경로`를 사용한다 (예: `{문서 루트}/{패키지명}/`). README.md와 _api-index.md는 이 경로의 루트에, Entry 파일은 `{출력 경로}/{category}/{entry}.md`에 생성한다.

### 산출물 구조

| 파일 | 역할 | 대상 독자 상태 |
|------|------|----------------|
| **README.md** | 작업 라우터 — "뭘 하려는데 어느 파일을 읽지?" | 작업 의도는 있지만 API 이름을 모름 |
| **_api-index.md** | API 참조 인덱스 — "이 API의 문서가 어디 있지?" | API 이름을 이미 알고 있음 |
| **{category}/{entry}.md** | Entry 상세 — 시그니처, 예제, anti-pattern | README 또는 _api-index에서 라우팅됨 |

**README는 작업 기반 인덱스에 전념한다.** API 이름·타입·시그니처 나열은 README에 두지 않고 _api-index.md로 분리한다. LLM이 README를 읽을 때 API 목록 노이즈 없이 "내 작업 → 읽을 파일"을 즉시 찾을 수 있어야 한다.

**링크 규칙 (1-level deep)**: README → Entry까지만 링크한다. Entry 파일 본문에서 다른 Entry를 참조할 때는 "간단한 차이점 언급 + 링크"만 두고, 정의·세부 사용법을 그 링크에 떠넘기지 않는다. LLM이 부분 읽기(`offset/limit`)로 잘라 읽을 때 체인이 끊기면 정보가 유실된다.

### 엔트리포인트 찾기

`package.json`의 `main` 또는 `exports` 필드에서 엔트리포인트 경로를 읽는다.
`dist/` 경로이면 `src/`로 변환하고 확장자를 소스 확장자(`.ts`, `.tsx`)로 변환한다.

```
main: "./dist/index.js" → src/index.ts (또는 src/index.tsx)
```

엔트리포인트 파일이 존재하지 않으면 사용자에게 알리고 소비자 문서 생성을 건너뛴다.

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

### Entry 그룹핑 (매뉴얼 페이지 단위)

수집된 export를 **Entry**(= 분할 시 1개 md 파일이 되는 단위)로 그룹핑한다. Entry는 LLM이 매뉴얼 한 페이지로 로드하는 응집 단위다.

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

### 작업 시나리오 수집

Entry 그룹핑과 스타일 에셋 분석 후, 각 Entry에 대해 **작업 시나리오**(= LLM이 이 Entry를 읽어야 하는 상황)를 수집한다. 이 정보는 README의 작업 라우팅 테이블과 각 Entry 파일의 "읽어야 하는 상황" 문구에 사용된다.

**수집 방법:**

1. **소스 분석 기반**: anchor의 JSDoc, 클래스/함수명, public API에서 "이걸 사용하는 상황"을 추론
2. **기존 문서 보존**: 기존 Entry 파일에 "읽어야 하는 상황" 문구가 있으면 소스 기준으로 유효성을 확인하고, 유효하면 그대로 사용
3. **레시피 연동**: 기존 recipe에서 참조하는 Entry는 해당 recipe의 작업 시나리오를 상속

**작업 시나리오 작성 규칙:**

- **사용자 의도 언어로 작성**: "SdModalProvider를 사용할 때" ❌ → "코드에서 모달을 열어야 할 때" ✅
- **구체적 동사 사용**: "모달 관련 작업" ❌ → "모달을 프로그래밍 방식으로 열고 결과를 받아야 할 때" ✅
- **대안 안내 포함**: 유사 Entry가 있으면 "단순 확인/취소는 [`SdConfirmModal`](...) 참조" 형태로 분기 안내
- **1~2문장 이내**: 길어지면 LLM이 스캔하지 않는다

**작업 도메인 분류:**

수집된 작업 시나리오를 **작업 도메인**으로 그룹핑한다. 작업 도메인은 기술 카테고리(providers, directives)가 아닌 **"사용자가 하려는 일"** 기준이다. 도메인명은 패키지 특성에 따라 자유롭게 설정한다.

예시 (Angular UI 라이브러리의 경우):

| 작업 도메인 | 포함 시나리오 예시 |
|-------------|-------------------|
| 시작하기 | 부트스트랩, 환경 설정 |
| 화면 만들기 | 페이지/모달/컨트롤 컨테이너, CRUD 목록/상세 |
| 사용자 입력 받기 | 텍스트, 선택, 체크박스, 날짜, 파일 선택 |
| 데이터 표시하기 | 시트, 리스트, 캘린더, 차트, 라벨, 진행률 |
| 모달·알림·피드백 | 모달 열기, 토스트, 확인 대화상자, busy 표시 |
| 레이아웃·내비게이션 | 사이드바, 탑바, 도킹, 탭, 칸반, 페이지네이션 |
| 스타일·테마 | CSS 클래스, 변수, 다크모드 |

하나의 Entry가 여러 작업 도메인에 관련될 수 있다. 이 경우 가장 직접적인 도메인에 배치하고, 보조 도메인에는 "(→ 도 참조)" 등으로 교차 참조한다.

### 분량 판단 & 문서 구조 결정

수집된 Entry 수와 카테고리 수로 구조를 결정한다. 스타일 항목은 카테고리 `styling` 하나로 계산한다.

| 조건 | 구조 |
|------|------|
| 카테고리 1개 **그리고** Entry 10개 이하 | README.md 단독 (작업 라우팅 + Entry 상세 인라인) |
| 그 외 | README.md (작업 라우팅) + _api-index.md (API 인덱스) + `{category}/{entry}.md` (entry별 1 파일) |

**분할 구조 원칙**: 각 Entry는 해당 anchor 1개에만 집중한 md 파일이 되며, 카테고리는 **서브디렉토리**로만 표현된다 (카테고리 파일 `{category}.md`을 만들지 않는다).

### 문서 작성 원칙

- **기존 문서가 없으면** 분석 결과로 신규 작성. **있으면** 출력 경로 하위 모든 파일(서브디렉토리 포함)을 읽어 분석 결과 기준으로 정합성을 맞춘다.
- **소스와 무관한 내용(사용 가이드, 주의사항, 규칙 등)은 보존**이 원칙이되, 현재 소스 및 산출물과 상충하면(없어진 API 언급, 옛 동작 기준 설명, 더 이상 유효하지 않은 규칙, 산출물 문서 링크 등) 소스 및 산출물 기준으로 수정한다.
- **소비자 관점 완전성**: 공개 entrypoint에서 export되어 **소비자 코드에 등장할 수 있는** 심볼은 문서화한다. 내부 재노출 유틸·타입 별칭은 주 Entry에 흡수하거나, "사용 빈도가 낮고 직접 쓰지 말아야 하는 경우" 생략할 수 있다 (생략 시 사유를 실행 로그에 남긴다). "모든 export를 기계적으로 나열"이 목표가 아니다.
- **interface/type 필드 테이블**은 **소비자가 채워야 하는 필드**에 한정한다. 반환값으로만 소비되는 타입은 시그니처만 유지하고 필드 테이블을 생략할 수 있다. 단, 소스에 필드가 있는 interface를 빈 `{}`로 축약 표시하는 것은 금지한다.
- **union type은 discriminant와 각 variant를 설명**한다. discriminated union인 경우 어떤 필드로 분기되는지와 각 variant를 나열한다.
- **Anti-pattern은 진짜 함정만**. 소스 JSDoc·테스트·기존 문서에서 **실제로 확인된** 함정만 Anti-patterns로 명시한다. 쥐어짜내서 억지 Bad 예시를 만들지 않는다. 확인된 함정이 없으면 Anti-patterns 섹션 자체를 생략한다.

### 반-기법 (피해야 할 작성 패턴)

아래 패턴은 명시적으로 금지한다. 생성된 문서에서 발견되면 교정한다.

1. **README에 API 목록 테이블** — API 이름·타입·Description 나열은 _api-index.md의 역할. README에는 작업 라우팅만 둔다.
2. **"Description" 컬럼** — 모든 테이블에서 API 설명 컬럼은 "언제 쓰나"로 작성한다. 타입 요약("프로그래밍 방식 모달 생성")보다 선택 기준("코드에서 모달을 열어야 할 때")이 LLM에게 유효하다.
3. **기술 카테고리 기반 README 인덱스** — "Providers", "Directives", "UI - Form" 같은 기술 분류를 README에서 사용하면 LLM이 작업과 매칭하지 못한다. README에는 작업 도메인 분류만 사용하고, 기술 카테고리는 _api-index.md에 둔다.
4. **Members/Parameters/Returns만 채운 API reference** — 시그니처는 LLM이 소스에서 읽을 수 있다. "언제 쓰는가 / 흔한 실수" 없는 타입 덤프는 토큰 낭비.
5. **백과사전식 긴 산문** — "이 기능은 ~를 위해 설계되었으며 역사적으로…" 같은 배경 서술. 별도 설명(Explanation) 문서가 필요하면 파일을 분리하되, Entry 본문에 섞지 않는다.
6. **Deeply nested 링크 체인** — Entry → 다른 Entry → 또 다른 Entry. 1-level deep 원칙 위반.
7. **"자세한 건 상위/다른 페이지 참조"** — Entry가 self-contained하지 않으면 부분 로드 시 깨진다.
8. **1인칭·2인칭 서술** ("I can help…", "You should…") — 3인칭으로 통일.
9. **시간 민감 정보 인라인** ("2025년 8월 이전엔…") — 금방 거짓이 된다. "Deprecated" 또는 "Legacy" 별도 섹션으로 격리한다.
10. **동급 대안 나열** ("A, B, C 중 하나 고르세요") — LLM이 무작위 선택. **기본 1개 추천 + 예외 상황에만 대안**.
11. **ALL CAPS / "ALWAYS"·"NEVER" 남발** — 진짜 중요한 곳에서만 써야 신호가 산다. 근거 1줄이 더 효과적이다.
12. **Voodoo constants** — 근거 없는 매직 넘버.
13. **일관되지 않은 용어** — 같은 개념을 여러 용어로 지칭하면 LLM이 별개 개념으로 오인.
14. **억지 Anti-pattern** — 소스에서 확인되지 않은 함정을 쥐어짜내서 Bad 예시로 만드는 것. 진짜 함정이 있을 때만 작성한다.
15. **Tutorial과 Reference 혼재** — "설치 후 첫 걸음…" 학습 서술을 API reference에 섞지 않는다.

### README.md 형식 (작업 라우터)

README.md는 **작업 라우팅에 전념**한다. API 목록, 시그니처, 상세 설명은 README에 두지 않는다.

```markdown
# {package-name}

> {2~3줄 요약. 런타임·타겟·핵심 의존성 전제. 이 패키지를 왜 쓰는지 한 문장.}

## Installation

\`\`\`bash
npm install {package-name}
\`\`\`

## 먼저 읽기 (횡단 전제)

{있는 경우에만 이 섹션을 생성}

- [공통 규칙](./recipes/_common-rules.md) — 여러 Entry에 걸친 금지·컨벤션
- [Bootstrap](./bootstrap/...) — 반드시 등록해야 하는 provider / 초기화

## 하려는 작업 → 읽을 파일

{작업 시나리오 수집에서 도출한 작업 도메인별로 그룹핑한다.
모든 Entry가 최소 1개 작업 행에 포함되어야 한다.
"하려는 작업" 컬럼은 사용자 의도 언어로 작성한다.}

### {작업 도메인 1}

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| {사용자 의도 1줄} | [{entry 파일명}](./{category}/{entry}.md) |
| {사용자 의도 1줄} | [{entry 파일명}](./{category}/{entry}.md) |

### {작업 도메인 2}

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| ... | ... |

{모든 작업 도메인을 나열}

## 이 패키지를 쓰지 말아야 할 때

{있는 경우에만. 예: "서버 사이드 로직 → @simplysm/service-server"}

---

> API 이름으로 검색: [_api-index.md](./_api-index.md)
```

**README 작성 핵심 규칙:**

- **"하려는 작업" 컬럼은 사용자 의도 언어**: "SdTextfield를 사용" ❌ → "텍스트/숫자/날짜 입력 받기" ✅
- **유사 Entry의 차이를 "하려는 작업" 컬럼에 반영**: "드롭다운 선택" vs "모달에서 항목 선택" vs "공유 데이터에서 선택"
- **"먼저 읽기"는 "하려는 작업" 테이블 앞에 배치**: LLM이 Entry를 읽기 전에 횡단 규칙을 먼저 인지하도록
- **README 단독 구조**(Entry 10개 이하)에서는 "하려는 작업" 테이블 아래에 각 Entry 상세를 인라인으로 포함한다

### _api-index.md 형식 (API 참조 인덱스)

분할 구조에서만 생성한다 (README 단독 구조에서는 생략).

```markdown
# API Index — {package-name}

> API 이름을 알고 있을 때 해당 문서를 찾는 인덱스.
> 작업 기반으로 찾으려면 [README.md](./README.md) 참조.

## {Category Name}

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `ClassName` | class | [file.md](./{category}/file.md) | {1줄 — 어떤 작업을 할 때} |

{스타일 항목이 수집된 경우:}
## Styling

| Entry | 문서 | 언제 쓰나 |
|-------|------|-----------|
| CSS Classes | [classes.md](./styling/classes.md) | 레이아웃·유틸리티 클래스가 필요할 때 |
| CSS Custom Properties | [variables.md](./styling/variables.md) | 디자인 토큰을 오버라이드할 때 |
| Themes | [themes.md](./styling/themes.md) | 테마 전환이 필요할 때 |
| Mixins / Functions | [mixins.md](./styling/mixins.md) | SCSS에서 직접 mixin 쓸 때 |
```

**_api-index.md 작성 규칙:**

- 카테고리는 기존 기술 분류(소스의 region/디렉토리 기반) 그대로 사용 — API 이름을 아는 사용자에게는 기술 분류가 자연스럽다
- "언제 쓰나" 컬럼은 필수 — API 이름을 찾아왔더라도 맞는 API인지 확인 필요
- 흡수된 타입(prefix 매칭, 시그니처 참조로 anchor에 흡수된 것)은 anchor 행에 포함하지 않고, Entry 파일 안에서만 노출

### {category}/{entry}.md 형식 (분할 대상만)

각 Entry마다 `{출력 경로}/{category-kebab}/{entry.kebabName}.md`를 1개 생성한다. 카테고리는 서브디렉토리로 매핑한다.

#### 필수 상단: "읽어야 하는 상황"

**모든 Entry 파일의 제목 바로 아래에 "읽어야 하는 상황" 인용 블록을 필수로 작성한다.** 이 블록은 LLM이 파일을 열자마자 "이 파일이 내 작업에 맞는가?"를 즉시 판단하는 신호다.

```markdown
# `{EntryName}`

> **읽어야 하는 상황**: {작업 시나리오에서 도출한 1~2문장}. {유사 Entry가 있으면 분기 안내}.
```

예시:

```markdown
# `SdModalProvider`

> **읽어야 하는 상황**: 코드에서 프로그래밍 방식으로 모달을 열고 결과를 받아야 할 때. 단순 확인/취소 대화상자는 [`SdConfirmModal`](../ui-overlay/sd-confirm-modal.md), 텍스트 입력 대화상자는 [`SdPromptModal`](../ui-overlay/sd-prompt-modal.md)을 먼저 확인.
```

```markdown
# CRUD 리스트

> **읽어야 하는 상황**: 여러 레코드를 조회·필터링하는 목록 화면을 만들 때. 단일 레코드 상세/편집은 [crud-detail.md](./crud-detail.md) 참조.
```

```markdown
# `SdTextfield`

> **읽어야 하는 상황**: 한 줄 텍스트·숫자·날짜·시간·색상 등을 입력받을 때. 여러 줄 텍스트는 [`SdTextarea`](./sd-textarea.md), 리치 텍스트는 [`SdTiptapEditor`](../features/sd-tiptap-editor.md) 참조.
```

#### Entry 템플릿 선택

Entry는 **anchor의 종류에 따라 아래 세 템플릿 중 하나**를 선택한다:

- **T1 (Recipe)**: `recipes/` 하위 — 특정 화면·흐름을 만드는 방법 ("이 상황에서 어떻게 하지?")
- **T2 (API Reference)**: class / provider / 단독 함수 / util 등 API 사용법 조회
- **T3 (Rule / Decision)**: 여러 Entry에 걸친 횡단 규칙·금지 (예: `_common-rules.md`)

**공통 조건**:

- 파일이 100줄 초과 예상이면 상단에 `## Contents` TOC를 둔다.
- 어느 anchor Entry든 **anchor가 class/provider/주요 함수**이면 "When to use" 섹션을 **반드시** 작성한다. 소스에서 용도가 확인되지 않으면 "소스에서 확인되지 않음"으로 명시.
- **예제는 최소 1개면 충분하다.** 복붙 가능한 최소 예제 1개로 사용법을 보여준다. 의미 있는 변형이 있을 때만 추가 예제를 둔다. 억지로 예제를 늘리지 않으며, 의미 있는 예제를 만들 수 없으면 Usage 섹션 자체를 생략한다 (형식적 예제 금지).

#### T1: How-to / Recipe Entry 템플릿

```markdown
# {레시피 이름}

> **읽어야 하는 상황**: {이 레시피가 해결하는 문제 / 산출하는 화면을 1~2문장으로. 유사 레시피 분기 안내.}

## When to use / When NOT to use

- ✅ 이런 상황: ...
- ❌ 이런 상황엔 대신 [`OtherRecipe`](../recipes/other.md) — 이유: ...

## 전제조건

- 필수 Provider: `provideSdAngular` 등
- peer dependency: ...
- 환경: ...

## 기본 레시피

\`\`\`typescript
{복붙 가능한 최소 완성 코드.}
\`\`\`

## 변형 (Variation)

{의미 있는 변형이 있을 때만. 없으면 섹션 생략.}

### {조건 A}
{코드블록}

## 🚫 흔한 실수 (Anti-patterns)

{소스·JSDoc·테스트에서 **실제 확인된 함정만**. 확인된 것이 없으면 이 섹션 전체 생략. 억지로 Bad 예시를 만들지 않는다.}

### {실수 이름}

\`\`\`typescript
// ❌ 잘못된 예
{코드}

// ✅ 올바른 예
{코드}
\`\`\`

**근거**: {1줄 — 왜 ❌가 문제인지}

## 관련 Entry

- [`OtherEntry`](../other-category/other.md) — 차이: {한 줄}
```

#### T2: API Reference Entry 템플릿

```markdown
# `{EntryName}`

> **읽어야 하는 상황**: {1~2문장 — 어떤 작업을 할 때 이 API가 필요한가. 유사 API 분기 안내.}

## When to use

- ✅ 이런 상황에 사용: ...
- ❌ 이런 상황엔 대신 [`OtherEntry`](../{category}/other.md) — 이유: ...

## Signature

\`\`\`typescript
{호출 가능 수준 시그니처 — 제네릭·public 멤버 시그니처까지. private·internal 제외.}
\`\`\`

## Members (class/component/provider인 경우)

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `host` | property | `string` | ... |
| `connect` | method | `(opt: Option) => Promise<void>` | ... |

{Kind 열은 패키지에 맞는 용어 — class는 `property`/`getter`/`method`/`static`, Angular 컴포넌트는 `input`/`input (required)`/`output`/`model`/`signal`/`computed` 등}

## Parameters (function인 경우)

| Param | Type | Description |
|-------|------|-------------|
| `input` | `...` | ... |

## Returns

`ReturnType` — ...

## Usage

\`\`\`typescript
{복붙 가능한 최소 예제 1개. 이것만으로 사용법을 알 수 있어야 한다.}
\`\`\`

{의미 있는 변형이 있을 때만 추가 예제. 없으면 위 1개로 충분.}

## 🚫 Anti-patterns

{소스·JSDoc·테스트에서 **실제 확인된 함정만**. 확인된 것이 없으면 이 섹션 전체 생략. 억지로 Bad 예시를 만들지 않는다.}

### {실수 이름}

\`\`\`typescript
// ❌
{코드}

// ✅
{코드}
\`\`\`

**근거**: {1줄}

## Related Types

{Entry에 흡수된 interface/type/enum/const를 각각 섹션으로 나열. 소비자가 채우는 필드만 테이블화.}

### `FtpStorageConfig`

\`\`\`typescript
{시그니처}
\`\`\`

| Field | Type | Description |
|-------|------|-------------|
| `host` | `string` | ... |

## 관련

- [`OtherEntry`](../{category}/other.md) — 차이: {한 줄}
```

#### T3: Rule / Decision Entry 템플릿

```markdown
# {규칙 모음 이름}

> **읽어야 하는 상황**: {이 규칙이 적용되는 범위를 1~2문장으로}

## 적용 범위

{어떤 Entry / 카테고리 / 상황에 적용되는가 — 구체적으로}

## ✅ Always (반드시)

### {규칙 이름}

\`\`\`typescript
// ❌
{코드}

// ✅
{코드}
\`\`\`

**근거**: {1줄}

## ⚠️ Ask first (조건부)

### {규칙 이름}

{조건 + 판단 근거}

## 🚫 Never (금지)

### {규칙 이름}

\`\`\`typescript
// ❌ 금지
{코드}
\`\`\`

**근거**: {왜 금지인지}
**대안**: {올바른 방법 또는 링크}

## 예외 케이스

{규칙이 깨지는 상황과 허용 조건}
```

### 표시 규칙

- anchor와 흡수된 타입 모두 `##` 또는 `###` 섹션으로 반드시 노출한다. interface 필드가 많다고 `{}`로 축약하지 않는다.
- 비어 있는 섹션(예: 멤버 없음, 흔한 실수가 소스에서 확인되지 않음)은 생략한다.
- anchor가 class/provider/주요 함수면 "When to use" 섹션은 **생략 불가**.

### Styling 분할 구조 (`styling/*.md`)

스타일 항목이 수집된 경우, 아래 4개 파일로 분할하여 생성한다. 모두 `styling/` 서브디렉토리에 둔다.

- `styling/classes.md` — 전역 CSS 클래스 목록
- `styling/variables.md` — CSS 커스텀 프로퍼티
- `styling/themes.md` — 테마 클래스와 각 테마가 오버라이드하는 변수
- `styling/mixins.md` — 공개 SCSS mixin / function

각 파일도 상단에 "읽어야 하는 상황" 인용 블록을 포함한다:

```markdown
<!-- classes.md -->
# CSS Classes

> **읽어야 하는 상황**: 레이아웃·유틸리티 클래스로 스타일링할 때. 커스텀 프로퍼티(변수) 오버라이드는 [variables.md](./variables.md), 테마 전환은 [themes.md](./themes.md) 참조.

| Class | 언제 쓰나 |
|-------|-----------|
| `.flex-row` | {설명} |

<!-- variables.md -->
# CSS Custom Properties

> **읽어야 하는 상황**: 디자인 토큰(색상, 간격, 폰트 등)을 오버라이드할 때.

| Property | Default | Description |
|----------|---------|-------------|
| `--color-primary` | `#...` | {설명} |

<!-- themes.md -->
# Themes

> **읽어야 하는 상황**: 다크 모드 등 테마를 전환하거나 커스텀 테마를 추가할 때.

## `.theme-dark`

{설명 + 오버라이드 변수 목록 테이블}

<!-- mixins.md -->
# Mixins / Functions

> **읽어야 하는 상황**: SCSS에서 직접 mixin이나 function을 사용할 때.

| Name | Signature | 언제 쓰나 |
|------|-----------|-----------|
| `flex-direction` | `@mixin flex-direction($dir)` | {설명} |
```

README 단독 구조이면 위 4개 섹션을 README의 `## Styling` 하위에 인라인으로 포함하고, `styling/` 서브디렉토리는 만들지 않는다.

### 이전 구조 잔여 파일 정리

분할 구조 전환으로 더 이상 유효하지 않은 **레이아웃 파일만** 정리한다. 이 단계는 파일 레이아웃(구조)만 다루며, 내용의 정합성은 다음 "완전성 및 정확성 검증" 단계에서 처리한다.

1. 이전 구조(`{category}.md` 단일 파일)에서 분할 구조(`{category}/{entry}.md` 트리)로 전환되면서 더 이상 쓰이지 않는 **카테고리 단위 단일 파일**(예: `utils.md`, `pipes.md`, `drivers.md` 등 카테고리가 디렉토리가 아닌 단일 md로 남은 경우)이 있으면 삭제한다.
2. 이전에 styling이 단일 파일(`styling.md`)이었고 이번 실행에서 분할 구조(`styling/*.md`)로 전환되면 이전 `styling.md`를 삭제한다. 반대로 README 단독 구조로 전환되어 `styling/` 서브디렉토리가 불필요해지면 해당 서브디렉토리를 삭제한다.
3. 출력 경로 하위의 그 외 파일(현재 Entry 파일, recipe, 가이드 등)은 이 단계에서 삭제하지 않는다. 이들의 존속 여부는 다음 검증 단계 결과에 따라 결정된다.

### 완전성 및 정확성 검증

문서 작업 후, 수집한 export 목록과 출력 경로 하위 **모든 파일**(자동 생성 Entry 파일·styling 파일·recipe·가이드 등 수동 작성물 전부 포함), README.md, _api-index.md를 대조한다. 자동 생성물과 수동 작성물에 **동일한 정합성 규칙**을 적용한다.

#### 완전성

1. export 목록의 각 항목이 _api-index.md 또는 출력 경로 하위 어느 파일(서브디렉토리 포함)에 존재하는지 확인
2. 누락된 항목이 있으면 해당 API를 문서에 추가 (단, "소비자 관점 완전성" 원칙에 따라 내부 유틸·재노출 타입은 흡수·생략 가능)
3. 문서에 있는 심볼 참조 중 **현재 export에 없는 것**(제거·이름 변경된 API)은 소스 기준으로 수정하거나 제거
4. **주제 자체가 소멸한 문서는 파일 통째로 삭제**: recipe·가이드·사용 예시처럼 특정 API 중심으로 작성된 파일의 경우, 해당 문서가 다루는 핵심 주제(제목·첫 문단·코드 예제에서 중심이 되는 anchor 심볼)가 현재 export에서 **전부 사라졌다면** 파일 내 심볼 참조를 하나씩 고치는 대신 **파일 자체를 삭제**한다. 주제가 일부만 바뀐 경우(일부 API만 사라짐)에는 내용을 수정하고 파일은 유지한다.

#### 작업 라우팅 완전성

5. **README의 작업 라우팅 커버리지**: 모든 Entry가 README의 "하려는 작업" 테이블에 최소 1개 행으로 포함되어 있는지 확인. 누락된 Entry가 있으면 적절한 작업 도메인에 행을 추가한다.
6. **README 링크 무결성**: 모든 `[...](./...)` 링크의 대상 파일이 실제로 존재하는지 확인. 깨진 링크는 수정하거나 제거 (4번에서 파일이 삭제된 경우 해당 링크도 제거)
7. **_api-index.md 링크 무결성**: 모든 API 행의 문서 링크가 실제 파일을 가리키는지 확인

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

#### 매뉴얼 품질 검증

시그니처 정합성 외에, LLM 매뉴얼로서의 품질을 아래 축으로 검증한다:

| 검증 항목 | 확인 내용 |
|-----------|-----------|
| "읽어야 하는 상황" 필수 | 모든 Entry 파일 제목 아래에 `> **읽어야 하는 상황**:` 인용 블록이 있는가 |
| 상황 문구 품질 | 사용자 의도 언어로 작성되었는가 (API 이름이 아닌 작업 설명) |
| When to use 명시 | anchor가 class/provider/주요 함수인 Entry에 "When to use" 섹션이 1문장 이상 있는가 |
| 계열 간 선택 기준 | 유사 역할 Entry가 ≥2개인 경우 "읽어야 하는 상황"에 상호 분기 안내가 있는가 |
| Anti-pattern 절제 | 소스에서 실제 확인된 함정만 기술했는가. 억지 Bad 예시가 없는가 |
| 예제 절제 | 요구사항당 최소 예제 1개로 충분한가. 불필요하게 부풀린 예제가 없는가 |
| 3인칭 서술 | "I can…", "You should…" 류 1·2인칭 서술이 없는가 |
| 용어 일관성 | 한 Entry 내에서 동일 개념에 대해 여러 용어가 혼용되지 않는가 |
| README 작업 도메인 | README의 "하려는 작업" 테이블이 기술 카테고리가 아닌 작업 도메인으로 그룹핑되었는가 |

#### 검증 결과 표시

```
완전성 검증: 52/52 API 문서화됨
작업 라우팅: 52/52 Entry가 README에 포함됨
정확성 검증: 52/52 API 시그니처 일치
매뉴얼 품질: 52/52 Entry에 "읽어야 하는 상황" 있음, 48/52에 When to use 명시
```

불일치가 있는 경우:

```
완전성 검증: 52/52 API 문서화됨
작업 라우팅: 50/52 Entry가 README에 포함됨
  누락: SdResizeDirective, SdIntersectionDirective → "레이아웃·내비게이션" 도메인에 추가
정확성 검증: 50/52 API 시그니처 일치
  불일치: DbContext (tables→repositories 필드명 변경), FtpStorage (port: required→optional)
매뉴얼 품질:
  "읽어야 하는 상황" 누락: SdGap, SdLabel
  When to use 누락: FtpStorage
  선택 기준 누락: SdToast/SdAlert 간 분기 안내 없음
→ 소스 기준으로 문서를 수정하고 누락 항목을 보완합니다.
```
