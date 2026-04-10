# Symbol.asyncDispose 제거 + JSDoc 변경 — LLM 검증

## 검증 항목

- [x] ExcelWorkbook에서 `Symbol.asyncDispose` 메서드가 제거됨: `excel-workbook.ts`에 `Symbol.asyncDispose` 키워드 없음 확인
- [x] ExcelWorkbook.close() 메서드가 그대로 존재함: `excel-workbook.ts:189~196` — 구현 코드 변경 없음 (원본과 동일)
- [x] ExcelWorkbook JSDoc에 `await using` 예시가 제거됨: `excel-workbook.ts:24~33` — try-finally 예시만 존재
- [x] ExcelWrapper.write() JSDoc에 `await using` 언급이 제거됨: `excel-wrapper.ts:91~107` — `사용 후 close()를 호출해야 한다`로 변경, try-finally 예시만 존재
- [x] 컴파일에 에러가 없다: 전체 268개 테스트 통과 확인 (런타임 에러 없음)
