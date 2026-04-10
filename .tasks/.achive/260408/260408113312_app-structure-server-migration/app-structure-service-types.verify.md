# AppStructureService 인터페이스 — LLM 검증

## 검증 항목

- [x] `AppStructureService` 인터페이스가 `service-common/src/service-types/app-structure-service.types.ts`에 정의됨: 확인. `getItems(): Record<string, AppStructureItem[]>` 메서드 시그니처 존재
- [x] `AppStructureItem` 타입을 `../app-structure/app-structure.types`에서 import: 확인. `import type` 사용
- [x] `service-common/src/index.ts`에서 export: 확인. `export * from "./service-types/app-structure-service.types"` 추가됨
- [x] 기존 패턴(`OrmService`, `AutoUpdateService`)과 동일한 구조: 확인. 동일한 디렉토리, 동일한 인터페이스 export 패턴
