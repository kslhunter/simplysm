# 디버그: esbuild 커스텀 namespace에서 Windows 절대 경로 resolve 실패

## 에러 증상

- **에러 메시지:** `Could not resolve "D : /workspaces-12/oscom/node_modules/core-js/modules/es.symbol.description.js"` (268개 모듈 전부)
- **위치:** `packages/sd-cli/src/pkg-builders/client/SdPolyfillPlugin.ts:31`
- **재현:** oscom 프로젝트에서 `yarn watch` 실행 시 `sd-polyfill:sd-polyfills` 가상 모듈의 모든 import가 resolve 실패

## 근본 원인 추적 (Why Chain)

1. **증상:** esbuild가 `"D : /workspaces-12/oscom/node_modules/core-js/modules/..."` 경로를 resolve 하지 못함
2. **왜?** → `SdPolyfillPlugin`의 `onLoad` 핸들러가 `import "D:/workspaces-12/..."` 형태의 Windows 절대 경로를 가상 모듈 contents에 생성함
3. **왜?** → `onLoad` return에 `resolveDir`이 없음. esbuild는 커스텀 namespace(`sd-polyfill`)의 가상 모듈에서 발생하는 import를 파일시스템 경로로 인식하지 못함. `file` namespace가 아닌 경우, esbuild는 자체적으로 파일시스템 resolution을 수행하지 않는다.
4. **근본 원인:** esbuild의 커스텀 namespace 설계상, `onLoad`에서 `resolveDir`을 제공하지 않으면 반환된 contents 내의 import 경로를 파일시스템으로 resolve 할 수 없다. Windows에서는 `D:/path` 형태가 URL scheme으로 오해석되어 `"D : /path"`로 표시된다.

### 이전 버전과의 차이

- **v12.16.37** (7097fd4b3): 정적 파일 `lib/chrome61-polyfills.js`에 bare specifier(`import "core-js/actual/..."`) 사용 → `file` namespace에서 정상 resolve
- **v12.16.38** (66d440fd8): `SdPolyfillPlugin`으로 리팩터링, `core-js-compat` 기반 동적 생성, `_require.resolve()` + `PathUtils.posix()` 사용 → 커스텀 namespace + 절대 경로 조합이 문제

## 해결 방안

### 방안 A: `resolveDir` 추가 + bare specifier 사용

- **설명:** `onLoad` return에 `resolveDir`을 추가하고, import문에 절대 경로 대신 bare specifier를 사용
- **코드 예시:**
  ```typescript
  // Before
  build.onLoad({ filter: /.*/, namespace: SD_POLYFILL_NS }, () => {
    // ...
    const absPath = _require.resolve(`core-js/modules/${mod}.js`);
    lines.push(`import "${PathUtils.posix(absPath)}";`);
    // ...
    return { contents: lines.join("\n"), loader: "js" };
  });

  // After
  build.onLoad({ filter: /.*/, namespace: SD_POLYFILL_NS }, () => {
    // ...
    _require.resolve(`core-js/modules/${mod}.js`); // 존재 여부만 확인
    lines.push(`import "core-js/modules/${mod}.js";`);
    // ...
    return {
      contents: lines.join("\n"),
      loader: "js",
      resolveDir: path.dirname(fileURLToPath(import.meta.url)),
    };
  });
  ```
- **장점:** esbuild의 정규 resolution 메커니즘을 활용. OS 무관하게 동작. `_require.resolve()`의 존재 여부 검증 + esbuild 자체 resolution 분리로 관심사 분리
- **반론:** `resolveDir`이 sd-cli 패키지 디렉터리를 가리키므로, `core-js`가 sd-cli의 dependencies에서 resolve 가능해야 함 (현재 `"core-js": "^3.49.0"`으로 충족). 단, sd-cli가 소비 프로젝트와 다른 `core-js` 버전을 가지면 불일치 가능
- **점수:** 정확성 9/10, 유지보수성 9/10, 호환성 9/10 → **평균 9.0/10**

### 방안 B: `resolveDir` 추가 + 절대 경로 유지

- **설명:** `onLoad` return에 `resolveDir`만 추가. 기존 절대 경로 import는 유지
- **코드 예시:**
  ```typescript
  // Before
  return { contents: lines.join("\n"), loader: "js" };

  // After
  return {
    contents: lines.join("\n"),
    loader: "js",
    resolveDir: path.dirname(fileURLToPath(import.meta.url)),
  };
  ```
- **장점:** 최소 변경. 기존 `_require.resolve()` 절대 경로 생성 로직 유지
- **반론:** Windows에서 `D:/path` 형태의 절대 경로가 `resolveDir` 제공 시에도 esbuild에서 올바르게 인식되는지 보장 없음. esbuild가 `D:`를 URL scheme으로 파싱하는 문제가 `resolveDir`으로 해결되는지 불확실. 근본적으로 Windows 드라이브 문자 + forward slash 조합의 안정성 문제가 남음
- **점수:** 정확성 6/10, 유지보수성 7/10, 호환성 5/10 → **평균 6.0/10**

### 방안 C: 수행 안 함

- **설명:** 현재 코드를 유지하고 수정하지 않음
- **장점:** 변경 리스크 없음
- **반론:** 에러가 계속 발생하여 polyfill 빌드가 불가능. 사용처 프로젝트의 watch/build가 동작하지 않음
- **점수:** 정확성 0/10, 유지보수성 10/10, 호환성 0/10 → **평균 3.3/10**

## 추천

**방안 A** (평균 9.0/10)

`resolveDir` + bare specifier 조합이 esbuild 커스텀 namespace 플러그인의 정석적 패턴이며, Windows 경로 파싱 문제를 원천적으로 회피한다.
