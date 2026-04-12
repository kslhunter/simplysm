# Code Review: Vite 제거 및 esbuild 기반 빌드 시스템 전환

| 항목 | 값 |
|------|-----|
| 분석 대상 | `.tasks/260410180818_vite-removal-esbuild-migration` 구현 결과 |
| 일시 | 2026-04-11 |
| 분석 파일 수 | 새로 추가 8개 + 수정 11개 + 삭제 9개 = 28개 소스 파일 |
| 발견 이슈 | 8건 (Critical 1, Medium 3, Low 4) |

---

## Critical

### LOGIC-001

```
id: LOGIC-001
severity: Critical
category: 로직
location: packages/sd-cli/src/utils/esbuild-client-config.ts:118-124
title: dev 모드에서 ngHmrMode 미정의로 Angular HMR 비작동
description: |
  현재 define 설정은 build 모드에서만 ngHmrMode를 "false"로 정의하고,
  dev 모드에서는 아무것도 정의하지 않는다.

  Angular의 createCompilerPlugin이 templateUpdates 옵션과 함께 컴파일한 HMR 초기화 코드는
  `typeof ngHmrMode !== "undefined" && ngHmrMode` 가드로 보호된다.
  ngHmrMode가 esbuild define에 없으면 런타임에 undefined로 평가되어 가드가 실패한다.

  동일하게 hmrBanner(esbuild-client-config.ts:139)의
  `if(typeof ngHmrMode!=="undefined"&&ngHmrMode)` 도 실패하여
  import.meta.hot 폴리필이 생성되지 않는다.

  결과: template/styles HMR이 동작하지 않음 (에러 없이 무시됨).

  Angular의 공식 dev server(@angular/build)는 HMR 활성화 시
  define에 ngHmrMode: "true"를 설정한다.
suggestion: |
  templateUpdates가 제공되고 legacyModule이 아닐 때 ngHmrMode를 "true"로 정의:
  ```typescript
  if (options.templateUpdates != null && options.legacyModule !== true) {
    define["ngHmrMode"] = "true";
  } else if (!isDev) {
    define["ngHmrMode"] = "false";
  }
  ```
```

---

## Medium

### DESIGN-001

```
id: DESIGN-001
severity: Medium
category: 설계
location: packages/sd-cli/src/workers/client.worker.ts:240-294
title: onEnd 콜백의 비동기 작업이 esbuild watch 주기와 동기화되지 않음
description: |
  onEnd 콜백에서 `void (async () => { ... })()` 패턴을 사용하여
  비동기 작업(index.html 생성, HMR 디스패치)을 fire-and-forget으로 실행한다.

  esbuild의 onEnd 플러그인 콜백이 Promise를 반환하면 esbuild가 await하여
  다음 빌드를 시작하기 전에 완료를 보장하지만,
  현재 코드는 void로 Promise를 버리므로 esbuild가 즉시 다음 빌드를 시작할 수 있다.

  결과: 빠른 연속 저장 시 index.html 동시 쓰기, HMR 메시지 순서 역전,
  isInitialBuild 상태 불일치 가능성이 있다.
  실제로는 디바운싱과 파일 쓰기 속도로 인해 발생 빈도가 매우 낮다.
suggestion: |
  1. CreateClientEsbuildOptions.onEnd 타입을 `(result) => void | Promise<void>`로 변경
  2. sd-on-end 플러그인 래퍼에서 Promise를 반환
  3. client.worker.ts의 onEnd에서 void를 제거하고 async 함수로 직접 전달
```

### DESIGN-002

```
id: DESIGN-002
severity: Medium
category: 설계
location: packages/sd-cli/src/utils/dev-http-server.ts:33-82
title: dev HTTP 서버에 Cache-Control 헤더 미설정
description: |
  dev 서버가 정적 파일을 서빙할 때 Cache-Control 헤더를 설정하지 않는다.
  dev 모드의 출력 파일명 패턴이 `[name]` (해시 없음)이므로,
  브라우저가 JS/CSS를 휴리스틱 캐싱하여 리빌드 후에도 이전 버전을 서빙할 수 있다.

  HMR css-update는 `?t=timestamp` 쿼리로 우회하지만,
  full-reload 시 location.reload()는 브라우저 캐시 정책에 따라
  조건부 요청 없이 캐시된 버전을 사용할 수 있다
  (ETag/Last-Modified 헤더도 미설정이므로).
suggestion: |
  JS/CSS 응답에 `Cache-Control: no-cache` 헤더 추가:
  ```typescript
  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-cache",
  });
  ```
```

### LOGIC-002

```
id: LOGIC-002
severity: Medium
category: 로직
location: packages/sd-cli/src/workers/client.worker.ts:177-180
title: 프로덕션 빌드 시 esbuild 에러 상세 정보 유실
description: |
  build() 함수의 catch 블록에서 `errNs.message(err)`로 에러 메시지를 추출한다.
  esbuild의 BuildFailure 에러는 `.message`에 "Build failed with N errors" 같은
  요약만 포함하고, 실제 에러 상세(파일, 라인, 설명)는 `.errors` 배열에 있다.

  현재 코드는 .errors 배열을 읽지 않아 개발자가 빌드 실패 원인을
  파악하기 어렵다.
suggestion: |
  catch 블록에서 esbuild BuildFailure의 errors 배열을 추출:
  ```typescript
  } catch (err) {
    const errors: string[] = [];
    if (err != null && typeof err === "object" && "errors" in err) {
      const buildErrors = (err as { errors: Array<{ text: string }> }).errors;
      errors.push(...buildErrors.map(e => e.text));
    }
    if (errors.length === 0) {
      errors.push(errNs.message(err));
    }
    return { success: false, errors };
  }
  ```
```

---

## Low

### DESIGN-003

```
id: DESIGN-003
severity: Low
category: 설계
location: packages/sd-cli/src/utils/hmr-service.ts:19,45-47
title: HmrService.onBuildStart() 메서드가 노출되지만 호출되지 않음
description: |
  HmrService 인터페이스에 onBuildStart()가 정의되어 있고
  구현도 있지만(templateUpdates.clear()), client.worker.ts에서 호출하지 않는다.
  templateUpdates 클리어는 esbuild-client-config.ts의
  sd-hmr-reset 플러그인(onStart 훅)이 직접 수행한다.

  동일 로직이 두 곳에 존재하여 유지보수 시 혼란을 줄 수 있다.
suggestion: |
  두 가지 중 하나를 선택:
  - A) onBuildStart()를 인터페이스와 구현에서 제거 (sd-hmr-reset이 담당)
  - B) sd-hmr-reset 플러그인을 제거하고 client.worker.ts에서 hmrService.onBuildStart() 호출
```

### DESIGN-004

```
id: DESIGN-004
severity: Low
category: 설계
location: packages/sd-cli/src/workers/client.worker.ts:71-92
title: Worker에서 sd.config.ts 이중 로딩
description: |
  resolvePackageInfo()가 loadSdConfig()를 호출하여 sd.config.ts를 jiti로
  동적 로드한다. 이는 메인 프로세스(Orchestrator)에서 이미 로드한 설정을
  Worker에서 다시 로드하는 것이다.

  browserSupport 설정(legacyModule, browserslist, postcssPlugins)을
  ClientBuildInfo에 포함하여 전달하면 이중 로딩을 제거할 수 있다.
suggestion: |
  ClientBuildInfo에 browserSupport 필드를 추가하고,
  EsbuildClientEngine에서 설정을 전달:
  ```typescript
  interface ClientBuildInfo {
    // ...기존 필드
    browserSupport?: SdBrowserSupportConfig;
  }
  ```
```

### DESIGN-005

```
id: DESIGN-005
severity: Low
category: 설계
location: packages/sd-cli/src/utils/hmr-service.ts:105 + packages/sd-cli/src/utils/hmr-client-script.ts:29-36
title: css-update 메시지의 files 필드가 클라이언트에서 사용되지 않음
description: |
  서버는 css-update 메시지에 변경된 CSS 파일명 목록(files)을 전송하지만,
  HMR 클라이언트 스크립트는 이 필드를 무시하고 모든 <link> 태그의
  href에 cache-busting 쿼리를 추가한다.

  기능적으로 문제없으나 불필요한 네트워크 요청이 발생하며,
  files 필드는 dead data가 된다.
suggestion: |
  클라이언트 스크립트에서 msg.files와 매칭되는 link만 업데이트하거나,
  서버에서 files 필드 전송을 제거
```

### LOGIC-003

```
id: LOGIC-003
severity: Low
category: 로직
location: packages/sd-cli/src/utils/hmr-service.ts:164
title: componentId에 encodeURIComponent 적용이 templateUpdates 키와 불일치할 가능성
description: |
  handleRequest에서 URL의 c 파라미터를 URLSearchParams.get()으로 디코딩한 뒤
  encodeURIComponent()로 다시 인코딩하여 templateUpdates에서 조회한다.

  templateUpdates의 키가 raw 문자열(인코딩 안 된 상태)이면,
  알파벳/숫자만 포함된 일반적 컴포넌트 ID에서는 문제없지만,
  특수문자가 포함된 경우 키 불일치가 발생할 수 있다.

  Angular 컴포넌트 ID는 통상 알파벳이므로 실제 문제 발생 가능성은 매우 낮다.
suggestion: |
  Angular의 createCompilerPlugin이 templateUpdates에 넣는 키 형식을 확인하고,
  인코딩 없이 `templateUpdates.get(componentId)`로 조회하거나
  키 형식에 맞는 변환 적용
```
