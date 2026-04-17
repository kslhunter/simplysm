# 코드 리뷰: esbuild Angular Compiler Plugin 자체 구현

## LOGIC-001 [Medium] Worker 에러가 onStart에서 이중 계상됨

- **위치:** `packages/sd-cli/src/esbuild/esbuild-angular-compiler-plugin.ts:417-418, 482-487`

`processWebWorker` 콜백에서 Worker 번들링 에러가 발생하면, 에러를 `errors` 배열에 직접 push하고(line 418), 동시에 `additionalResults`에도 에러를 저장한다(line 427). 이후 onStart 하단(lines 482-487)에서 `additionalResults.values()`를 순회하며 에러를 다시 `errors`에 push한다. 결과적으로 동일한 Worker 에러가 빌드 결과에 **두 번** 포함된다.

원본 `compiler-plugin.js`에서는 `additionalResults`의 에러를 onStart에서 재수집하는 루프가 없다. onEnd에서 `outputFiles`/`metafile`만 병합하고 에러는 processWebWorker 시점에 한 번만 push된다.

**개선 방향:** lines 482-487의 `additionalResults` 에러 수집 루프를 제거하거나, `processWebWorker` 내의 `errors.push()`를 제거하고 `additionalResults` 루프에서만 수집하도록 단일화한다.

---

## LOGIC-002 [Medium] HMR 미지원 변경 시 templateUpdates가 무효화되지 않음

- **위치:** `packages/sd-cli/src/esbuild/esbuild-angular-compiler-plugin.ts:374-377`

`emitHmrUpdateModule`이 `null`을 반환하면(HMR 불가 변경), `break`로 루프를 탈출하지만 `pluginOptions.templateUpdates` Map을 비우거나 `undefined`로 설정하지 않는다. 이 시점에서 이전 iteration에서 이미 추가된 부분적 엔트리가 Map에 남아있을 수 있다.

`sd-hmr-reset` 플러그인이 빌드 시작 시 Map을 clear하지만, 이는 현재 빌드의 onStart **이전**에 실행된다. 현재 onStart 실행 중 루프 도중에 추가된 엔트리는 남아있어, HMR 소비자가 **부분적 업데이트만 적용**하게 될 수 있다. 원본 `aot-compilation.js`에서는 HMR 불가 시 `templateUpdates`를 `undefined`로 설정하여 full rebuild를 유발한다.

**개선 방향:** `emitHmrUpdateModule`이 `null`을 반환하면 `pluginOptions.templateUpdates!.clear()`를 호출한 후 `break`한다. 또는 `templateUpdates` 참조 자체를 undefined로 설정할 수 있는 구조로 변경한다.

---

## LOGIC-003 [Medium] ClientSourceFileCache가 loadResultCache를 무효화하지 않음

- **위치:** `packages/sd-cli/src/esbuild/esbuild-client-config.ts:46-49`

`ClientSourceFileCache`는 `AngularSourceFileCache`를 상속하지만, `invalidate()` 메서드를 오버라이드하여 `loadResultCache.invalidate()`를 호출하지 않는다. 원본 `@angular/build`의 `SourceFileCache.invalidate()`는 내부적으로 `this.loadResultCache.invalidate(file)`을 호출하여 변경된 파일의 JS 변환 캐시를 무효화한다.

현재 구현에서는 watch 모드 중 JS 파일(주로 node_modules)이 변경되면 `MemoryLoadResultCache`에 stale 결과가 남아, `createCachedLoad` 래퍼가 변환 없이 이전 캐시를 반환한다. `sd-build-start` 플러그인이 `loadResultCache.watchFiles`의 mtime 변경을 감지하지만, `sourceFileCache.invalidate(changedFiles)`만 호출하고 `loadResultCache.invalidate()`는 호출되지 않는다.

실질적 영향: node_modules JS 파일이 변경되는 경우(패키지 재설치 등)에 stale 캐시가 서빙된다. 소스 TS 파일은 `typeScriptFileCache`를 통해 올바르게 처리되므로 일반 개발에서는 증상이 드물지만, `pnpm install` 후 dev server를 재시작하지 않으면 문제가 발생할 수 있다.

**개선 방향:** `ClientSourceFileCache`에서 `invalidate()`를 오버라이드하여 `loadResultCache.invalidate(file)`도 호출한다:

```typescript
export class ClientSourceFileCache extends AngularSourceFileCache {
  readonly typeScriptFileCache = new Map<string, string | Uint8Array>();
  readonly loadResultCache = new MemoryLoadResultCache();

  override invalidate(files: Iterable<string>): void {
    for (const file of files) {
      this.loadResultCache.invalidate(file);
    }
    super.invalidate(files);
  }
}
```

---

## DESIGN-001 [Low] lmdb-cache-store.ts의 Cache 클래스가 미사용 (dead code)

- **위치:** `packages/sd-cli/src/esbuild/lmdb-cache-store.ts:56-86`

`Cache<T>` 클래스와 `LmdbCacheStore.createCache()` 메서드가 export되지만, 프로덕션 코드 어디에서도 import/사용되지 않는다. 실제 플러그인 코드(`esbuild-angular-compiler-plugin.ts:277`)에서는 `@angular/build/private`의 `Cache`(`AngularCache`)를 import하여 `LmdbCacheStore`를 래핑한다. 이는 `JavaScriptTransformer`가 Angular 내부 `Cache` 타입을 기대하기 때문이다.

WBS에는 "LmdbCacheStore + Cache 자체 구현"이라고 명시되어 있으나, 실제로 자체 구현된 `Cache`는 사용되지 않고 Angular의 `Cache`가 사용된다. 테스트(`lmdb-cache-store.spec.ts`)에서만 자체 `Cache`를 테스트한다.

**개선 방향:** `Cache` 클래스와 `createCache()` 메서드를 제거하거나, `@angular/build/private`의 `Cache` import를 제거하고 자체 `Cache`를 사용하도록 변경한다. 후자의 경우 `JavaScriptTransformer` 생성자의 캐시 파라미터 타입 호환성 검증이 필요하다.

---

## ~~DESIGN-002~~ [거짓양성] LmdbCacheStore.has() 메서드

- **위치:** `packages/sd-cli/src/esbuild/lmdb-cache-store.ts:30-32`

`has(key)` 메서드는 프로덕션 코드에서 직접 호출되지 않으나, `@angular/build/private`의 `Cache` 생성자가 요구하는 `CacheStore` 인터페이스의 필수 멤버이다. 제거하면 `TS2345` 타입 에러가 발생한다. **거짓양성으로 제외.**
