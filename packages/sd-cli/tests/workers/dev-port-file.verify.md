# 포트 파일 기록/삭제 — LLM 검증

## 검증 항목
- [x] client.worker에서 dev 모드 serverReady 후 writeDevPort 호출: `client.worker.ts:250-253` — serverReady(248) 직후 `fs.writeFileSync(path.join(distDir, ".dev-port"), String(actualPort))` 확인
- [x] client.worker에서 legacy 모드 serverReady 후 writeDevPort 호출: `client.worker.ts:331-332` — serverReady(329) 직후 `fs.writeFileSync(path.join(info.pkgDir, "dist", ".dev-port"), String(serverPort))` 확인
- [x] ViteEngine.stop()에서 deleteDevPort 호출: `ViteEngine.ts:202-204` — `fs.unlinkSync(portFile)` with try-catch 확인
