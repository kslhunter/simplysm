# 코드 리뷰: sd-cli 성능 극한 최적화

## PERF-001 [Critical] dev 모드 매 빌드마다 전체 파일 fs.statSync 호출

- **위치:** packages/sd-cli/src/workers/client.worker.ts:233-248

`onEnd` 핸들러에서 `prevMtimes`를 clear한 뒤, `loadResultCache.watchFiles` + `typeScriptFileCache.keys()` 전체를 순회하며 `fs.statSync(file).mtimeMs`를 호출한다. 대규모 프로젝트(1000~2000+ 파일)에서 매 빌드 완료 시 동기 I/O가 수천 회 발생하여 빌드 완료 후 불필요한 지연(50~200ms)이 추가된다.

```typescript
pluginBuild.onEnd(() => {
  if (esbuildResult == null) return;
  prevMtimes.clear();
  const watchTargets = [
    ...esbuildResult.sourceFileCache.loadResultCache.watchFiles,
    ...esbuildResult.sourceFileCache.typeScriptFileCache.keys(),
  ];
  for (const file of watchTargets) {
    try {
      prevMtimes.set(file, fs.statSync(file).mtimeMs);  // 매번 전체 파일 stat
    } catch {
      // 삭제된 파일
    }
  }
});
```

`onStart`(라인 199-231)에서도 동일한 watchTargets를 순회하며 mtime을 비교하므로, 빌드 사이클마다 총 2회 전체 순회가 발생한다.

**개선 방향:** 증분 방식으로 변경. `onEnd`에서 전체 clear 대신, `onStart`에서 감지된 변경 파일만 mtime을 갱신하고 신규 파일만 stat를 호출한다. 또는 `fs.statSync`를 `fs.promises.stat` + `Promise.all` 배치로 전환하여 I/O 병렬화한다.

---

## PERF-002 [Medium] SCSS 역방향 의존성 탐색이 전체 맵을 순회

- **위치:** packages/sd-cli/src/workers/library-build.worker.ts:269-276

Angular watch 모드에서 SCSS/CSS 파일이 변경될 때, `combinedScssDeps` 맵(정방향: 소유파일→의존성)의 **전체 항목**을 순회하며 역방향 탐색을 수행한다. 변경 파일 k개 × 맵 크기 n = O(k×n).

```typescript
if (isAngular && (f.path.endsWith(".scss") || f.path.endsWith(".css"))) {
  const normalizedPath = pathx.posix(f.path);
  for (const [ownerFile, deps] of combinedScssDeps) {  // 전체 맵 순회
    if (deps.has(normalizedPath)) {
      modifiedFiles.add(ownerFile);
    }
  }
}
```

대규모 Angular 프로젝트에서 combinedScssDeps가 200+ 항목이면, SCSS 파일 하나 변경 시 200회 이상의 Set.has 체크가 발생한다.

**개선 방향:** `combinedScssDeps` 갱신 시점(`updateCombinedScssDeps`)에서 역방향 인덱스 `Map<의존성경로, Set<소유파일>>`을 동시에 구축한다. onChange에서 O(1) 조회로 영향받는 파일을 즉시 찾을 수 있다.

---

## PERF-003 [Medium] side-effect SCSS가 변경 여부 무관하게 항상 전체 재컴파일

- **위치:** packages/sd-cli/src/angular/ngtsc-build-core.ts:96-114

`compileSideEffectScss`는 주석에 "항상 모든 항목을 재컴파일한다"고 명시되어 있다. 레지스트리에 등록된 모든 SCSS 파일을 매번 컴파일한다. SCSS 컴파일은 CPU-intensive 작업이므로, side-effect SCSS 50개 중 1개만 변경되어도 50개 전체를 재컴파일하는 것은 심각한 낭비이다.

```typescript
export function compileSideEffectScss(
  registry: ReadonlyMap<string, SideEffectScssEntry>,
  loadPaths: string[],
  scssErrors: string[],
  scssDependencies: Map<string, Set<string>>,
): void {
  for (const entry of registry.values()) {
    try {
      const result = compileScssFile(entry.scssAbsPath, loadPaths);  // 매번 전체 컴파일
      fs.mkdirSync(path.dirname(entry.cssAbsPath), { recursive: true });
      fs.writeFileSync(entry.cssAbsPath, result.css, "utf-8");
      trackDeps(scssDependencies, entry.sourceFileName, result.dependencies);
    } catch (err) {
      scssErrors.push(formatScssError(err, entry.scssAbsPath));
    }
  }
}
```

**개선 방향:** 변경된 SCSS 파일 집합(changedFiles)을 인자로 받아, 해당 파일 또는 그 의존성이 변경된 항목만 재컴파일한다. `scssDependencies` 역방향 인덱스를 활용하면 영향 범위를 O(1)로 판별할 수 있다.

---

## PERF-004 [Medium] emit 결과 처리 시 레지스트리 O(n) 순회 삭제

- **위치:** packages/sd-cli/src/angular/ngtsc-build-core.ts:178-184

`writeEmitResults` 내부에서 각 emit 결과(.js 파일)마다 `scss.registry` 전체를 순회하여 `sourceFileName`이 일치하는 항목을 삭제한다. emit 결과 m개 × 레지스트리 n개 = O(m×n).

```typescript
if (scss.registry != null && sourceFileName != null) {
  for (const [key, entry] of scss.registry) {
    if (entry.sourceFileName === sourceFileName) {
      scss.registry.delete(key);
    }
  }
}
```

**개선 방향:** `Map<sourceFileName, Set<registryKey>>` 역방향 인덱스를 유지하여 O(1) 삭제로 전환한다. 레지스트리 항목 추가/삭제 시 역방향 인덱스도 동기화한다.

---

## PERF-005 [Medium] PostCSS 플러그인의 문자열 슬라이스 반복 복사

- **위치:** packages/sd-cli/src/esbuild/esbuild-postcss-plugin.ts:92-100

JS 파일 내 styles 배열의 CSS 문자열을 PostCSS 처리 후 교체할 때, 역순으로 `string.slice()` + 연결을 반복한다. 교체 1회당 전체 문자열이 메모리에 복사된다. 큰 번들 파일(100KB+)에서 교체가 여러 건이면 O(replacements × fileSize)의 메모리 복사가 발생한다.

```typescript
let modified = code;
const sorted = replacements.sort((a, b) => b.start - a.start);
for (const rep of sorted) {
  const processed = await processor.process(rep.text, { from: file });
  const escaped = JSON.stringify(processed.css);
  modified = modified.slice(0, rep.start) + escaped + modified.slice(rep.end);
  // 매 반복마다 전체 문자열 복사
}
```

**개선 방향:** 청크 배열 방식으로 전환. 정방향으로 순회하며 변경 구간 사이의 원본 텍스트를 청크 배열에 수집한 뒤, 최종 `join('')`으로 한 번에 결합한다. 문자열 복사가 1회로 줄어든다.

---

## PERF-006 [Low] publish 버전 업그레이드 시 패키지별 순차 I/O

- **위치:** packages/sd-cli/src/commands/publish/version-upgrade.ts:50-56

각 패키지의 package.json을 순차적으로 읽고-수정-쓴다. 패키지 30개면 60회(읽기+쓰기)의 순차 I/O가 발생한다. 각 패키지가 서로 독립적이므로 병렬화가 가능하다.

```typescript
for (const pkgPath of allPkgPaths) {
  const pkgJsonPath = path.resolve(pkgPath, "package.json");
  const pkgJson = await fsx.readJson<PackageJson>(pkgJsonPath);
  pkgJson.version = newVersion;
  await fsx.write(pkgJsonPath, json.stringify(pkgJson, { space: 2 }) + "\n");
  changedFiles.push(pkgJsonPath);
}
```

동일 파일(version-upgrade.ts:86-102)의 `computePublishLevels`에서도 패키지별 package.json을 순차로 읽는 동일 패턴이 존재한다.

**개선 방향:** `Promise.all(allPkgPaths.map(async (pkgPath) => { ... }))`로 병렬화한다. `computePublishLevels`도 동일하게 적용한다.

---

## PERF-007 [Low] replace-deps 패턴 매칭 시 배열 선형 검색

- **위치:** packages/sd-cli/src/deps/replace-deps/replace-deps-resolve.ts:203

교체 대상 중복 방지를 위해 `entries.some()` 배열 선형 검색을 사용한다. entries가 누적될수록 매 항목마다 O(n) 비교가 발생한다.

```typescript
if (entries.some((e) => e.actualTargetPath === actualTargetPath)) continue;
```

동일 파일(라인 167-169)에서 replaceDeps 패턴별로 glob을 순차 실행하는 패턴도 존재한다.

**개선 방향:** `Set<string>`으로 `actualTargetPath`를 관리하여 O(1) 중복 검사로 전환한다. glob 호출은 `Promise.all`로 병렬화한다.

---

## PERF-008 [Low] replace-deps watch에서 소스 경로 기반 항목 필터링

- **위치:** packages/sd-cli/src/deps/replace-deps/replace-deps.ts:258-276

watch onChange 핸들러에서 변경된 파일마다 전체 `entries` 배열을 순회하여 `resolvedSourcePath` 일치 여부를 확인한다. watcher가 소스 경로별로 분리되어 있으므로 해당 소스의 entries만 필요하지만, 전체 entries를 순회한다.

```typescript
for (const { path: changedPath } of changeInfos) {
  for (const e of entries) {
    if (e.resolvedSourcePath !== entry.resolvedSourcePath) continue;
    // ...
  }
}
```

**개선 방향:** watcher 생성 시점에서 해당 `resolvedSourcePath`에 해당하는 entries를 사전 필터링하여 클로저에 캡처한다. 또는 `Map<resolvedSourcePath, ReplaceDepEntry[]>`로 인덱싱한다.

---
