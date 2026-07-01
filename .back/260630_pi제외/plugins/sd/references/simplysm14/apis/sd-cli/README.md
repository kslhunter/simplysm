# @simplysm/sd-cli

`src/index.ts` 가 노출하는 `sd.config.ts` 설정 타입, Angular 테스트용 Vite 플러그인, 패키지 단위 TypeScript/Angular 컴파일러 API.

## 사용 트리거 인덱스

- **sd.config.ts 설정 타입군** — 프로젝트 루트 `sd.config.ts` 에서 패키지별 target·배포·클라이언트/서버 패키징·의존성 교체·postPublish 구조를 작성할 때. 자세히: [sd-config-types.md](./sd-config-types.md)
- **SdTsCompiler 컴파일러 API** — 패키지 1개를 TypeScript 또는 Angular AOT 로 컴파일하고 진단·emit·lint·SCSS 결과를 직접 다룰 때. 자세히: [SdTsCompiler.md](./SdTsCompiler.md)
- **sdAngularPlugin** — Vitest/Vite 에서 Angular 패키지의 `.ts` 파일을 AOT 컴파일해 transform 결과로 공급할 때. 사용법: [test.md](../../manuals/test.md)

## sdAngularPlugin

```typescript
interface SdAngularPluginOptions {
  pkg: string;
}

function sdAngularPlugin(options: SdAngularPluginOptions): Plugin;
```

- `sdAngularPlugin(options): Plugin` — `name: "sd-angular"`, `enforce: "pre"` 인 Vite 플러그인을 만든다; `config()` 에서 대상 패키지 경로를 계산하고 `buildStart()` 에서 `SdTsCompiler` 로 Angular AOT 컴파일을 수행한다.
- `options: SdAngularPluginOptions` — 플러그인 설정 객체.
- `pkg: string` — `process.cwd()/packages/<pkg>` 로 해석되는 패키지 디렉토리명; `config()` 훅 전에 `buildStart()` 가 실행되면 에러가 발생한다.
- `watchChange(id)` — 변경 파일 경로를 posix 문자열로 모아 다음 `buildStart()` 의 증분 컴파일 입력으로 사용한다.
- `buildStart()` — 최초 실행 또는 `buildEnd()` 이후 `SdTsCompiler` 를 생성하고 `includeTests: true`, `output: { js: true, dts: false }` 로 컴파일한다.
- `transform(_code, id)` — query 를 제거한 `.ts` 경로가 컴파일 결과 맵에 있으면 emit 된 JS 를 반환하고, base64 inline source map 이 있으면 `{ code, map }` 으로 분리한다.
- `buildEnd()` — 내부 `SdTsCompiler` 참조를 비워 다음 빌드 사이클에서 새 컴파일러를 만들게 한다.
