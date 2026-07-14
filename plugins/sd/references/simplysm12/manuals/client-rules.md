# 클라이언트(및 공통) 코드 규칙

클라이언트·공통 코드(앱 패키지 + `@simplysm/*` 라이브러리)를 작성할 때 따르는 lint / 템플릿 규칙. 규칙은 `@simplysm/eslint-plugin` 의 커스텀 규칙 9종과 표준 규칙으로 강제됨(규칙별 검사 대상은 [eslint-plugin API 문서](../apis/eslint-plugin/README.md) 참고).

## eslint 설정을 프로젝트에 적용하려면

프로젝트 루트에 `eslint.config.js` 한 파일만 두고 `@simplysm/eslint-plugin` 의 `configs.root` 를 펼쳐 export 함. centurymes·simplysm-ts 둘 다 내용이 동일함.

```js
// eslint.config.js (centurymes / simplysm-ts 동일)
import simplysmPlugin from "@simplysm/eslint-plugin";

export default [...simplysmPlugin.configs.root];
```

`configs.root`(`packages/eslint-plugin/src/configs/root.js`)는 플랫 설정 배열이며, 대상 파일 유형별로 규칙·플러그인을 나눠 적용함.

- `**/*.js` / `**/*.ts` — TS 는 `tseslint.parser` + `parserOptions.project: true`(타입 정보 필요 규칙용)와 `processInlineTemplates`(인라인 `template` 추출 후 별도 HTML 로 검사) 적용.
- `**/*.html` — `templateParser` 로 Angular 템플릿 검사.
- `node_modules`, `dist`, `tests`, 점(`.*`)·언더스코어(`_*`) 디렉토리는 전 규칙에서 제외.

`@simplysm/eslint-plugin` 은 `devDependencies` 에 둠. lint 실행은 프로젝트 스크립트로 함(centurymes `package.json`).

```bash
# 전체 검사
eslint "**/+(*.ts|*.js|*.html)"
# 자동수정(아래 "자동수정" 표시 규칙이 적용됨)
eslint --fix "**/+(*.ts|*.js|*.html)"   # = npm run eslint-fix
```

## `@simplysm/*` 를 import 할 때 `/src` 하위경로를 쓰지 않으려면

`@simplysm/no-subpath-imports-from-simplysm`(error)이 `@simplysm/<pkg>/src...` import 를 막음. 경로를 `/` 로 끊어 3번째 조각이 `src` 면 보고함(`no-subpath-imports-from-simplysm.js`).

```ts
import { $signal } from "@simplysm/sd-angular"; // OK
import { IAuthInfo } from "@simplysm/sd-orm-common-ext"; // OK
// import { x } from "@simplysm/sd-angular/src/...";      // 금지 — 배포 패키지의 진입점만 import
```

패키지 루트 또는 그 하위의 공개 경로(`@simplysm/pkg`, `@simplysm/pkg/x`)만 씀. 라이브러리 내부 구현 파일을 `src` 로 직접 끌어오지 않음.

## ECMAScript hard private(`#`) 대신 TS `private` 를 쓰려면

`@simplysm/no-hard-private`(error, **자동수정**)가 `#` 필드/메서드를 금지하고, 선언부를 `private _이름` 으로 개명함(접근제어자가 없으면 `private ` 삽입, 데코레이터가 있으면 마지막 데코레이터 뒤에 삽입해 `@Deco private static _foo` 순서 유지). `this.#field` 같은 사용부도 `this._field` 로 함께 바꿈(`no-hard-private.js`).

라이브러리 소스(`@simplysm/sd-angular`)는 이 규칙에 맞춰 `private readonly` 소프트 private 를 씀.

```ts
// packages/sd-angular/src/features/data-view/sd-data-sheet.control.ts
private readonly __sdToast = inject(SdToastProvider);
private readonly __sdSharedData = inject(SdSharedDataProvider);
```

> 참고: centurymes·simplysm-ts 의 앱 코드 상당수는 아직 `#appOrm = inject(AppOrmProvider)` 형태의 hard private 로 작성돼 있음. 이 규칙은 그런 코드를 `eslint --fix` 로 `private _appOrm` 형태로 자동 변환함. 새 코드는 처음부터 `private` 로 작성함.

## 미사용 `inject()` / `protected readonly` 를 남기지 않으려면

두 규칙이 컴포넌트·프로바이더에서 안 쓰이는 멤버를 잡아 자동 제거함.

- `@simplysm/ts-no-unused-injects`(error, **자동수정**) — `inject(...)` 로 초기화된 클래스 필드가 클래스 본문 어디서도 참조되지 않으면 필드 선언째로 제거(`ts-no-unused-injects.js`).
- `@simplysm/ts-no-unused-protected-readonly`(error, **자동수정**) — `@Component` 의 인라인 `template` 에 `template` 속성이 있을 때만 동작. 그 클래스의 `protected readonly` 필드(static 제외)가 템플릿 텍스트에도, 클래스 내 다른 멤버에서도 참조되지 않으면 제거(`ts-no-unused-protected-readonly.js`). `templateUrl` 만 있고 인라인 `template` 이 없으면 검사하지 않음.

따라서 컴포넌트에서 `protected readonly` 로 노출한 아이콘·헬퍼·필드는 반드시 템플릿이나 메서드에서 실제로 쓰여야 함(안 쓰면 자동으로 지워짐). 표준 `unused-imports/no-unused-imports`·`no-unused-vars`(접두 `_` 는 무시)도 함께 적용되므로 미사용 import·변수도 남기지 않음.

## `sd-*` 컴포넌트에 plain attribute 대신 바인딩을 쓰려면

`@simplysm/ng-template-sd-require-binding-attrs`(error, **자동수정**)가 `sd-` 로 시작하는 엘리먼트의 plain attribute 사용을 막고 property binding 으로 전환함(`ng-template-sd-require-binding-attrs.js`).

- plain 으로 허용되는 속성: `id`, `class`, `style`, `title`, `tabindex`, `role` 과 접두 `aria-` / `data-` / `sd-`.
- 그 외 속성은 바인딩으로 작성해야 함. 자동수정은 값 없는 `xxx` → `[xxx]="true"`, 값 있는 `aaa="bbb"` → `[aaa]="'bbb'"` 로 바꿈.

```html
<!-- 금지 (plain attribute) -->
<sd-button type="submit" theme="primary" size="lg">로그인</sd-button>

<!-- 권장 (property binding) -->
<sd-button [type]="'submit'" [theme]="'primary'" [size]="'lg'">로그인</sd-button>
```

`class`/`style` 등 화이트리스트 속성은 그대로 plain 으로 둠. 이벤트 바인딩(`(submit)=...`)·양방향 바인딩(`[(value)]=...`)은 애초에 plain attribute 가 아니므로 영향이 없음.

## 템플릿에서 `$any` 를 쓰지 않으려면

template 에서 타입 오류가 나면 `$any(...)` 로 우회하지 말고 컴포넌트 클래스의 타입 설계를 바로잡아 해결함. centurymes·simplysm-ts 앱 코드 전체에 `$any` 사용 사례가 없음(타입을 컴포넌트 쪽에서 맞추는 방식). `eslint-disable-next-line` 으로 lint 를 끄는 우회도 하지 않음.

## 그 밖에 코드에서 지켜지는 규칙

`configs.root` 가 강제하는 주요 표준/커스텀 규칙(전체 목록·세부 조건은 [eslint-plugin API 문서](../apis/eslint-plugin/README.md)).

- **부동 Promise 금지** — `@typescript-eslint/no-floating-promises`(error). `await` 하거나 명시적으로 처리하지 않은 Promise 는 보고됨. 비동기 호출은 toast 의 `try` 나 `await` 로 감쌈.
- **`return await` 강제** — `@typescript-eslint/return-await: always`(error). async 함수에서 Promise 를 그대로 `return` 하지 않고 `return await ...` 로 씀.
- **`==` 금지** — `eqeqeq`(error, `null` 비교만 예외). `===`/`!==` 를 씀.
- **불필요한 조건/단언 금지** — `no-unnecessary-condition`, `no-unnecessary-type-assertion`, `non-nullable-type-assertion-style`(error). 항상 참/거짓인 조건, 의미 없는 `as` 단언을 정리함.
- **명시적 타입(`typedef`)** — `@typescript-eslint/typedef`(error).
- **`@ts-ignore` 대신 `@ts-expect-error`** — `@typescript-eslint/prefer-ts-expect-error`(error).
- **`prefer-readonly`** — 재할당하지 않는 private 필드는 `readonly` 로.
- **`NotImplementError` throw 경고** — `@simplysm/ts-no-throw-not-implement-error`(warn). `throw new NotImplementError(...)` 가 남아 있으면 경고하므로 출시 전 제거함.
- **`console` / `TODO` 경고** — `no-console`(warn), `no-warning-comments`(warn), 템플릿의 `<!-- TODO: -->` 는 `@simplysm/ng-template-no-todo-comments`(warn).

> `@simplysm/ts-no-buffer-in-typedarray-context`·`@simplysm/ts-no-exported-types`·`no-restricted-imports` 블록은 `configs.root` 에서 주석 처리되어 **비활성**임(켜려면 각 프로젝트에서 직접 활성화). 즉, 신호 헬퍼를 쓰라고 `@angular/core` 의 `signal`/`computed` 등 import 를 lint 가 막지는 않으므로, `$signal`/`$computed` 사용 규칙은 코드 작성자가 직접 지킴.
