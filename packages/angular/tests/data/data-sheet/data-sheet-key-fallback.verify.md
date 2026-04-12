# LOGIC-001 key undefined 폴백 — LLM 검증

## 검증 항목

- [x] `sd-data-sheet.base.ts:87`에서 `reflectComponentType(...)?.selector ?? this.constructor.name` 표현식 사용 확인: 코드에 `?? this.constructor.name` 폴백이 적용되어 있음
- [x] `constructor.name`은 Chrome 61+에서 지원됨: MDN 확인 — `Function.name`은 ES2015, Chrome 33+에서 지원
- [x] 기존 테스트(`data-sheet.spec.ts`)가 정상 통과: key가 정상 selector인 경우 기존 동작 유지 확인됨 (전체 테스트 1346건 통과)
