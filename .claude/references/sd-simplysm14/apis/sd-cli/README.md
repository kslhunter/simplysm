# @simplysm/sd-cli

simplysm 모노레포의 빌드/배포 오케스트레이터 CLI. entry(`src/index.ts`)가 외부로 노출하는 것은 CLI 실행 코드가 아니라 세 가지뿐: ① `sd.config.ts` 작성용 설정 타입군, ② 패키지 단위 TypeScript/Angular AOT 증분 컴파일러(`SdTsCompiler`)와 그 옵션·결과 타입, ③ Vitest 전용 Angular Vite 플러그인(`sdAngularPlugin`).

## 사용 트리거 인덱스

- **sd.config.ts 설정 타입** — 프로젝트 루트 `sd.config.ts` 를 작성·수정하며 어떤 패키지를 어떤 타겟(`node`/`browser`/`neutral`/`client`/`server`/`scripts`)으로 빌드할지, 배포(npm/로컬/FTP)·Capacitor/Electron/PWA·서버 옵션을 지정할 때. `SdConfigFn` 으로 default export 함수 타입을 잡고 각 패키지를 타겟별 인터페이스로 채움. 자세히: [sd-config-types.md](./sd-config-types.md)
- **SdTsCompiler / ISdTsCompilerOptions / ISdTsCompilerResult / ISdTsCompilerEmitOptions** — sd-cli 외부에서 패키지 단위 TS(또는 Angular AOT) 증분 컴파일을 직접 구동하거나 그 결과(emit·진단·lint·SCSS)를 다룰 때. 자세히: [SdTsCompiler.md](./SdTsCompiler.md)
- **sdAngularPlugin / SdAngularPluginOptions** — Vitest 에서 Angular 패키지의 `.ts` 를 AOT 컴파일해 주입하는 Vite 플러그인을 설정할 때. 아래 인라인 섹션 참조.

## sdAngularPlugin

```typescript
function sdAngularPlugin(options: SdAngularPluginOptions): Plugin; // vite Plugin 반환
interface SdAngularPluginOptions { pkg: string; }
```

Angular AOT 컴파일을 수행하는 **Vitest 전용** Vite 플러그인(`vitest.config.ts` 의 `angular` project plugins 에 등록). 내부에서 `SdTsCompiler` 로 대상 패키지의 `.ts`(tests 포함, `includeTests: true`, `output: { js: true, dts: false }`)를 AOT 컴파일하고, Vite `transform` 훅에서 컴파일된 JS 를 반환한다. `enforce: "pre"` 로 다른 transform 보다 먼저 동작하며, 컴파일러가 만든 인라인 base64 소스맵을 분리해 Vite 호환 형태(`{ code, map }`)로 넘긴다. `compilerOptionsTransformer` 로 `noEmit:false`·`declaration:false`·`inlineSourceMap:true`·`rootDir = cwd` 를 강제하고, `buildEnd` 마다 내부 컴파일러를 폐기해 다음 watch 재빌드 때 재생성하며, watch 변경 파일을 모아 `buildStart` 의 캐시 무효화에 쓴다.

- pkg: string — 컴파일 대상 패키지 디렉토리명. `sd.config.ts` 의 `packages` 키와 동일(`@simplysm/` 접두사 제외한 짧은 이름, 예: `"angular"`). 플러그인은 `process.cwd()/packages/<pkg>` 를 컴파일 루트로 잡으므로, 테스트하려는 Angular 패키지명을 그대로 넣는다.

```typescript
// vitest.config.ts
import { sdAngularPlugin } from "@simplysm/sd-cli";

plugins: [sdAngularPlugin({ pkg: "angular" })];
```
