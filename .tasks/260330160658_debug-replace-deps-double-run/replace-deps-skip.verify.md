# replace-deps 중복 실행 방지 — LLM 검증

## 검증 항목
- [x] process.argv[2]가 커맨드명: sd-cli.ts:49에서 `...process.argv.slice(2)`를 sd-cli-entry에 전달, argv[0]=node, argv[1]=sd-cli.js, argv[2]=커맨드명
- [x] replace-deps 커맨드 시 Phase 1 skip: 라인 34의 `process.argv[2] !== "replace-deps"`가 false → 전체 AND 조건 false → setupReplaceDeps 호출 안 됨
- [x] dev/build 커맨드 시 Phase 1 정상 실행: `process.argv[2]`가 "dev"/"build" → `!== "replace-deps"` true → sdConfig.replaceDeps 체크로 진행 → 기존 동작 유지
- [x] replaceDeps 설정 없을 때: `sdConfig.replaceDeps != null`이 false → skip. Phase 2에서 commands/replace-deps.ts가 "설정이 없습니다" 경고 출력
