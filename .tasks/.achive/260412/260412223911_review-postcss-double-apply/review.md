# 코드 리뷰: postcss-pipeline-fix

## DESIGN-001 [Low] SCSS 경로에서 PostCSS가 이중 적용됨

- **위치:** `packages/sd-cli/src/esbuild/esbuild-scss-plugin.ts:21-26`, `packages/sd-cli/src/esbuild/esbuild-postcss-plugin.ts:25-42`

SCSS side-effect import(예: `import "./global.scss"`)의 CSS에 PostCSS가 두 번 적용된다.

1. `esbuild-scss-plugin`의 `onLoad`에서 SCSS -> CSS 변환 후 `postcss(options.postcssPlugins).process(css, ...)` 수행 (scss-plugin:21-26)
2. esbuild가 해당 CSS를 번들링하여 출력 `.css` 파일에 포함
3. `esbuild-postcss-plugin`의 `onEnd`에서 출력 `.css` 파일 전체에 `processor.process(css, ...)` 수행 (postcss-plugin:25-42)

대부분의 PostCSS 플러그인(autoprefixer 등)은 idempotent이므로 기능적 오류는 발생하지 않으나, 콘텐츠를 추가하는 유형의 플러그인(예: 배너 주석 삽입)은 이중 적용될 수 있다. 또한 불필요한 처리 오버헤드가 존재한다.

`esbuild-postcss-plugin`(onEnd)이 모든 `.css` 출력을 처리하므로, `esbuild-scss-plugin`의 PostCSS 적용은 기능적으로 불필요하다. onEnd 플러그인 단독으로 SCSS 경로를 포함한 모든 CSS 경로를 커버한다.

**개선 방향:** `esbuild-scss-plugin`에서 PostCSS 적용을 제거하고, onEnd 플러그인에 일원화. 또는 의도적 이중 적용이라면 해당 근거를 코드 주석으로 명시.

---

## CONSIST-001 [Low] PostCSS 플러그인 프로퍼티명 `postcssPlugins` vs `postCssPlugins`

- **위치:** `packages/sd-cli/src/esbuild/esbuild-client-config.ts:34`, `packages/sd-cli/src/esbuild/esbuild-scss-plugin.ts:9`, `packages/sd-cli/src/angular/client-transform-stylesheet.ts:9`, `packages/sd-cli/src/angular/angular-build-pipeline.ts:68`

동일한 개념(PostCSS 플러그인 배열)에 대해 코드베이스 내에서 두 가지 네이밍 컨벤션이 혼용된다:

- **신규 코드** (`esbuild-client-config.ts:34`, `esbuild-scss-plugin.ts:9`, `client.worker.ts:75`): `postcssPlugins` (소문자 'c', "postcss"를 단일 단어로 취급)
- **기존 코드** (`client-transform-stylesheet.ts:9`, `angular-build-pipeline.ts:68`): `postCssPlugins` (대문자 'C', "Post" + "Css" camelCase)

두 코드 경로(esbuild 경로 vs AngularBuildPipeline 경로)가 직접 상호작용하지는 않으나, 같은 패키지 내에서 동일 개념에 다른 이름을 사용하고 있어 유지보수 시 혼란 가능성이 있다.

**개선 방향:** 한쪽으로 통일. `postcssPlugins`이 PostCSS 공식 라이브러리의 네이밍(`postcssPlugin` 프로퍼티)과 일치하므로 이 쪽으로 통일하는 것이 자연스러움.
