# Feature 3.1 타입 추론 — LLM 검증

## 검증 항목

- [x] SdSheetCellContext<T>의 $implicit과 item이 T 타입으로 선언되어 있다: sd-sheet-column.ts:9-10 확인 — `$implicit: T`, `item: T`
- [x] SdSheetColumnCellTemplate의 ngTemplateContextGuard 반환 타입이 SdSheetCellContext<TContextItem>이다: sd-sheet-column-cell-template.ts:14 확인 — `_ctx is SdSheetCellContext<TContextItem>`
- [x] SdSheetColumnCellTemplate.cell input이 T[]를 받아 제네릭 T를 추론한다: sd-sheet-column-cell-template.ts:9 확인 — `cell = input.required<T[]>()`
- [x] index.ts에서 SdSheetColumnCellTemplate과 type SdSheetCellContext가 export된다: index.ts:227-228 확인
