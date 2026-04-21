# Slice 2: 포트/설정 파일 기록 — LLM 검증

## 검증 항목

- `.dev-port` 파일 기록 패턴 유지: 기존 `client.worker.ts:246,319`에서 `fs.writeFileSync(path.join(distDir, ".dev-port"), String(port))` 패턴을 사용 중이며, 이 패턴은 호출자(worker/engine)에서 동일하게 사용 가능. `createDevHttpServer`의 `listen()` 반환값(port)을 사용하여 기록 가능.
- `.config.json` 기록 패턴 유지: 기존 `client.worker.ts:439-448`의 `writeConfigJson` 함수가 `fs.mkdirSync + fs.writeFileSync(JSON.stringify)` 패턴으로 구현되어 있으며, Feature 3.1(EsbuildClientEngine)에서 동일하게 호출 가능.
- configs 미설정 시 빈 객체: 기존 `writeConfigJson`에서 `configs ?? {}`로 처리 (`client.worker.ts:445`). 이 패턴은 호출자가 그대로 유지.
- 파일 기록 책임 분리: `createDevHttpServer`는 HTTP 서빙에만 집중하고, `.dev-port`/`.config.json` 기록은 호출자 책임 (설계 결정 D3 준수).
