# Worker 빌드 경고가 메인 빌드로 전파됨 — LLM 검증

## 검증 항목

- `transformWorkerPatterns`에서 `workerResult.warnings`를 warnings 배열에 push: `esbuild-worker-plugin.ts:109` — `warnings.push(...workerResult.warnings)` 확인. esbuild.buildSync의 BuildResult.warnings가 그대로 전달됨.
- 반환 결과의 `warnings` 필드에 수집된 경고가 포함됨: `esbuild-worker-plugin.ts:172` — `warnings` 배열이 결과 객체에 포함됨.
- 플러그인의 onLoad에서 warnings를 esbuild에 전달: `esbuild-worker-plugin.ts:210` — `warnings: result.warnings.length > 0 ? result.warnings : undefined` — onLoad 결과에 warnings를 포함하여 esbuild가 빌드 경고로 처리.
