# `SdConfig`

> **읽어야 하는 상황**: `sd.config.ts` 파일을 처음 작성하거나 최상위 설정 구조(`packages`, `replaceDeps`, `postPublish`)를 수정할 때. 개별 패키지 설정은 [`SdPackageConfig`](.$sd-package-config.md) 참조.

`sd.config.ts`는 반드시 [`SdConfigFn`](#sdconfigfn) 형식의 함수를 default export해야 한다.

## When to use

- ✅ 프로젝트 루트에 `sd.config.ts`를 작성할 때 — 이 인터페이스가 최상위 설정 구조를 정의한다
- ✅ 의존성 교체(`replaceDeps`) 또는 배포 후 스크립트(`postPublish`)를 설정할 때

```typescript
export interface SdConfig {
  packages: Record<string, SdPackageConfig | undefined>;
  replaceDeps?: Record<string, string>;
  postPublish?: SdPostPublishScriptConfig[];
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `packages` | `Record<string, SdPackageConfig \| undefined>` | 패키지별 설정. key: `packages/` 하위 디렉토리명 (예: `"core-common"`) |
| `replaceDeps` | `Record<string, string>?` | 의존성 교체 설정. `node_modules` 패키지를 로컬 소스로 심링크 교체. key: 패키지 glob 패턴, value: 소스 디렉토리 경로. key의 `*`에서 캡처된 값이 value의 `*`에 치환됨 |
| `postPublish` | [`SdPostPublishScriptConfig[]?`](.$sd-post-publish-script-config.md) | 배포 완료 후 실행할 스크립트 목록 |

## Related Types

### `SdConfigParams`

`sd.config.ts` 함수에 전달되는 매개변수.

```typescript
export interface SdConfigParams {
  cwd: string;
  dev: boolean;
  opt: string[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `cwd` | `string` | 현재 작업 디렉토리 |
| `dev` | `boolean` | 개발 모드 플래그 (`pnpm dev` 실행 시 `true`) |
| `opt` | `string[]` | 추가 옵션 (`-o` 플래그에서 전달된 값 배열) |

### `SdConfigFn`

`sd.config.ts`가 default export해야 하는 함수 타입.

```typescript
export type SdConfigFn = (params: SdConfigParams) => SdConfig | Promise<SdConfig>;
```

## Usage

```typescript
import type { SdConfigFn } from "@simplysm/sd-cli";

const config: SdConfigFn = (params) => ({
  packages: {
    "core-common": { target: "neutral" },
    "core-node": { target: "node" },
    "my-client": {
      target: "client",
      server: "my-server",
    },
    "my-server": {
      target: "server",
      publish: { type: "npm" },
    },
  },
  replaceDeps: {
    "@simplysm/*": "../simplysm/packages/*",
  },
});

export default config;
```
