# Feature 1.3 SCSS 번들링 + lint 통합 — LLM 검증

## 검증 항목

- transformResource 콜백 연결: `SdTsCompiler.ts:_extendHostForAngular()`에서 `effectiveTransformStylesheet` 매개변수로 전달받아 `hostAny["transformResource"]`에 등록 확인 (SdTsCompiler.ts:553-579)
- 라이브러리 SCSS 콜백 자동 생성 조건: `isForAngular && effectiveTransformStylesheet == null` 분기 (SdTsCompiler.ts:163-172) — transformStylesheet 제공 시 그대로 사용, 미제공 시 createLibraryTransformStylesheet 생성
- SCSS 상태 리셋 위치: compileAsync 내 program 생성 전에 `_scssErrors.length = 0`, `_scssDependencies.clear()` 호출 (SdTsCompiler.ts:158-160)
- createLibraryTransformStylesheet 이동: ngtsc-build-core.ts에 정의, angular-build-pipeline.ts에서 import 변경 확인 — `compileScssString` import 추가됨
- sideEffectScssRegistry getter: public getter로 외부 접근 가능 (SdTsCompiler.ts:83-86)
- compileSideEffectScss: 내부 _scssErrors와 _scssDependencies에 에러/의존성 기록 (SdTsCompiler.ts:89-98)
- _runLint: LintWithProgramRunner 인스턴스 lazy init + 재사용 (SdTsCompiler.ts:_lintRunner 필드, _runLint 메서드)
- lint + globalScss 병렬: Promise.all로 동시 실행 (SdTsCompiler.ts:271-283)
- ISdTsCompilerResult 타입: lint?, scssErrors, scssDependencies 필드 추가 (sd-ts-compiler-result.ts:17-21)
- ISdTsCompilerOptions 타입: lint?, globalScss? 필드 추가 (sd-ts-compiler-options.ts:41-45)
