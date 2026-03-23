# 디버그: 21개 패키지 동시 `yarn npm publish` 시 프로세스 멈춤

## 에러 증상

- **에러 메시지:** 없음 (무한 대기, 에러/로그 출력 없이 정지)
- **위치:** `packages/sd-cli/src/entry/SdCliProject.ts:336`
- **재현:** `yarn publish --noBuild` 실행 시, 21개 패키지 모두 "배포 시작..." 로그 후 무응답

## 근본 원인 추적 (Why Chain)

1. **증상:** 21개 패키지가 "배포 시작..." 로그를 출력한 후 프로세스가 멈춤. "배포 완료" 로그가 하나도 출력되지 않음
2. **왜?** → `_publishPkgAsync`가 호출하는 `SdProcess.spawnAsync("yarn", ["npm", "publish", ...])` 프로세스가 종료되지 않아 Promise가 resolve되지 않음
3. **왜?** → `parallelAsync`가 `Promise.all()`로 구현되어 21개 `yarn npm publish` 자식 프로세스가 **동시에** 생성됨 (concurrency 제한 없음)
4. **왜?** → Yarn Berry(v4)의 `yarn npm publish`는 내부적으로 프로젝트 레벨 락/캐시/install-state에 접근하며, 동일 워크스페이스에서 다수의 yarn 프로세스가 동시 실행되면 **락 경합(lock contention)** 또는 **리소스 고갈**이 발생함
5. **근본 원인:** `parallelAsync` (= `Promise.all`)에 **동시 실행 제한이 없어** 21개 Yarn 프로세스가 동시 생성되고, Yarn 내부 락 경합 또는 npm 레지스트리 동시 요청 제한에 의해 모든 프로세스가 블로킹됨

### 핵심 코드 경로

```
SdCliProject.publishAsync (line 336)
  └─ pkgPaths.parallelAsync(...)      ← Promise.all, 제한 없음
       └─ _publishPkgAsync (line 375)
            └─ SdProcess.spawnAsync("yarn", ["npm", "publish", ...])  ← 21개 동시 spawn
```

`parallelAsync` 구현 (`Array.ext.ts:246`):
```typescript
async parallelAsync<T, R>(fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  return await Promise.all(this.map(async (item, index) => await fn(item, index)));
}
```

## 해결 방안

### 방안 A: `parallelAsync`를 순차 실행(`for...of`)으로 변경

- **설명:** `publishAsync`의 배포 루프를 `parallelAsync` 대신 `for...of` 순차 루프로 변경
- **코드 예시:**
  ```typescript
  // Before (SdCliProject.ts:336)
  await pkgPaths.parallelAsync(async (pkgPath) => {
    const pkgName = path.basename(pkgPath);
    const pkgConf = projConf.packages[pkgName];
    if (pkgConf?.publish == null) return;
    logger.debug(`[${pkgName}] 배포 시작...`);
    await this._publishPkgAsync(pkgPath, pkgConf.publish);
    logger.debug(`[${pkgName}] 배포 완료`);
  });

  // After
  for (const pkgPath of pkgPaths) {
    const pkgName = path.basename(pkgPath);
    const pkgConf = projConf.packages[pkgName];
    if (pkgConf?.publish == null) continue;
    logger.debug(`[${pkgName}] 배포 시작...`);
    await this._publishPkgAsync(pkgPath, pkgConf.publish);
    logger.debug(`[${pkgName}] 배포 완료`);
  }
  ```
- **장점:** 가장 단순하고 확실한 해결. 락 경합 완전 제거. 디버깅/로그 추적이 명확함
- **반론:** 21개 패키지를 하나씩 배포하므로 총 배포 시간이 길어짐 (각 패키지당 ~5-10초 가정 시 약 2-3분)
- **점수:**
  - 근본성: 9/10
  - 안정성: 10/10
  - 성능: 4/10
  - 구현 단순성: 10/10
  - → **평균 8.3/10**

### 방안 B: 동시 실행 수 제한 (concurrency limiter) 추가

- **설명:** 배포 루프에 동시 실행 제한(예: 3-5개)을 적용하는 유틸리티를 사용
- **코드 예시:**
  ```typescript
  // Before (SdCliProject.ts:336)
  await pkgPaths.parallelAsync(async (pkgPath) => { ... });

  // After - 동시 실행 제한 3개
  const limit = 3;
  for (let i = 0; i < pkgPaths.length; i += limit) {
    const batch = pkgPaths.slice(i, i + limit);
    await batch.parallelAsync(async (pkgPath) => {
      const pkgName = path.basename(pkgPath);
      const pkgConf = projConf.packages[pkgName];
      if (pkgConf?.publish == null) return;
      logger.debug(`[${pkgName}] 배포 시작...`);
      await this._publishPkgAsync(pkgPath, pkgConf.publish);
      logger.debug(`[${pkgName}] 배포 완료`);
    });
  }
  ```
- **장점:** 병렬성을 일부 유지하면서 락 경합 위험을 줄임. 순차 대비 약 3배 빠름
- **반론:** 적절한 limit 값이 환경에 따라 다를 수 있음. Yarn 내부 락이 프로젝트 단위라면 limit=3이어도 경합 가능성이 남아있음. 배치 경계에서 느린 패키지가 다음 배치를 블로킹
- **점수:**
  - 근본성: 7/10
  - 안정성: 7/10
  - 성능: 8/10
  - 구현 단순성: 7/10
  - → **평균 7.3/10**

### 방안 C: 수행 안 함

- **설명:** 코드를 변경하지 않고, 현재 동작을 유지
- **장점:** 코드 변경 리스크 없음
- **반론:** 퍼블리시가 불가능한 상태가 지속됨. 문제가 해결되지 않음
- **점수:**
  - 근본성: 0/10
  - 안정성: 10/10
  - 성능: 0/10
  - 구현 단순성: 10/10
  - → **평균 5.0/10**

## 추천

**방안 A** (평균 8.3/10)

배포는 빈번하지 않은 작업이며 2-3분의 추가 시간은 허용 가능하다. 순차 실행이 Yarn 락 경합을 완전히 제거하므로 가장 안정적이고 확실한 해결책이다.
