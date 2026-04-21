# replaceDeps 감시 통합 — LLM 검증

## 검증 항목

- watchReplaceDeps 시그니처에 optional `options` 파라미터가 추가되었는가: `replace-deps.ts:321`에 `options?: { onChanged?: () => void }` 확인
- onChanged 콜백이 파일 복사 루프 완료 후(for 루프 바깥) 호출되는가: `replace-deps.ts:393`에서 for 루프(346-392) 완료 후 `options?.onChanged?.()` 호출 확인
- 기존 watchReplaceDeps 호출자가 새 시그니처와 호환되는가: `DevWatchOrchestrator.ts:121`에서 2개 인자로 호출 — 3번째 optional 파라미터 생략으로 호환
- esbuild onEnd 플러그인(esbuild-client-config.ts)이 빌드 결과를 외부로 전달하는 경로가 존재하는가: `esbuild-client-config.ts:215-218`에 `sd-on-end` 플러그인이 `options.onEnd(result)` 호출
- hmrService.onBuildEnd()가 metafile 기반으로 HMR 메시지를 디스패치하는 경로가 존재하는가: `hmr-service.ts:49-133`에 metafile 기반 변경 판별 → WS broadcast 로직 존재
