# Symbol.dispose/asyncDispose 제거 — LLM 검증

## 검증 항목

- [x] ZipArchive JSDoc에 `await using` 구문이 존재하지 않는다: zip.ts의 3개 @example 모두 `const archive = new ZipArchive(...)` + try-finally 패턴으로 변경 확인
- [x] ZipArchive JSDoc의 모든 예시가 try-finally + close() 패턴을 사용한다: 3개 예시 모두 `finally { await archive.close(); }` 확인
- [x] 컴파일(typecheck)에 에러가 없다: 소스 코드(`src/`) 에러 0건. 테스트 파일(`tests/`)의 8개 에러는 기존 `using`/`await using` 구문으로 Feature 1.2 범위
- [x] dispose()/close() 메서드의 구현 코드가 변경되지 않았다: git diff 확인 — EventEmitter.dispose(), DebounceQueue.dispose(), SerialQueue.dispose(), LazyGcMap.dispose(), ZipArchive.close() 모두 구현 코드 변경 없음. 삭제된 것은 `[Symbol.dispose]()`/`[Symbol.asyncDispose]()` 래퍼와 JSDoc만
