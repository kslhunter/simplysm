# @simplysm/sd-cli

simplysm 모노레포의 빌드/배포 오케스트레이터 CLI. entry(`src/index.ts`)가 라이브러리로 재노출하는 것은 `sd.config.ts` 작성용 설정 타입 묶음, Vitest용 Angular AOT Vite 플러그인, 프로그래밍 방식 TS/Angular AOT 컴파일러 클래스 3종. (CLI 서브커맨드 구현 자체는 entry export 대상 아님.)

## 사용 트리거 인덱스

- **sd.config.ts 설정 타입** (`SdConfig`, `SdConfigFn`, `SdConfigParams`, `SdPackageConfig` 계열, `SdPublishConfig` 계열, Capacitor/Electron/PWA 설정 등) — 프로젝트 루트 `sd.config.ts` 를 작성·수정해 패키지 빌드 타겟·배포·앱 패키징을 설정할 때. 자세히: [sd-config-types.md](./sd-config-types.md)
- **SdTsCompiler** (`SdTsCompiler`, `ISdTsCompilerOptions`, `ISdTsCompilerResult`) — 패키지의 `.ts` 를 TS/Angular AOT 로 증분 컴파일하고 진단·emit·lint·SCSS 결과를 한 번에 얻을 때 (빌드 엔진·플러그인 내부에서 사용). 자세히: [SdTsCompiler.md](./SdTsCompiler.md)
- **sdAngularPlugin** — Vitest 에서 Angular 패키지를 AOT 컴파일해 TestBed 로 돌리기 위한 Vite 플러그인을 `vitest.config.ts` 에 끼울 때. 아래 인라인 섹션 참조.

## sdAngularPlugin

Vitest 전용 Vite 플러그인. `SdTsCompiler` 로 대상 패키지의 `.ts` 를 AOT 컴파일하고, `transform` 훅에서 컴파일된 JS 를 반환한다.

```typescript
function sdAngularPlugin(options: SdAngularPluginOptions): Plugin
```

`SdAngularPluginOptions`:

- pkg: string — `sd.config.ts` 의 `packages` 키(패키지 디렉토리명, `@simplysm/` 접두사 제외). `config()` 훅에서 `packages/<pkg>` 를 컴파일 루트로 해석한다. 어느 Angular 패키지를 테스트 빌드할지 지정.

동작: `enforce: "pre"` 플러그인. `buildStart` 에서 내부 `SdTsCompiler`(`output: { js: true, dts: false }`, `includeTests: true`, `rootDir` = cwd)로 패키지 전체를 AOT 컴파일해 소스경로→JS 맵을 만들고, `transform` 훅이 매칭되는 `.ts` 요청에 컴파일된 JS(인라인 소스맵 분리)를 돌려준다. `watchChange` 로 모은 변경 파일을 다음 `buildStart` 의 증분 무효화에 넘기고, `buildEnd` 에서 컴파일러를 폐기해 다음 라운드에 재생성한다. 진단은 logger 로 보고, emit 디스크 출력은 하지 않음.

```typescript
import { sdAngularPlugin } from "@simplysm/sd-cli";
// vitest.config.ts project.plugins 에 추가
plugins: [sdAngularPlugin({ pkg: "angular" })];
```
