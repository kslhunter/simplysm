# 코드 리뷰: build-cache-optimization + dev-scss-use-hmr

| 항목 | 값 |
|------|-----|
| 분석 대상 | `1.1-build-cache-optimization`, `1.1-dev-scss-use-hmr` |
| 일시 | 2026-04-04 |
| 분석 파일 수 | 6개 (소스 3, 테스트 2, 유틸 1) |
| 발견 이슈 | 3건 (Critical 1, Medium 1, Low 1) |

## 분석 대상 파일

- `packages/sd-cli/src/angular/vite-angular-plugin.ts`
- `packages/sd-cli/src/angular/client-transform-stylesheet.ts`
- `packages/sd-cli/src/utils/scss-compiler.ts`
- `packages/sd-cli/tests/angular/vite-angular-plugin-scss-hmr.spec.ts`
- `packages/sd-cli/tests/angular/scss-disk-cache.spec.ts`
- `packages/sd-cli/src/utils/angular-compiler.ts`

## 이슈 목록

### Critical

```
id: LOGIC-001
severity: Critical
category: 로직
location: packages/sd-cli/src/angular/vite-angular-plugin.ts:208-216
title: SCSS 디스크 캐시가 구현되었으나 활성화되지 않음 (dead code)
description:
  `createClientTransformStylesheet()` 호출 시 `cacheDir` 옵션이 전달되지 않는다.
  `client-transform-stylesheet.ts:76`의 `if (cacheDir != null)` 분기가 항상 false이므로,
  task에서 설계한 SCSS 디스크 캐시(파일 해시 + 의존성 해시 기반)가 실제로는 작동하지 않는다.
  
  현재 코드:
    const transformStylesheet = createClientTransformStylesheet({
      loadPaths: [...],
      postCssPlugins: options.postCssPlugins,
      scssErrors,
      scssDependencies,
      // cacheDir 누락
    });

  `scss-disk-cache.spec.ts`는 `cacheDir`를 직접 전달하여 단위 테스트를 통과하지만,
  실제 Vite 플러그인 경로에서는 캐시가 비활성화 상태다.
  Linker 캐시(vite-angular-plugin.ts:138-140)는 정상 연결됨.
suggestion:
  `buildStart()`에서 `cacheDir`를 전달한다. task 설계(D5)에 따르면:
  cacheDir: path.join(path.dirname(options.tsconfig), ".cache", "scss")
```

### Medium

```
id: CONSIST-001
severity: Medium
category: 일관성
location: packages/sd-cli/tests/angular/vite-angular-plugin-scss-hmr.spec.ts
title: dev-scss-use-hmr 요구명세의 styleUrl 시나리오가 Vite 아키텍처에서 불필요
description:
  task 요구명세에 styleUrl 시나리오가 2건 정의되어 있으나, Vite 모드에서
  외부 stylesheet은 `externalStylesheets` 매핑을 통해 Vite의 CSS 파이프라인이 처리한다.
  
  angular-compiler.ts:242-251의 `resourceNameToFileName`이 SHA256 해시 경로를 반환하므로,
  외부 SCSS는 `transformStylesheet`을 거치지 않아 `scssDependencies`에 등록되지 않는다.
  따라서 `handleHotUpdate`의 SCSS 역방향 탐색은 inline SCSS 전용이다.
  
  외부 SCSS의 @use 의존성 HMR은 Vite의 내장 CSS dep tracking이 처리한다.
  task 요구명세의 styleUrl 시나리오는 사실상 Vite가 이미 커버하는 영역이다.
suggestion:
  task 요구명세에서 styleUrl 시나리오를 삭제하거나,
  "Vite CSS 파이프라인이 처리" 주석을 추가한다.
```

### Low

```
id: DESIGN-001
severity: Low
category: 설계
location: packages/sd-cli/src/angular/client-transform-stylesheet.ts:112-116
title: SCSS 캐시 의존성 해시 실패 시 silent skip으로 인한 잠재적 stale cache
description:
  캐시 저장 시 의존성 파일의 해시를 계산하는 루프에서 `readFileHash`가 undefined를 
  반환하면 해당 의존성이 캐시 엔트리에서 누락된다:
  
    for (const depPath of result.dependencies) {
      const depHash = await readFileHash(depPath);
      if (depHash != null) {
        depHashes.push({ path: depPath, hash: depHash });
      }
      // depHash == null이면 이 dep는 캐시에 기록되지 않음
    }
  
  이후 캐시 읽기 시 `cached.deps`에 해당 dep가 없으므로 검증을 건너뛴다.
  만약 해당 파일이 나중에 읽기 가능해지고 내용이 변경되면, 캐시가 무효화되지 않는다.
  
  실제 발생 확률은 매우 낮으나 (파일 시스템 일시 장애 등),
  캐시 정합성 관점에서 dep 해시 실패 시 캐시 자체를 저장하지 않는 것이 더 안전하다.
suggestion:
  dep 해시 계산 실패 시 해당 캐시 엔트리 전체를 저장하지 않거나,
  deps 수가 result.dependencies.length와 다르면 캐시 저장을 건너뛰는 가드를 추가한다.
```
