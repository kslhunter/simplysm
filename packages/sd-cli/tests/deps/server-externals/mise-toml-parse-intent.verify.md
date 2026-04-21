# mise.toml 파싱 실패 시 명시적 크래시 의도 — LLM 검증

대상: `packages/sd-cli/src/deps/server-externals/server-production-files.ts` `generateProductionFiles()` 내 `TOML.parse(miseContent)` 호출부

근거: `.tasks/260417132441_review-regex-to-parser/1.3-toml-parse-intent-comment.md`

## 검증 항목

- **WHY 주석 존재**: `server-production-files.ts:114`에 `// mise.toml은 저장소에서 관리되는 설정 파일이므로, 파싱 실패 시 폴백하지 않고 예외를 전파하여 설정 오류를 즉시 드러낸다.` 주석이 `TOML.parse(miseContent)` 호출(`:115`) 직전에 존재함을 확인
- **명시적 크래시 의도 서술**: 주석이 "저장소에서 관리되는 설정 파일", "폴백하지 않고", "예외를 전파", "설정 오류를 즉시 드러낸다" 표현을 모두 포함하여 wbs에 명시된 WHY를 서술
- **WHAT 서술 지양**: "TOML을 파싱한다" 같은 코드 재서술이 아니라, 폴백을 의도적으로 하지 않는 이유(설정 오류 즉시 노출)를 설명
- **try-catch 미추가**: `:109-121` 블록 전체에 try 키워드 없음을 확인 — 파싱 예외는 상위로 전파됨
- **주석 스타일**: `//` 한 줄 주석 (JSDoc 아님)
- **주석 언어**: 한국어
- **기타 코드 미변경**: `git diff server-production-files.ts` 결과 라인 114의 주석 추가 1줄 외 변경 없음 (아래 명령 실행 결과 참조)
- **기존 테스트 통과**: `pnpm exec vitest run --project node packages/sd-cli/tests/workers/server-build-worker.spec.ts` 25/25 통과, 특히 `generates dist/mise.toml when packageManager=mise` 테스트(TOML.parse 경로 실행)가 통과하여 파싱 로직 회귀 없음을 확인. 참고: 전체 sd-cli 테스트(`packages/sd-cli/tests/`)에서 1건 실패(`esbuild-worker-plugin.acc.spec.ts:143`)가 있으나 이는 Feature 1.1 영역이며 본 Feature 1.3 변경(주석 1줄 추가)과 무관
