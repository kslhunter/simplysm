# ISdMenu 타입 재설계 — LLM 검증

## 검증 항목

- [x] ISdMenu에서 modules 프로퍼티 제거됨: `sd-app-structure.types.ts:34-40` — ISdMenu에 modules 프로퍼티 없음 확인
- [x] ISdMenu에서 TModule 제네릭 제거됨: `sd-app-structure.types.ts:34` — `export interface ISdMenu {` (제네릭 없음)
- [x] ISdMenu에 url 프로퍼티 추가됨: `sd-app-structure.types.ts:37` — `url?: string`
- [x] ISdAppStructureLeafItem에 url 프로퍼티 추가됨: `sd-app-structure.types.ts:22` — `url?: string`
- [x] SdAppStructureUtils.getMenus()에서 modules 제거, url 복사: `sd-app-structure.utils.ts` — Leaf 메뉴 push에 `url: item.url` 포함, modules 미포함
