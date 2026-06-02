# @simplysm/sd-cli

simplysm 빌드/배포 오케스트레이터 CLI. entry 에서 공개되는 것은 CLI 실행 코드가 아니라 ① `sd.config.ts` 작성용 설정 타입, ② 내부 TypeScript/Angular 컴파일러(`SdTsCompiler`), ③ Vitest 전용 Angular Vite 플러그인(`sdAngularPlugin`) 세 가지뿐이다.

## 사용 트리거 인덱스

- **sd.config.ts 설정 타입** — 프로젝트 루트 `sd.config.ts` 를 작성·수정하며 패키지 빌드 타겟·배포·Capacitor/Electron/PWA·서버 옵션을 지정할 때. 자세히: [sd-config-types.md](./sd-config-types.md)
- **SdTsCompiler / ISdTsCompilerOptions / ISdTsCompilerResult** — sd-cli 외부에서 패키지 단위 TS(또는 Angular AOT) 증분 컴파일을 직접 구동하거나 그 결과(emit·진단·lint·SCSS)를 다룰 때. 자세히: [SdTsCompiler.md](./SdTsCompiler.md)
- **sdAngularPlugin / SdAngularPluginOptions** — Vitest 의 Angular project 에서 `.ts` 를 AOT 컴파일해 주입하는 Vite 플러그인을 설정할 때. (인라인, 아래 참조)

## sdAngularPlugin

```ts
function sdAngularPlugin(options: SdAngularPluginOptions): Plugin   // vite Plugin 반환
interface SdAngularPluginOptions { pkg: string }
```

Angular AOT 컴파일을 수행하는 Vite 플러그인. **Vitest 전용**(`vitest.config.ts` 의 `angular` project plugins 에 등록). 내부적으로 `SdTsCompiler` 로 대상 패키지의 `.ts`(tests 포함, `includeTests: true`)를 AOT 컴파일하고, Vite `transform` 훅에서 컴파일된 JS 를 반환한다. `enforce: "pre"` 로 다른 transform 보다 먼저 동작하며, 컴파일러가 만든 인라인 base64 소스맵을 분리해 Vite 호환 형태(`{ code, map }`)로 넘긴다. `buildEnd` 마다 내부 컴파일러를 폐기해 다음 watch 재빌드 때 재생성하고, watch 변경 파일은 `buildStart` 의 캐시 무효화에 사용한다.

- pkg: string — 컴파일 대상 패키지 디렉토리명. `sd.config.ts` 의 `packages` 키와 동일(`@simplysm/` 접두사 제외한 짧은 이름, 예: `"angular"`). 플러그인은 `process.cwd()/packages/<pkg>` 를 컴파일 루트로 잡으므로, 테스트하려는 Angular 패키지명을 그대로 넣는다.

```ts
// vitest.config.ts
import { sdAngularPlugin } from "@simplysm/sd-cli";
plugins: [sdAngularPlugin({ pkg: "angular" })]
```
