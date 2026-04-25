# `SdClientPackageConfig`

> **읽어야 하는 상황**: 프론트엔드 클라이언트 패키지를 설정할 때 (서버 연결, Capacitor/Electron, 브라우저 호환성, PWA 등). 라이브러리 패키지는 [`SdBuildPackageConfig`](.$sd-build-package-config.md) 참조.

esbuild 기반으로 빌드되며 개발 시 Vite dev server를 사용한다.

```typescript
export interface SdClientPackageConfig {
  target: "client";
  server: string | number;
  env?: Record<string, string>;
  publish?: SdPublishConfig;
  capacitor?: SdCapacitorConfig;
  electron?: SdElectronConfig;
  configs?: Record<string, unknown>;
  exclude?: string[];
  browserSupport?: SdBrowserSupportConfig;
  pwa?: false | SdPwaConfig;
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `target` | `"client"` | 빌드 타겟 식별자 |
| `server` | `string \| number` | 연결할 서버 패키지명 (예: `"my-server"`) 또는 포트 직접 지정 (하위 호환) |
| `env` | `Record<string, string>?` | 빌드 시 치환할 환경 변수. `process.env`를 객체로 치환 |
| `publish` | [`SdPublishConfig?`](.$sd-publish-config.md) | 배포 설정 |
| `capacitor` | [`SdCapacitorConfig?`](.$sd-capacitor-config.md) | Capacitor 모바일 앱 설정 |
| `electron` | [`SdElectronConfig?`](.$sd-electron-config.md) | Electron 데스크톱 앱 설정 |
| `configs` | `Record<string, unknown>?` | 런타임 설정. 빌드 시 `dist/.config.json`으로 기록 |
| `exclude` | `string[]?` | Capacitor/Electron `package.json`에 추가할 패키지 목록 |
| `browserSupport` | [`SdBrowserSupportConfig?`](.$sd-browser-support-config.md) | 브라우저 지원 설정 |
| `pwa` | `false \| SdPwaConfig?` | PWA 설정. `false`이면 비활성화. 미지정 시 기본값으로 활성화 |
