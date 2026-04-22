# sdAngularPlugin

Angular AOT 컴파일을 수행하는 Vite 플러그인. Vitest 환경에서 Angular 컴포넌트를 포함한 TypeScript 패키지를 컴파일할 때 사용한다.

```typescript
export function sdAngularPlugin(options: SdAngularPluginOptions): Plugin;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `options` | `SdAngularPluginOptions` | 플러그인 옵션 |

## Returns

`Plugin` — Vite 플러그인 객체

## Vite 훅

| 훅 | 동작 |
|----|------|
| `config` | `process.cwd()/packages/{pkg}` 경로를 `resolvedPkgDir`로 초기화 |
| `watchChange` | Vitest watch 모드에서 변경된 파일 경로를 `pendingWatchChanges`에 수집 |
| `buildStart` | `SdTsCompiler` 초기화 → `compileAsync()` → emit 결과를 내부 맵에 캐싱. watch 재빌드 시 변경 파일로 증분 재컴파일 |
| `transform` | `.ts` 파일 요청 시 캐싱된 컴파일 결과 반환 + 인라인 소스맵 분리 |
| `buildEnd` | `SdTsCompiler` 참조 해제 |

## Related Types

### `SdAngularPluginOptions`

```typescript
export interface SdAngularPluginOptions {
  pkg: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `pkg` | `string` | `sd.config.ts` `packages` 키 (패키지 디렉토리명). 예: `"my-client"` |

## Usage

`vite.config.ts` 또는 `vitest.config.ts`에 플러그인을 등록한다.

```typescript
import { defineConfig } from "vite";
import { sdAngularPlugin } from "@simplysm/sd-cli";

export default defineConfig({
  plugins: [sdAngularPlugin({ pkg: "my-client" })],
});
```
