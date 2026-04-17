# 코드 리뷰: worker-plugin

## DESIGN-001 [Low] `bundleWebWorker`에서 메인 빌드의 `external` 설정이 Worker 번들에 상속됨

- **위치:** packages/sd-cli/src/esbuild/esbuild-worker-plugin.ts:43-55

`bundleWebWorker` 함수에서 `...build.initialOptions`를 spread하여 Worker 번들 빌드 옵션을 구성한다.
이때 메인 빌드의 `external` 설정이 그대로 Worker 번들에 상속된다.

서버 빌드에서는 `external`에 `node_modules` 패키지들이 포함되어 있으므로,
만약 서버 코드 또는 서버가 참조하는 패키지에 `new Worker(new URL(...))` 패턴이 있으면,
Worker 번들이 해당 모듈을 external로 처리하여 브라우저 Worker 런타임에서 import 실패가 발생할 수 있다.

현재 서버 코드에는 해당 패턴이 없으므로 실제 발현되지 않지만, 플러그인이 범용으로 설계된 만큼
`external: undefined`를 명시하여 메인 빌드의 external 설정을 제거하는 것이 안전하다.

**개선 방향:** `bundleWebWorker`의 `buildSync` 옵션에 `external: undefined`를 추가하여 메인 빌드의 external 설정이 Worker 번들에 상속되지 않도록 한다.

---

## DESIGN-002 [Low] Angular 플러그인의 `workerResultsByContainingFile`에서 증분 빌드 시 stale outputFiles 중복 push

- **위치:** packages/sd-cli/src/esbuild/esbuild-angular-compiler-plugin.ts:583-593

`workerResultsByContainingFile` Map은 onEnd에서 리셋하지 않고 증분 빌드 간 유지된다.
이는 변경되지 않은 Worker의 metafile/outputFiles가 매 빌드 결과에 포함되도록 하기 위한 의도적 설계이다.

그러나 `.js` 파일의 Worker 패턴이 `createCachedLoad` 캐시 히트로 콜백이 실행되지 않는 경우,
이전 빌드에서 저장된 Worker `outputFiles`가 매 rebuild마다 `result.outputFiles`에 중복 push된다.
`write: false` 환경(watch/dev)에서 동일한 Worker 번들 바이트가 매번 outputFiles에 추가되므로
메모리 사용량이 미세하게 증가하고, 후속 처리(`writeChangedOutputFiles`)에서 동일 파일을 불필요하게 비교한다.

실동작에 영향은 없다 — `writeChangedOutputFiles`는 내용이 같으면 쓰기를 건너뛴다.

**개선 방향:** 수행 안 함이 적절하다. 실동작에 영향이 없고, 증분 빌드에서 Worker metafile 유지라는 핵심 요구사항을 충족하고 있다. 불필요한 복잡도를 추가하는 것보다 현재 단순한 구조를 유지하는 것이 낫다.
