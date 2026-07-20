# @simplysm/lint

TypeScript/Angular 코드 린팅을 위한 ESLint 플러그인. TypeScript strict 모드와 Angular 최적 사례를 강제하는 9개 커스텀 규칙과, typescript-eslint 기반 권장 flat config를 제공함.

## 사용 트리거 인덱스

- **ESLint 규칙 설정** — 프로젝트의 ESLint 커스텀 규칙을 활성화하거나 심도를 조정할 때. 자세히: [rules.md](./rules.md)
- **권장 ESLint 설정** — 프로젝트의 ESLint 기본 규칙/lint 레벨을 설정할 때. 자세히: [eslint-recommended.md](./eslint-recommended.md)

## ./eslint-plugin

`import plugin from "@simplysm/lint/eslint-plugin"` 또는 `import { default as plugin } from "@simplysm/lint/eslint-plugin"`로 import하는 ESLint 플러그인 객체.

- **전체 규칙 제공** — `plugin.rules` 객체에 9개 규칙 구현이 포함됨.
- **사용 방식** — ESLint flat config에서 플러그인 등록 후 규칙을 명시적으로 활성화함.
  ```typescript
  import plugin from "@simplysm/lint/eslint-plugin";

  {
    plugins: { "@simplysm": plugin },
    rules: {
      "@simplysm/no-hard-private": "error",
      // 기타 규칙들...
    }
  }
  ```

## ./eslint-recommended

`import config from "@simplysm/lint/eslint-recommended"`로 import하는 typescript-eslint 기반 권장 flat config 배열.

- **구성 요소** — 공통 규칙, JS/TS/HTML 별 세부 규칙, 테스트/설정파일 예외, Angular 템플릿 규칙을 포함함.
- **사용 방식** — ESLint flat config 배열로 그대로 spread하거나 export함.
  ```typescript
  import config from "@simplysm/lint/eslint-recommended";

  export default config;
  ```
- **포함 규칙** — @typescript-eslint, angular-eslint, import-x, unused-imports, 그리고 @simplysm 커스텀 규칙을 통합함.
- **자동 활성화 규칙** — eslint-recommended 적용 시 자동으로 활성화되는 @simplysm 규칙 목록:
  - TS: `ng-no-async-effect`, `no-hard-private`, `no-subpath-imports-from-simplysm`, `ts-no-throw-not-implemented-error` (warn), `ts-no-unused-injects`, `ts-no-unused-protected-readonly`
  - HTML: `ng-template-no-strict-null-check`, `ng-template-no-todo-comments` (warn), `ng-template-sd-require-binding-attrs`

## 규칙 목록 및 심도

### TypeScript 규칙

#### `@simplysm/ng-no-async-effect` (error)

Angular `effect()` 콜백에 async 함수를 직접 전달하는 것을 금지함.

- **사유** — async 콜백의 `await` 이후에 읽은 signal은 의존성 추적이 끊겨 반응형이 아니며, 반환값이 `Promise<void>`가 되어 cleanup 등록도 불가능함.
- **올바른 패턴** — `untracked(async () => { ... })` 내부에서 비동기 작업을 수행함.
- **지원 import** — named import (`import { effect }`), aliased import (`import { effect as ngEffect }`), namespace import (`import * as ng from "@angular/core"`)
- **autofix** — 없음 (수동 리팩토링 필요)

#### `@simplysm/no-hard-private` (error)

ECMAScript hard private 필드(`#field`)를 금지하고 TypeScript `private _` 스타일 강제.

- **검사 항목** — 클래스 필드 선언(`#field`), 메서드(`#method()`), 접근자(`accessor #field`), 멤버 접근(`this.#field`)
- **변환** — `#fieldName` → `_fieldName`에 `private` 키워드 추가
- **제약** — 변환 대상 이름과 중복되는 멤버(예: `_foo` 기존)가 있으면 fix 불가, 수동 처리 필요
- **autofix** — 이름 충돌 없을 때 제공

#### `@simplysm/no-subpath-imports-from-simplysm` (error)

`@simplysm/*` 패키지의 'src' 하위 경로 import를 금지함.

- **금지 패턴** — `@simplysm/pkg/src/...`
- **허용 패턴** — `@simplysm/pkg`, `@simplysm/pkg/sub/path`(src 제외)
- **검사 대상** — 정적 import, 동적 import(`import(...)`), 재내보내기(`export { ... } from`, `export * from`)
- **autofix** — `@simplysm/pkg/src/x` → `@simplysm/pkg` 단순 자동 수정

#### `@simplysm/ts-no-throw-not-implemented-error` (warn)

`@simplysm/core-common`의 `NotImplementedError` 사용을 감지해 경고하는 제안 규칙.

- **용도** — 미구현 코드가 프로덕션에 포함되었을 가능성을 인지시킴.
- **지원 import** — named import, aliased import, namespace import
- **동적 import 미감지** — `await import(...)` 형태는 감지하지 않음
- **메시지** — 첫 인자가 문자열이면 메시지로, 없으면 기본 "미구현" 표시
- **autofix** — 없음

#### `@simplysm/ts-no-unused-injects` (error)

클래스 내 `inject()` 필드 중 미사용 필드를 감지해 보고함.

- **감지** — 같은 클래스 내에서 다른 곳에 참조되지 않는 inject 필드
- **autofix** — 감지된 필드를 전체 제거

#### `@simplysm/ts-no-unused-protected-readonly` (error)

Angular `@Component` 내 미사용 `protected readonly` 필드를 감지해 보고함.

- **감지 범위** — 인라인 템플릿과 클래스 본문 모두에서 참조되지 않는 필드
- **template 추출** — `@Component({ template: "..." })` 인라인 템플릿만 정적 분석 가능
- **로컬 변수 제외** — `*ngFor`, `@for`, `@let` 등 구조 디렉티브의 로컬 변수는 제외
- **autofix** — 감지된 필드를 전체 제거

### HTML 템플릿 규칙

#### `@simplysm/ng-template-no-strict-null-check` (error)

Angular 템플릿의 `=== null`, `!== null`, `=== undefined`, `!== undefined` 사용을 금지함.

- **대체 패턴** — `== null` 또는 `!= null`로 통일
- **사유** — null/undefined를 동일하게 취급하는 한국 팀 컨벤션
- **autofix** — 없음 (인라인 템플릿의 offset 매핑 복잡도)

#### `@simplysm/ng-template-no-todo-comments` (warn)

HTML 주석 내 TODO 표기(`<!-- TODO: ... -->`)를 감지해 경고하는 제안 규칙.

- **형식** — `<!-- TODO: ` 로 시작하는 주석
- **용도** — 미완성 부분의 시각적 경고
- **autofix** — 없음

#### `@simplysm/ng-template-sd-require-binding-attrs` (error)

`sd-` 접두사 컴포넌트에서 plain attribute 사용을 제한하고 Angular property binding 강제.

- **대상 선택자** — 기본값: `sd-*` 접두사 컴포넌트
- **허용 attribute** — id, class, style, title, tabindex, role
- **허용 prefix** — aria-, data-, sd-
- **제약 조건** — 위 목록에 없는 plain attribute는 `[attr]="..."` binding으로 변환 필수
- **autofix** — `attr="value"` → `[attr]="'value'"`, 빈 값은 `[attr]="true"`
- **옵션 커스터마이징**:
  ```typescript
  "@simplysm/ng-template-sd-require-binding-attrs": [
    "error",
    {
      selectorPrefixes: ["sd-", "my-"],           // 대상 선택자 prefix 추가/변경
      allowAttributes: ["id", "class", ...],      // 허용 plain attribute 추가/변경
      allowAttributePrefixes: ["aria-", ...],     // 허용 prefix 추가/변경
    }
  ]
  ```

## 규칙 상세 사용법

- 각 규칙의 상세 동작, 메시지, 예제는 [rules.md](./rules.md)를 참고함.
- eslint-recommended 설정의 각 섹션(JS/TS/HTML/test/config) 역할과 규칙 조정은 [eslint-recommended.md](./eslint-recommended.md)를 참고함.
