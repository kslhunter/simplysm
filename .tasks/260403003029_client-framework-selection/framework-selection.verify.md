# framework 선택 — LLM 검증

## 검증 항목
- [x] Solid 빌드 시 빌드 상태 보고: client.worker.ts의 `build()` 함수는 try-catch로 성공/실패를 반환. framework에 무관하게 `{ success: true/false }` 반환
- [x] Solid dev 모드: client.worker.ts의 `startWatch()`에서 `createClientViteConfig({ framework })` 전달 → solidPlugin이 Vite config에 포함 → `createServer(viteConfig)` 정상 동작
- [x] Solid 빌드 시 Capacitor: BuildOrchestrator에서 Capacitor 빌드는 `engineResult.build.success` 이후 실행. framework과 무관
- [x] Solid 빌드 시 PWA: createClientViteConfig에서 VitePWA 플러그인은 framework 조건 분기 외부에서 추가. framework에 무관
- [x] Angular 패키지와 Solid 패키지 혼합 빌드: createBuildEngine이 패키지별 독립 ViteEngine 생성. 각 ViteEngine은 자기 패키지의 config.framework만 참조
- [x] ViteEngine.run()이 framework 전달: `this._pkg.config.framework`를 worker.build()에 전달 확인
- [x] ViteEngine.startWatch()가 framework 전달: `this._pkg.config.framework`를 worker.startWatch()에 전달 확인
- [x] client.worker.ts 3곳 (startWatch, startLegacyWatch, build) 모두 framework 전달 확인
