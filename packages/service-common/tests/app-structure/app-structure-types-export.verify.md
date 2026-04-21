# service-common 공유 타입 export — LLM 검증

## 검증 항목

- TSdAppStructureItem이 service-common index.ts에서 export되는가: `index.ts:12`에서 `export * from "./app-structure/app-structure.types"`, `app-structure.types.ts:1`에서 `export type TSdAppStructureItem` 확인
- ISdAppStructureGroupItem이 service-common에서 export되는가: `app-structure.types.ts:5`에서 `export interface ISdAppStructureGroupItem` 확인
- ISdAppStructureLeafItem이 service-common에서 export되는가: `app-structure.types.ts:14`에서 `export interface ISdAppStructureLeafItem` 확인
- ISdAppStructureSubPermission이 service-common에서 export되는가: `app-structure.types.ts:26`에서 `export interface ISdAppStructureSubPermission` 확인
- ISdFlatPermission이 service-common에서 export되는가: `app-structure.types.ts:34`에서 `export interface ISdFlatPermission` 확인
- getFlatPermissions, isUsableModules, isUsableModulesChain이 service-common에서 export되는가: `index.ts:13`에서 `export * from "./app-structure/app-structure.utils"`, 각 함수 `export function` 확인
