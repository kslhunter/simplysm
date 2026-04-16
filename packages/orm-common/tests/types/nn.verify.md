# nn() symbol 미노출 — LLM 검증

## 검증 항목

- [x] `__nnOriginalData` symbol이 export되지 않음: `queryable.ts:1881`에서 `declare const __nnOriginalData: unique symbol`로 선언되어 있고, `export` 키워드가 없음. `index.ts:12`의 `export * from "./exec/queryable"`는 exported 멤버만 re-export하므로 패키지 외부에서 접근 불가
- [x] `nn` 함수는 export됨: `queryable.ts`에서 `export function nn`으로 선언되어 있어 `index.ts`를 통해 자동 export
