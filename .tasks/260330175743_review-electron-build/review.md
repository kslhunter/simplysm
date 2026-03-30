# sd-review: sd-cli Electron 빌드

| 항목 | 내용 |
|------|------|
| 분석 대상 | `packages/sd-cli/src/electron/electron.ts` + 관련 파일 3개 |
| 일시 | 2026-03-30 17:57 |
| 대상 파일 수 | 4 (electron.ts, BuildOrchestrator.ts, DevWatchOrchestrator.ts, esbuild-config.ts) |
| 발견 이슈 수 | 4건 (Critical 1, Medium 1, Low 2) |

---

## Critical

### LOGIC-001: `_copyBuildOutput`에서 glob 결과의 경로가 잘못 해석됨

```
id: LOGIC-001
severity: Critical
category: 로직
location: packages/sd-cli/src/electron/electron.ts:337
title: fsx.glob의 cwd 옵션 사용 시 경로 해석 오류로 빌드 산출물 복사 실패
```

**description:**

`_copyBuildOutput`에서 `fsx.glob("*.exe", { cwd: distPath })`를 호출한다. `fsx.glob` 내부(`core-node/src/utils/fs.ts:458-461`)에서 `glob` v13의 결과를 `path.resolve(item.toString())`로 변환하는데, `glob`이 `cwd` 옵션 사용 시 **상대 경로**(`"Setup 1.0.0.exe"`)를 반환하므로, `path.resolve`는 이를 `distPath`가 아닌 **`process.cwd()`** 기준으로 해석한다.

결과적으로 `sourcePath`는 `{process.cwd()}/Setup 1.0.0.exe`가 되어 실제 파일 위치(`{pkgPath}/.electron/dist/Setup 1.0.0.exe`)와 다르다. 이후 `fsx.copy`는 소스 파일이 없으면 **조용히 return**하므로(`core-node/src/utils/fs.ts:182-183`), 에러 없이 빌드 산출물이 누락된다.

- `allExeFiles.length > 0` 체크(line 338)는 통과하지만, 실제 복사는 실행되지 않는다
- 사용자에게 경고 메시지도 표시되지 않는다

**suggestion:**

`fsx.glob`을 절대 패턴으로 호출하거나, 반환된 경로를 `distPath` 기준으로 해석한다:

```typescript
// 방법 1: 절대 패턴 사용 (프로젝트 내 다른 fsx.glob 호출과 일관)
const allExeFiles = await fsx.glob(path.resolve(distPath, "*.exe"));

// 방법 2: fsx.glob에 absolute 옵션 전달
const allExeFiles = await fsx.glob("*.exe", { cwd: distPath, absolute: true });
```

---

## Medium

### LOGIC-002: `run()`의 시그널 핸들러가 정리되지 않아 stale 참조 및 double dispose 위험

```
id: LOGIC-002
severity: Medium
category: 로직
location: packages/sd-cli/src/electron/electron.ts:157-171
title: Electron 정상 종료 시 SIGINT/SIGTERM 핸들러 미제거로 ctx.dispose() 이중 호출 가능
```

**description:**

`run()` 메서드에서 Promise 종료를 제어하는 두 가지 경로가 있다:

1. **Electron 정상 종료** (line 106-112): `resolveTermination()` → `ctx.dispose()` + `resolve()`
2. **시그널 수신** (line 163-166): `signalHandler()` → `currentElectron.kill()` + `ctx.dispose()` + `resolve()`

Electron이 정상 종료되면 `resolveTermination()`이 호출되어 Promise가 resolve되고 `run()`이 반환되지만, **SIGINT/SIGTERM 핸들러는 `process`에 등록된 채 남는다**. 이 핸들러는 이미 dispose된 `ctx`를 참조한다.

- `process.once`이므로 같은 핸들러가 두 번 실행되지는 않지만, `run()`이 여러 번 호출되면 stale 핸들러가 누적된다
- Electron 종료와 SIGINT가 거의 동시에 발생하면 `ctx.dispose()`가 두 번 호출될 수 있다 (esbuild context의 dispose 멱등성이 보장되지 않음)

**suggestion:**

`resolveTermination` 호출 시 시그널 핸들러를 제거하고, `signalHandler` 호출 시에도 상호 정리한다:

```typescript
const signalHandler = () => { ... };
process.once("SIGINT", signalHandler);
process.once("SIGTERM", signalHandler);

resolveTermination = () => {
  process.removeListener("SIGINT", signalHandler);
  process.removeListener("SIGTERM", signalHandler);
  void ctx.dispose();
  resolve();
};
```

---

## Low

### DESIGN-001: `exclude` 패키지가 esbuild externals에 포함되지 않아 이중 포함

```
id: DESIGN-001
severity: Low
category: 설계
location: packages/sd-cli/src/electron/electron.ts:200-206,250
title: exclude 패키지가 package.json에는 추가되지만 esbuild external에는 누락
```

**description:**

`_setupPackageJson`(line 200-206)에서 `exclude` 패키지를 Electron의 `package.json` dependencies에 추가하지만, `_bundleMainProcess`(line 250)와 `run()`(line 124)의 esbuild `external` 목록에는 `reinstallDependencies`만 포함된다.

```
reinstallDependencies → package.json ✓, esbuild external ✓ (런타임 해석)
exclude              → package.json ✓, esbuild external ✗ (번들 + 설치 = 이중 포함)
```

`exclude` 패키지는 esbuild에 의해 번들에 포함되고, 동시에 `npm install`로 `node_modules`에도 설치된다. 순수 JS 패키지라면 동작에 문제는 없으나, esbuild가 번들링할 수 없는 패키지(동적 require, 네이티브 바인딩 등)가 `exclude`에 포함되면 번들링이 실패할 수 있다.

**suggestion:**

`exclude` 패키지도 esbuild `external`에 추가하여 `reinstallDependencies`와 동일하게 처리하거나, `exclude`의 용도를 명확히 구분하여 문서화한다.

### DESIGN-002: `description`(선택 필드)이 productName과 파일명에 사용됨

```
id: DESIGN-002
severity: Low
category: 설계
location: packages/sd-cli/src/electron/electron.ts:298,332
title: 선택적 description 필드가 electron-builder productName과 출력 파일명에 직접 사용됨
```

**description:**

`_runElectronBuilder`(line 298)에서 `productName: this._npmConfig.description`을 설정하고, `_copyBuildOutput`(line 332)에서 `description`을 exe 파일명의 일부로 사용한다.

- `NpmConfig.description`은 optional(line 14)이므로 `undefined`일 수 있다
  - `productName: undefined` → electron-builder가 fallback으로 sanitized name 사용 (의도와 다를 수 있음)
  - line 332의 `?? this._npmConfig.name` fallback은 있지만, 이것도 sanitized name이 아닌 원본 name
- `description`에 공백이나 특수문자가 포함될 수 있어 파일명으로 부적합할 수 있다 (예: `"My App & Tools"` → `My App & Tools-latest.exe`)

**suggestion:**

`productName`을 위한 전용 설정을 `SdElectronConfig`에 추가하거나, `description`을 파일명으로 사용할 때 특수문자를 sanitize한다.
