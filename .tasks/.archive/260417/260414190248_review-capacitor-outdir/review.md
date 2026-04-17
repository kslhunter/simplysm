# 코드 리뷰: capacitor-outdir-fix

## 리뷰 결과: 이슈 없음

심층 리뷰를 수행한 결과, LOGIC/CONSIST/PERF/DESIGN 관점에서 유의미한 이슈가 발견되지 않았습니다.

### 분석 범위

- `packages/sd-cli/src/utils/copy-public.ts` — `copyPublicFiles`/`watchPublicFiles` outDir 매개변수 추가
- `packages/sd-cli/src/workers/client.worker.ts` — `build()` 함수의 호출부 수정 (line 102, 164)
- `packages/sd-cli/src/engines/EsbuildClientEngine.ts` — outDir 전달 경로 확인
- `packages/sd-cli/src/orchestrators/BuildOrchestrator.ts` — outDir 생성 원점 확인
- `packages/sd-cli/src/workers/server-build.worker.ts` — 미변경 확인
- `packages/sd-cli/tests/utils/copy-public.spec.ts` — 단위 테스트 확인
- `packages/sd-cli/tests/utils/copy-public.acc.spec.ts` — 인수 테스트 확인

### 검증 결과 요약

| 검증 항목 | 결과 |
|---|---|
| debug.md 근본 원인과 구현 일치 | OK — 2가지 하드코딩 버그 정확히 수정 |
| outDir 데이터 흐름 (BuildOrchestrator → Engine → Worker → 함수) | OK — 끊김 없이 전달 |
| 기존 호출부 하위 호환성 (server-build.worker 등) | OK — 2인자 호출 미변경 |
| dev 모드 격리 (startWatch는 dist/ 고정) | OK — WBS 제외사항 일치 |
| watchPublicFiles 내부 일관성 (distDir, onChange 핸들러) | OK — outDir 일관 적용 |
| 엣지케이스 (outDir 미존재 시 디렉토리 생성) | OK — mkdir 처리 완비 |
| 테스트 커버리지 | OK — outDir 지정/미지정/빈 디렉토리 시나리오 검증 |

### 거짓양성 필터링

| 후보 이슈 | 판단 | 사유 |
|---|---|---|
| `watchPublicFiles`의 `outDir` 파라미터가 현재 호출부에서 미사용 | FALSE POSITIVE | WBS에서 "API 일관성을 위해 추가"로 명시된 의도적 설계 결정 |
| `server-build.worker.ts`의 `.config.json` 경로 방식 차이 | FALSE POSITIVE | server 빌드는 outDir 개념 부재, `ServerBuildInfo` 타입에 해당 필드 없음 |
