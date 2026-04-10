# SdAppStructureProvider 리팩토링 — LLM 검증

## 검증 항목

- [x] `abstract serviceKey: string` 선언 존재: 확인 (`sd-app-structure.provider.ts:21`)
- [x] `abstract usableModules`, `abstract permRecord` 유지: 확인 (`sd-app-structure.provider.ts:22-23`)
- [x] `abstract items` 제거, `readonly items = signal<AppStructureItem<TModule>[]>([])` 존재: 확인 (`sd-app-structure.provider.ts:25`)
- [x] `fetchItems()` 메서드에서 `this._clientFactory.get(this.serviceKey)` 호출: 확인 (`sd-app-structure.provider.ts:28`)
- [x] `fetchItems()`에서 `getService<AppStructureServiceType>("AppStructure")` 호출: 확인 (`sd-app-structure.provider.ts:29`)
- [x] `fetchItems()`에서 `this._config.clientName`으로 필터링: 확인 (`sd-app-structure.provider.ts:31-32`)
- [x] computed signal에서 `this.items()` (signal 호출) 사용: 확인 (`sd-app-structure.provider.ts:37,40`)
- [x] 메서드에서 `this.items()` 사용: 확인 (`sd-app-structure.provider.ts:48,52,57`)
- [x] `AppStructureService` 타입을 `@simplysm/service-common`에서 import: 확인 (`sd-app-structure.provider.ts:3`)
