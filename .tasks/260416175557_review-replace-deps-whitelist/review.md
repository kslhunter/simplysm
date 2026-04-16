# 코드 리뷰: replace-deps-whitelist

## LOGIC-001 [Medium] package.json 보존 테스트가 실제 보존을 검증하지 못함

- **위치:** packages/sd-cli/tests/deps/replace-deps/replace-deps-setup.acc.spec.ts:127-141

소스와 타겟의 package.json이 동일한 `version: "1.0.0"`을 가지고 있어, 복사 필터가 package.json을 제외하지 못하고 덮어써도 테스트가 통과한다. 즉, 필터가 깨져도 테스트가 이를 감지하지 못한다.

**현재 코드:**
```typescript
// beforeEach에서 타겟 생성 (version: "1.0.0")
await fs.promises.writeFile(
  pathx.posix(path.join(targetPkgDir, "package.json")),
  JSON.stringify({ name: "@test/pkg", version: "1.0.0" }),
);

// createSourcePkg에서 소스 생성 (version: "1.0.0")
const pkgJson = { name: "@test/pkg", version: "1.0.0" };

// 검증 — 소스/타겟 version이 같으므로 덮어써도 통과
expect(targetPkgJson.version).toBe("1.0.0");
```

**개선 방향:** 타겟 package.json의 version을 `"2.0.0"` 등 소스와 다른 값으로 설정하고, setupReplaceDeps 실행 후에도 `"2.0.0"`이 유지되는지 검증해야 한다.

---

## CONSIST-001 [Medium] watchReplaceDeps에서 loadFilesField 예외 미처리

- **위치:** packages/sd-cli/src/deps/replace-deps/replace-deps.ts:153-156

`setupReplaceDeps`(79행)는 entry 단위 try-catch로 `loadFilesField` 예외를 잡아 해당 entry만 건너뛰지만, `watchReplaceDeps`(153행)에는 try-catch가 없어 하나의 패키지에서 package.json 파싱 실패 시 전체 watch 설정이 중단된다.

**현재 상태 비교:**
```typescript
// setupReplaceDeps:79 — entry 단위 try-catch 있음
for (const entry of entries) {
  try {
    const files = await loadFilesField(entry.resolvedSourcePath);
    // ...
  } catch (err) {
    logger.error(`[${entry.targetName}] 복사 실패: ${err instanceof Error ? err.message : err}`);
  }
}

// watchReplaceDeps:148-156 — try-catch 없음
for (const entry of entries) {
  if (watchedSources.has(entry.resolvedSourcePath)) continue;
  watchedSources.add(entry.resolvedSourcePath);

  const files = await loadFilesField(entry.resolvedSourcePath);  // 여기서 throw 시 전체 중단
  if (files == null) { ... }
}
```

**개선 방향:** `watchReplaceDeps`의 for 루프 내부에도 entry 단위 try-catch를 추가하여 `setupReplaceDeps`와 동일한 에러 격리 수준을 유지한다.

---

## TEST-001 [Low] watch 테스트에서 npm 기본 파일 변경 감지 테스트 부재

- **위치:** packages/sd-cli/tests/utils/replace-deps-watch.spec.ts

watch 테스트는 `files: ["src"]`에 대한 변경 감지와, files에 없는 파일(`tsconfig.json`)의 무시를 검증한다. 그러나 npm 기본 파일(README.md, LICENSE 등)의 변경이 watch에 의해 감지되는지 테스트가 없다. `watchReplaceDeps`의 npm 기본 파일 감시 로직(164-174행)이 검증되지 않는 상태다.

**개선 방향:** 소스 디렉토리에 README.md를 생성한 후 watch를 시작하고, README.md 변경 시 onChanged가 호출되는지 검증하는 테스트를 추가한다.

---
