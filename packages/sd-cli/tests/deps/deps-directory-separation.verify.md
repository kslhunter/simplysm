# deps/ 디렉토리 관심사 분리 — LLM 검증

## 검증 항목

- [x] replace-deps/ 서브디렉토리에 3개 파일 존재: `collect-deps.ts`, `replace-deps.ts`, `replace-deps-resolve.ts` — glob으로 확인
- [x] server-externals/ 서브디렉토리에 1개 파일 존재: `server-production-files.ts` — glob으로 확인
- [x] deps/ 루트에 이전 파일 없음: `replace-deps/`, `server-externals/` 서브디렉토리만 존재
- [x] collect-deps.ts 내부 import 수정: `../../utils/package-utils` — 코드 확인
- [x] server-production-files.ts 내부 import 수정: `../../workers/server-build.worker`, `../../esbuild/esbuild-config` — 코드 확인
- [x] replace-deps.ts → replace-deps-resolve.ts 상대 import 변경 없음: 같은 디렉토리 이동으로 `./replace-deps-resolve` 유지 — 코드 확인
- [x] src/ 소비자 7건 import 경로 업데이트: grep으로 이전 경로 참조 0건 확인
- [x] tests/ 소비자 전체 import 경로 업데이트: grep으로 이전 경로 참조 0건 확인
- [x] typecheck 통과 (기존 에러 4건 제외): `pnpm typecheck` 실행 확인
- [x] lint 통과: `pnpm lint sd-cli` 0 에러 확인
- [x] 관련 테스트 통과: replace-deps-watch 2개 파일 5개 테스트 전체 통과 확인
