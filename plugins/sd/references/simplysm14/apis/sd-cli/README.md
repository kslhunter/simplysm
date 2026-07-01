# @simplysm/sd-cli

`src/index.ts` 가 노출하는 공개 심볼은 세 묶음뿐이다: 프로젝트 루트 `sd.config.ts` 설정 타입, Vitest 전용 Angular AOT Vite 플러그인(`sdAngularPlugin`), 패키지 단위 TypeScript/Angular 컴파일러 API(`SdTsCompiler`). CLI 진입점·오케스트레이터 등 내부 구현은 노출되지 않으므로 문서 대상이 아니다.

## 사용 트리거 인덱스

- **sd.config.ts 설정 타입군** — 프로젝트 루트 `sd.config.ts` 에서 패키지별 target·배포·클라이언트/서버 패키징·Capacitor/Electron·PWA·watch 훅·의존성 교체·postPublish 구조를 작성할 때. 자세히: [sd-config-types.md](./sd-config-types.md)
- **SdTsCompiler 컴파일러 API** — 패키지 디렉토리 1개를 TypeScript 또는 Angular AOT 로 컴파일하고 진단·emit·lint·SCSS 결과를 직접 다룰 때. 자세히: [SdTsCompiler.md](./SdTsCompiler.md)
- **sdAngularPlugin** — Vitest/Vite 에서 Angular 패키지의 `.ts` 파일을 AOT 컴파일해 transform 결과로 공급할 때. 아래 인라인 섹션 참고. 테스트 작성 규약: [test.md](../../manuals/test.md)

## sdAngularPlugin

```typescript
interface SdAngularPluginOptions {
  pkg: string;
}

function sdAngularPlugin(options: SdAngularPluginOptions): Plugin;
```

Angular AOT 컴파일을 수행하는 Vite 플러그인(Vitest 전용). `SdTsCompiler` 로 대상 패키지 `.ts` 를 AOT 컴파일하고, `transform` 훅에서 컴파일된 JS 를 돌려준다.

- `sdAngularPlugin(options): Plugin` — `name: "sd-angular"`, `enforce: "pre"` 인 Vite 플러그인을 생성한다.
- `options: SdAngularPluginOptions` — 플러그인 설정 객체.
- `pkg: string` — `process.cwd()/packages/<pkg>` 로 해석되는 대상 패키지 디렉토리명; `config()` 훅 전에 `buildStart()` 가 호출되면 "config() 훅이 먼저 호출되어야 합니다" 에러를 던진다.

훅 동작(코드 기준):

- `config()` — `process.cwd()/packages/<pkg>` 를 패키지 디렉토리로 확정한다.
- `watchChange(id)` — 변경 파일 경로를 posix 문자열로 모았다가 다음 `buildStart()` 의 증분 컴파일 입력(`modifiedFiles`)으로 넘기고 비운다.
- `buildStart()` — 최초 또는 `buildEnd()` 이후 `SdTsCompiler` 를 `output: { js: true, dts: false }`, `includeTests: true`, `compilerOptionsTransformer`(noEmit 해제·declaration 끔·inlineSourceMap 켬·rootDir=cwd)로 생성해 `compileAsync(modifiedFiles)` 를 실행하고, emit 결과를 소스 경로→JS 맵에 채운다; 이미 초기화됐고 변경 파일이 없으면 재컴파일을 건너뛴다. 진단과 SCSS 에러는 logger 로 보고한다.
- `transform(_code, id)` — query 를 제거한 `.ts` 경로가 emit 맵에 있을 때만 처리하며, 그 외에는 `undefined` 를 반환해 패스한다. base64 inline source map 이 있으면 `{ code, map }` 로 분리하고, 없으면 `{ code, map: null }` 을 반환한다.
- `buildEnd()` — 내부 `SdTsCompiler` 참조를 비워 다음 빌드 사이클에서 컴파일러를 새로 만들게 한다.
