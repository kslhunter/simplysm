# 디버그: FsWatcher EPERM 에러 — replace-deps 워치 중 Windows 네이티브 watcher 핸들 무효화

## 출처

- **origin:** `direct` — 사용자 직접 입력
- **완료 시 참고:** 해당 없음

## 에러 증상

- **에러 메시지:** `Error: EPERM: operation not permitted, watch`
- **위치:** `FSWatcher._handle.onchange` (node:internal/fs/watchers:207) → `FsWatcher` (core-node/src/features/fs-watcher.ts:140) → `watchReplaceDeps` (sd-cli/src/utils/replace-deps.ts:340)
- **재현:** oscom(소비앱)에서 `sd-cli dev --debug` 실행 후 약 2분 후 발생. replace-deps가 simplysm 소스 패키지 디렉토리를 감시하는 중에 발생.

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | E1: EPERM, 경로 없음 | E2: 시작 후 ~2분 발생 | E3: _handle.onchange에서 발생 | E4: ignored 미설정 |
|----|---------------------|---------------------|---------------------------|------------------|
| H1: 하위 디렉토리 삭제/재생성으로 네이티브 핸들 무효화 | C(doc) | C(code) | C(code) | C(code) |
| H2: ReadDirectoryChangesW 버퍼 오버플로우 | I → 폐기 | N | N | C(infer) |
| H3: Windows Defender/AV 간섭 | C(infer) | C(infer) | N | N |

### 결과: 확정 — H1

감시 대상 하위 디렉토리(dist/ 등)가 simplysm watch 빌드에 의해 삭제/재생성될 때, Windows `ReadDirectoryChangesW` 기반 네이티브 watcher 핸들이 무효화되어 EPERM 발생. (C(doc) 1건, C(code) 3건으로 확정 요건 충족)

**부가 요인:** `watchReplaceDeps`에서 chokidar에 `ignored` 옵션을 전달하지 않아 `node_modules/`, `.cache`, `tests/` 등 불필요한 디렉토리까지 네이티브 watcher 핸들이 생성되어 EPERM 노출 면적이 증가함.

## 해결 방안

### 방안 A: chokidar `ignored` 옵션 추가

- **설명:** `watchReplaceDeps`에서 `EXCLUDED_NAMES`를 chokidar `ignored` 옵션으로 전달하여 불필요한 디렉토리를 네이티브 watcher 레벨에서 제외
- **장점:** EPERM 발생 면적 감소, 성능 개선
- **반론:** dist/ 내부 변경으로 인한 EPERM은 여전히 발생 가능
- **점수:** 안정성 5/10, 근본성 4/10, 호환성 9/10 → **평균 6.0/10**

### 방안 B: FsWatcher EPERM 에러 시 자동 재시작

- **설명:** FsWatcher 에러 핸들러에서 EPERM 감지 시 watcher를 닫고 재생성하여 감시 재개
- **장점:** EPERM 발생 후에도 감시 복구
- **반론:** 재시작 사이 변경 감지 누락 가능, onChange 콜백 재등록 복잡도
- **점수:** 안정성 7/10, 근본성 7/10, 호환성 7/10 → **평균 7.0/10**

### 방안 C: A + B 결합

- **설명:** chokidar `ignored`로 불필요한 감시 제외 + EPERM 에러 시 자동 재시작
- **장점:** EPERM 발생 확률 감소 + 발생 시에도 복구. 가장 안정적
- **반론:** 구현 복잡도가 가장 높음
- **점수:** 안정성 9/10, 근본성 8/10, 호환성 7/10 → **평균 8.0/10**

### 방안 D: `usePolling: true` 사용

- **설명:** 네이티브 fs.watch 대신 폴링 방식으로 변경 감지
- **장점:** EPERM 완전 회피
- **반론:** CPU 사용량 증가, 변경 감지 지연
- **점수:** 안정성 8/10, 근본성 6/10, 호환성 6/10 → **평균 6.7/10**

## 선택 결과

**방안 C: A + B 결합** (평균 8.0/10)

chokidar `ignored` 옵션으로 불필요한 디렉토리 감시를 제외하고, FsWatcher에 EPERM 에러 시 자동 재시작 로직을 추가한다.

### 구현 대상 파일

1. `packages/sd-cli/src/utils/replace-deps.ts` — `watchReplaceDeps`에서 chokidar `ignored` 옵션 전달
2. `packages/core-node/src/features/fs-watcher.ts` — EPERM 에러 감지 시 watcher 재생성 로직 추가
