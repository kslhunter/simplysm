# Vite 빌드 의존성 정리 — LLM 검증

## 검증 항목

### Scenario: 빌드 전용 Vite 플러그인 의존성 제거
- [x] vite-plugin-pwa가 package.json dependencies에서 제거됨: package.json에 vite-plugin-pwa 미존재 확인
- [x] vite-plugin-solid가 package.json dependencies에서 제거됨: package.json에 vite-plugin-solid 미존재 확인

### Scenario: Vitest용 Vite 의존성을 devDependencies로 이동
- [x] vite가 devDependencies에 존재하고 dependencies에 없음: package.json:55 `"vite": "^7.3.2"` in devDependencies
- [x] vite-tsconfig-paths가 devDependencies에 존재하고 dependencies에 없음: package.json:56 `"vite-tsconfig-paths": "^6.1.1"` in devDependencies

### Scenario: workbox 관련 타입 정리
- [x] SdPwaWorkboxConfig 인터페이스가 sd-config.types.ts에서 삭제됨: grep "SdPwaWorkboxConfig" → No matches found
- [x] SdPwaConfig에서 workbox 필드가 삭제됨: grep "workbox" → No matches found
- [x] pnpm typecheck sd-cli 통과: 0개 에러, 0개 경고

### Scenario: ViteEngine.ts 삭제
- [x] engines/ViteEngine.ts 파일이 존재하지 않음: `test -f` → DELETED
- [x] engines/index.ts에서 ViteEngine 미참조: grep "ViteEngine" engines/index.ts → No matches found
- [x] tests/engines/vite-engine.spec.ts 삭제됨: `test -f` → DELETED

### Scenario: 의존성 변경 �� lockfile 갱신
- [x] pnpm install 성공: Packages: +1 -184, Done in 6.1s
