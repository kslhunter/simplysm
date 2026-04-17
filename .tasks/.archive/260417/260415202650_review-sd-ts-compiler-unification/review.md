# 코드 리뷰: sd-ts-compiler-unification

## LOGIC-001 [Medium] build() 함수에서 side-effect SCSS 미처리

- **위치:** packages/sd-cli/src/workers/library-build.worker.ts:80-88

Angular 라이브러리의 one-time build에서 `writeEmitResults`를 SCSS 옵션 없이 호출하고 있다. 이로 인해:

1. emit된 `.js` 파일 내 `import "./foo.scss"` side-effect import가 `.css`로 변환되지 않음
2. 해당 SCSS 파일이 CSS로 컴파일되어 `dist/`에 출력되지 않음
3. `sideEffectScssRegistry`에 항목이 등록되지 않음

반면 watch 경로의 `buildWatchEvent` (library-build.worker.ts:148-175)에서는 SCSS 옵션을 정상적으로 전달하여 side-effect SCSS를 처리한다:

```typescript
// watch 경로 (정상): library-build.worker.ts:154-165
writeEmitResults(
  result.emitResults.filter(...),
  info.pkgDir,
  {
    loadPaths,
    scssErrors: sideEffectScssErrors,
    scssDependencies: combinedScssDeps,
    registry: compiler!.sideEffectScssRegistry,
  },
);

// build 경로 (누락): library-build.worker.ts:82-87
writeEmitResults(
  result.emitResults.filter(...),
  info.pkgDir,
  // ← scss 옵션 없음
);
```

side-effect SCSS import를 사용하는 Angular 라이브러리의 프로덕션 빌드 산출물에 CSS 파일이 누락되고, JS의 import 경로가 `.scss`인 채로 남는다.

**개선 방향:** `build()` 함수에서도 `writeEmitResults`에 SCSS 옵션을 전달하고, `compileSideEffectScss`를 호출하여 watch 경로와 동일한 처리를 수행한다.

---

## DESIGN-001 [Low] globalScss 플래그를 Angular 판별 프록시로 사용

- **위치:** packages/sd-cli/src/workers/library-build.worker.ts:146, 203

워커에서 Angular 여부를 `info.output.globalScss === true`로 판별한다. 현재 `NgtscEngine`만 `globalScss: true`를 전달하므로 기능적으로 정상이지만, 의미론적으로 SCSS 컴파일 옵션과 Angular 여부는 별개 개념이다.

향후 non-Angular 패키지에서 global SCSS가 필요하거나, Angular 패키지에서 global SCSS를 비활성화하는 경우 오동작한다.

**개선 방향:** `BuildOutput`에 명시적 `isAngular?: boolean` 플래그를 추가하거나, 워커 내부에서 `SdTsCompiler` 결과의 `result.isForAngular`를 사용한다.

---

## DESIGN-002 [Low] 미사용 타입 정의 (dead code)

- **위치:** packages/sd-cli/src/angular/ngtsc-build-core.ts:16-34

`NgtscBuildInfo`, `NgtscBuildResult`, `NgtscCombinedBuildEvent` 인터페이스가 정의되어 있으나, `ngtsc-build.worker.ts` 삭제 후 어디에서도 import되지 않는다. 프로젝트 전체 검색 결과 `ngtsc-build-core.ts` 내 정의만 존재한다.

**개선 방향:** 세 인터페이스를 삭제한다.

---

## CONSIST-001 [Low] loadPaths 구성 로직 4회 중복

- **위치:**
  - packages/sd-cli/src/ts-compiler/SdTsCompiler.ts:170
  - packages/sd-cli/src/ts-compiler/SdTsCompiler.ts:276
  - packages/sd-cli/src/ts-compiler/SdTsCompiler.ts:95
  - packages/sd-cli/src/workers/library-build.worker.ts:150

`[path.join(pkgDir, "scss"), path.join(cwd, "node_modules")]` 패턴이 동일하게 4곳에서 반복된다. SdTsCompiler 내부 3곳은 private 헬퍼로, 워커의 1곳은 SdTsCompiler의 public API를 통해 통합할 수 있다.

**개선 방향:** SdTsCompiler에 `_getLoadPaths(): string[]` private 메서드를 추출하여 내부 중복을 제거한다. 워커의 loadPaths는 SdTsCompiler API를 통해 접근하거나, 최소한 동일 패턴임을 주석으로 명시한다.
