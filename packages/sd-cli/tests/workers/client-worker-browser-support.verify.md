# browserSupport 전달로 이중 로딩 제거 — LLM 검증

## 검증 항목

- [x] loadSdConfig import 제거: `client.worker.ts` — `import { loadSdConfig }` 라인이 제거됨. `sd-config` 모듈 import 없음
- [x] resolvePackageInfo가 동기 함수: `client.worker.ts:73` — `function resolvePackageInfo(info: ClientBuildInfo): {` (async 제거, Promise 반환 없음)
- [x] resolvePackageInfo가 info.browserSupport 사용: `client.worker.ts:83-86` — `info.browserSupport?.legacyModule`, `info.browserSupport?.browserslist`, `info.browserSupport?.postCss?.plugins`
