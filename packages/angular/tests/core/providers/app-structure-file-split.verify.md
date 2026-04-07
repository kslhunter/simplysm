# SdAppStructureProvider 파일 3분할 — LLM 검증

## 검증 항목

- [x] index.ts export 심볼 8개 동일: SdAppStructureProvider, usePermsSignal (from provider), SdAppStructureUtils (from utils), TSdAppStructureItem, ISdMenu, ISdFlatMenu, ISdPermission, ISdFlatPermission (from types) — 분할 전과 동일한 8개 심볼 확인
- [x] non-public 타입 미공개: ISdAppStructureGroupItem, ISdAppStructureLeafItem, ISdAppStructureSubPermission은 index.ts에 나타나지 않음 확인
- [x] source import 경로: sd-permission-table.control.ts → types, sd-base-container.control.ts/useViewTitleSignal.ts → provider (변경 불필요, SdAppStructureProvider는 provider에 유지)
- [x] test import 경로: app-structure-provider.spec.ts → TSdAppStructureItem from types, SdAppStructureProvider/usePermsSignal from provider. sd-permission-table-test.fixture.ts → ISdPermission from types
- [x] 파일 의존 방향 단방향: types.ts (import 없음) ← utils.ts (types만 import) ← provider.ts (types + utils import)
