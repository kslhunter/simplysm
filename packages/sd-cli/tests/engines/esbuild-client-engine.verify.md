# EsbuildClientEngine Slice 1 — LLM 검증

## 검증 항목

- legacy 프로덕션 빌드: client.worker.ts build()에서 `legacyModule` 플래그가 resolvePackageInfo()를 통해 sd.config.ts에서 읽히고 createClientEsbuildContext()에 전달됨 (line 100, 124). esbuild-client-config.ts에서 splitting:false, import-meta:false 적용 확인 (line 160, 171)
- legacy dev watch: startWatch()에서 동일하게 legacyModule이 전달되고 (line 224), legacyModule=true 시 templateUpdates를 undefined로 전달하여 Angular HMR banner를 비활성화 (line 227). CSS swap + full-reload만 동작
- device 호환성 (.dev-port): startWatch()에서 포트 할당 후 dist/.dev-port에 기록 (line 319). EsbuildClientEngine.stop()에서 .dev-port 삭제 (line 153-154)
- device 호환성 (dist/ 구조): esbuild가 dist/에 직접 write:true로 출력 (esbuild-client-config.ts line 163). Capacitor/Electron이 dist/에서 접근 가능한 구조 유지
- framework 필드 제거: SdClientPackageConfig에서 framework 필드 삭제됨 (sd-config.types.ts 확인). ClientBuildInfo에서 framework 필드 삭제됨 (client.worker.ts line 27-42). EsbuildClientEngine.run()에서 framework을 worker에 전달하지 않음
- ClientBuildInfo.exclude 제거: ClientBuildInfo에 exclude 필드 없음 (client.worker.ts line 27-42). SdClientPackageConfig.exclude는 Capacitor/Electron용으로 유지
- scopeRebuild 이벤트 제거: ClientWorkerEvents에 scopeRebuild 없음 (client.worker.ts line 53-58). EsbuildClientEngine에서 scopeRebuild 이벤트 구독 안 함 (자동 테스트로도 검증)
- .config.json 기록: build()에서 writeConfigJson() 호출 (line 169). startWatch()에서 writeConfigJson() 호출 (line 318)
- 팩토리 교체: engines/index.ts에서 ViteEngine → EsbuildClientEngine으로 교체 확인. import 및 생성자 호출 모두 EsbuildClientEngine 사용
- stopWatch 리소스 정리 순서: esbuild context dispose → HMR close → HTTP server close → public watcher close (line 332-360). 구현계획의 순서와 일치
- resolvePackageInfo의 dev 고정값: build()에서도 `dev: true`로 loadSdConfig를 호출함 (line 82). build 모드에서는 `dev: false`여야 할 수 있으나, 기존 ViteEngine도 동일한 패턴이므로 기존 동작 유지. 별도 수정 불요
