# angular app-structure re-export/위임 — LLM 검증

## 검증 항목

- [x] angular types.ts가 공유 타입 5개를 service-common에서 re-export: `sd-app-structure.types.ts:1-7`에서 `SdAppStructureItem`, `SdAppStructureGroupItem`, `SdAppStructureLeafItem`, `SdAppStructureSubPermission`, `SdFlatPermission`을 `@simplysm/service-common`에서 re-export 확인
- [x] angular 전용 타입(SdMenu, SdFlatMenu, SdPermission)은 angular에서 로컬 정의 유지: `sd-app-structure.types.ts:9-29`에서 3개 인터페이스가 직접 정의됨, service-common에 없음 확인
- [x] angular index.ts export 목록에 동일 타입 유지: `index.ts:38-44`에서 SdAppStructureItem, SdMenu, SdFlatMenu, SdPermission, SdFlatPermission 5개 export 확인, SdAppStructureUtils/SdAppStructureProvider/usePermsSignal도 유지
- [x] SdFlatPermission 중복 정의 없음: types.ts에 SdFlatPermission 로컬 정의가 제거되었고, service-common re-export만 존재
- [x] SdAppStructureUtils에서 private _isUsableModules/_isUsableModulesChain 메서드 제거 확인: utils.ts에 해당 메서드 없음
- [x] SdAppStructureUtils.getFlatPermissions가 service-common으로 위임: `return getFlatPermissions(items, usableModules)` 단일 위임 확인
