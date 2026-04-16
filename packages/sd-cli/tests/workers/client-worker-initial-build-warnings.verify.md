# 초기 빌드 warnings 전달 — LLM 검증

## 검증 항목

- [x] client.worker.ts의 initialBuildResolve에 warnings 필드가 포함되는지: `client.worker.ts:305-315` — `initialBuildResolve`에 `warnings: result.warnings.length > 0 ? result.warnings.map(formatEsbuildMessage) : undefined` 포함 확인. 후속 빌드(line 295-298)와 동일 패턴
- [x] warnings가 없을 때 undefined인지: `client.worker.ts:312-314` — `result.warnings.length > 0` 조건으로 빈 배열일 때 undefined 반환 확인
- [x] ClientBuildResult 인터페이스에 warnings 필드가 있는지: `client.worker.ts:47` — `warnings?: string[]` 확인. 변경 불필요
