# onBuild 콜백 시그니처에서 lint 제거 — LLM 검증

## 검증 항목

- `SdAngularPluginOptions.onBuild` 타입에서 `lint?` 필드가 제거됨: `vite-angular-plugin.ts:32-35` — `result` 타입이 `{ success: boolean; errors?: string[]; warnings?: string[] }` 으로 변경됨, `lint?` 없음
- `CreateClientViteConfigOptions.onBuild` 타입에서 `lint?` 필드가 제거됨: `vite-config.ts:34-37` — 동일하게 `lint?` 없음
- `vite-angular-plugin.ts`에서 `LintWithProgramResult` import 제거됨: import 목록에 해당 import 없음
- `vite-angular-plugin.ts`의 3개 `onBuild` 호출 지점(buildStart:321, handleHotUpdate:409, handleHotUpdate:433)에서 lint 미전달 — 기존에도 전달하지 않았으므로 변경 없음, 타입 정합
