# SdAddressSearchModal — LLM 검증

## 검증 항목
- [x] ISdModal<IAddress> 인터페이스 준수: `initialized: Signal<boolean>` (signal(false)), `close: OutputEmitterRef<IAddress>` (output<IAddress>()) — 정상
- [x] daum 전역 타입 선언: `declare const daum` + `IDaumPostcodeData` 인터페이스 — @ts-expect-error 없이 타입 안전, 정상
- [x] index.ts export: `SdAddressSearchModal`, `type IAddress` 모두 export — 정상
- [x] v14 패턴 준수: `$signal` → `signal()` 치환 완료, OnInit import 제거 (Angular 21 런타임 미제공), standalone + OnPush — 정상
- [x] 코딩 규칙: `@ts-expect-error` 0건, `as any` 0건, `console.*` 0건 — 정상
