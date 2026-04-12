# 디버그: replaceDeps 변경 시 서버 리빌드 누락

## 출처

- **origin:** `direct` — 사용자 직접 입력
- **완료 시 참고:** 해당 없음

## 문제 증상

- **유형:** 동작 이상
- **증상:** 기대: orm-common 수정 → watch/dev 리빌드 → 브라우저에서 변경 적용 / 실제: watch/dev 리빌드 성공 로그 출력되었으나 브라우저에서 old code 실행. client는 "의존성 변경 감지됨" 출력되었으나 server는 감지 메시지조차 없음
- **위치:** `packages/sd-cli/src/workers/server-build.worker.ts:466-479`
- **재현 절차:** simplysm watch 중 → 소비앱 dev 중 → orm-common 파일 수정 → 서버 리빌드 안 됨 → 브라우저에서 MySQL initialize 시 오류 → dev 재시작 시 해결

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|                                | E1: client만 리빌드 보고, server는 무반응 | E2: 브라우저에서 old code → 오류 | E3: dev 재시작 시 해결 |
| ------------------------------ | ----------------------------------------- | -------------------------------- | ---------------------- |
| H1: metafile 경로 불일치       | C(code)                                   | C(code)                          | C(code)                |
| H2: Vite pre-bundle 캐시       | I — server 무반응을 설명 못함             | C(code)                          | C(code)                |

### 결과: 확정 — H1

**원인:** `server-build.worker.ts`의 metafile 필터링에서 esbuild metafile input 경로(pnpm symlink resolved `.pnpm` store 경로)와 FsWatcher 보고 경로(symlink 경로 `node_modules/@simplysm/...`)가 불일치하여 `hasRelevantChange = false` → 서버 리빌드가 조용히 건너뜀 → 서버 미재시작

**코드 위치:**
- `server-build.worker.ts:467-468`: esbuild metafile keys를 절대 경로로 변환 (resolved `.pnpm` 경로)
- `server-build.worker.ts:404-408`: FsWatcher 감시 경로 (symlink `node_modules/@simplysm/...` 경로)
- `server-build.worker.ts:471`: `metafileAbsPaths.has(c.path)` — 경로 불일치로 항상 false

## 해결 방안

### 방안 1.1: FsWatcher 경로를 realpath fallback으로 비교

- **설명:** `hasRelevantChange` 비교 시 symlink 경로로 먼저 비교하고, 실패하면 `fs.realpathSync()`로 실제 경로를 구해서 재비교
- **장점:** 원인의 정확한 지점만 수정, 변경 최소화
- **반론:** `realpathSync`가 매 변경마다 호출되어 약간의 성능 비용
- **점수:** 근본해결 10/10, 변경리스크 8/10, 범용성 9/10 → **평균 9.0/10**

## 선택 결과

**방안 1.1** (평균 9.0/10)

사용자 선택. `server-build.worker.ts:471`에서 realpath fallback 추가.
