# sd-cli 리팩토링 분석 리포트

| 항목 | 값 |
|------|-----|
| 분석 대상 | `packages/sd-cli/src/` (71개 TypeScript 소스 파일) |
| 분석 일시 | 2026-04-12 |
| 발견 이슈 | 1건 (Medium 1) |

## 분석 요약

sd-cli 패키지는 전반적으로 잘 구조화되어 있다. 의존 방향이 깨끗하고(commands -> orchestrators -> engines -> workers), 순환 의존성이 없으며, 도메인별 디렉토리 분리(angular/, capacitor/, electron/, esbuild/, dev-server/)가 명확하다. BaseEngine의 Template Method 패턴, BuildEngine 인터페이스 추상화, Worker Thread 격리 등 핵심 설계 패턴이 적절히 적용되어 있다.

검증 과정에서 다수의 후보 이슈(EsbuildClientEngine 미상속, BaseOrchestrator god class, capacitor-android.ts 비대 등)를 검토했으나, 모두 의도적 설계이거나 현재 규모에서 적절한 수준으로 판단하여 제외했다.

## 이슈 목록

### STRUCT-001: electron.ts 내부 esbuild 번들링 설정 중복

- **id**: STRUCT-001
- **severity**: Medium
- **category**: 구조
- **location**: `packages/sd-cli/src/electron/electron.ts`
- **title**: run()과 _bundleMainProcess()에서 esbuild 설정이 중복 구성됨

**description**:

`run()` (dev 모드, 89-203행)과 `_bundleMainProcess()` (프로덕션 빌드, 287-314행)에서 동일한 esbuild 설정이 각각 독립적으로 구성된다:

- entryPoint 해석 + 존재 확인 (4줄)
- builtinModules 계산 (1줄)
- reinstallDeps 추출 (1줄)
- envBanner/bannerJs 구성 (3줄)
- esbuild 옵션 객체 (8개 동일 키: entryPoints, outfile, platform, target, format, bundle, external, banner)

두 메서드의 차이점은 `run()`이 `esbuild.context()` + watch 모드 + electron-restart 플러그인 + `ELECTRON_DEV_URL` env를 사용하고, `_bundleMainProcess()`는 `esbuild.build()` one-shot 실행이라는 점뿐이다. 공통 설정이 동기화되지 않으면 한쪽만 수정되는 불일치가 발생할 수 있다.

**suggestion**:

공통 esbuild 옵션을 생성하는 private 메서드를 추출한다:

```typescript
private async _createBaseEsbuildOptions(extraEnv?: Record<string, string>) {
  const entryPoint = pathx.posixResolve(this._pkgPath, "src/electron-main.ts");
  if (!(await fsx.exists(entryPoint))) {
    throw new Error(`electron-main.ts 파일을 찾을 수 없습니다: ${entryPoint}`);
  }
  const builtinModules = module.builtinModules.flatMap((m) => [m, `node:${m}`]);
  const reinstallDeps = this._config.reinstallDependencies ?? [];
  const envBanner = createEnvBanner({ ...this._config.env, ...extraEnv });
  const bannerJs =
    "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" +
    envBanner;
  return {
    entryPoints: [entryPoint],
    outfile: pathx.posixResolve(this._srcPath, "electron-main.js"),
    platform: "node" as const,
    target: "node20",
    format: "esm" as const,
    bundle: true,
    external: ["electron", ...builtinModules, ...reinstallDeps, ...this._exclude],
    banner: { js: bannerJs },
  };
}
```

`run()`과 `_bundleMainProcess()`는 이 메서드를 호출한 뒤 각자 필요한 옵션(plugins, context vs build)만 추가한다. 영향 범위는 `electron.ts` 단일 파일이며, ~15줄 절감과 설정 불일치 위험 제거 효과가 있다.
