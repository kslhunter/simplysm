# `BuildTarget`

> **읽어야 하는 상황**: 라이브러리 패키지의 빌드 플랫폼 값(`"node"` / `"browser"` / `"neutral"`)을 참조하거나 타입을 지정할 때.

esbuild로 빌드되는 라이브러리 패키지의 타겟 플랫폼을 나타내는 타입.

```typescript
export type BuildTarget = "node" | "browser" | "neutral";
```

| 값 | 설명 |
|----|------|
| `"node"` | Node.js 전용 패키지. esbuild `platform: "node"` |
| `"browser"` | 브라우저 전용 패키지. esbuild `platform: "browser"` |
| `"neutral"` | Node/브라우저 공용 패키지. esbuild `platform: "neutral"` |

## Usage

[`SdBuildPackageConfig`](./sd-build-package-config.md)의 `target` 필드에 사용한다.

```typescript
import type { SdConfigFn } from "@simplysm/sd-cli";

const config: SdConfigFn = () => ({
  packages: {
    "core-common": { target: "neutral" },
    "core-node": { target: "node" },
    "core-browser": { target: "browser" },
  },
});

export default config;
```
