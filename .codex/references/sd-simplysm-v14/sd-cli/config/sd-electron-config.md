# `SdElectronConfig`

> **읽어야 하는 상황**: 클라이언트 패키지에 Electron 데스크톱 앱 설정을 추가할 때. 모바일 앱은 [`SdCapacitorConfig`](.$sd-capacitor-config.md) 참조.

Electron 데스크톱 앱 설정. [`SdClientPackageConfig`](.$sd-client-package-config.md)의 `electron` 필드에 사용한다.

```typescript
export interface SdElectronConfig {
  appId: string;
  portable?: boolean;
  installerIcon?: string;
  reinstallDependencies?: string[];
  postInstallScript?: string;
  nsisOptions?: Record<string, unknown>;
  env?: Record<string, string>;
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `appId` | `string` | Electron 앱 ID (예: `"com.example.myapp"`) |
| `portable` | `boolean?` | `true`이면 포터블 `.exe`, `false`/미지정이면 NSIS 설치 프로그램 |
| `installerIcon` | `string?` | 설치 프로그램 아이콘 경로 (`.ico`, 패키지 디렉토리 기준 상대 경로) |
| `reinstallDependencies` | `string[]?` | Electron에 포함할 npm 패키지 목록 (네이티브 모듈 등 별도 설치 필요 패키지) |
| `postInstallScript` | `string?` | npm `postinstall` 스크립트 |
| `nsisOptions` | `Record<string, unknown>?` | NSIS 옵션. `portable`이 `false`일 때 적용 |
| `env` | `Record<string, string>?` | 환경 변수. `electron-main.ts`에서 `process.env`로 접근 가능 |
