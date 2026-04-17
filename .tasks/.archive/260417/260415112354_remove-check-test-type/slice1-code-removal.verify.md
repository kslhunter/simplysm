# check.ts에서 vitest 관련 코드 없음 — LLM 검증

## 검증 항목

- [x] spawnVitest 함��가 존재하지 않는다: `grep "spawnVitest"` 결과 0건
- [x] needsTest 변수가 존재하지 않는다: `grep "needsTest"` 결과 0건
- [x] cpx import가 존재하지 않는다: `grep "cpx"` 결과 0건
- [x] formatSection에 TEST 전용 분기가 없다: `grep 'result.name === "TEST"'` 결과 0��, `grep '"TEST"'` 결과 0건
