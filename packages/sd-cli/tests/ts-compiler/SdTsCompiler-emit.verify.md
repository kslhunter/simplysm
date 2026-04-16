# emit 처리 — LLM 검증

## 검증 항목

- [x] Angular emit — additionalTransformers 병합: `_emitAngular`에서 `emitOptions?.additionalTransformers`의 before/after를 `angularCompiler.prepareEmit().transformers`에 push 병합 (`SdTsCompiler.ts` `_emitAngular` 메서드)
- [x] Angular emit — tsbuildinfo 영속화 크래시 방어: `builderProgram.emit(undefined, () => {})` 호출이 try-catch로 감싸져 있음 (`SdTsCompiler.ts` `_emitAngular` 메서드 하단)
- [x] Angular emit — sourceFilter 적용: emitResults를 `emitOptions.sourceFilter`로 필터링하여 반환 (`SdTsCompiler.ts` `_emitAngular` 메서드 마지막)
- [x] Angular emit — incrementalCompilation.recordSuccessfulEmit 호출: writeFileCallback에서 각 sourceFile에 대해 호출됨
- [x] Angular emit — ignoreForEmit/isDeclarationFile/safeToSkipEmit 건너뜀: per-file emit 루프에서 세 조건 모두 continue 처리
