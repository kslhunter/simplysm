# AppStructureService — LLM 검증

## 검증 항목

- index.ts export: `service-server/src/index.ts:27`에서 `export * from "./services/app-structure-service"` 확인
- ServiceDefinition 타입 호환: `defineService()`의 반환 타입이 `ServiceDefinition<TMethods>`이고, `AppStructureService`가 이를 그대로 반환. `define-service.ts:144-153` 참조
- AppStructureServiceType 타입: `ServiceMethods<ReturnType<typeof AppStructureService>>` → `ServiceDefinition<{ getItems(): Record<string, AppStructureItem[]> }>`에서 `M` 추출 → `{ getItems(): Record<string, AppStructureItem[]> }`. `define-service.ts:164-165` 참조
