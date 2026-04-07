# menu-utils 통합 + Public API export — LLM 검증

## 검증 항목

- [x] menu-utils.ts가 ISdMenu를 직접 정의하지 않음: `menu-utils.ts:1-3` — ISdMenu를 sd-app-structure.types에서 import 및 re-export
- [x] getMenuRouterLinkOption이 index.ts에서 export됨: `index.ts:177`
- [x] getIsMenuSelected가 index.ts에서 export됨: `index.ts:177`
- [x] matchesSearchText가 index.ts에서 export됨: `index.ts:105`
