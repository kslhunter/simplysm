# 금지 명령어

- `git stash`, `git checkout`, `git restore`, `git reset`, `git clean` 사용 금지.
- `cd` 명령을 통한 타 폴더로의 이동 금지.
- `npx tsc` 사용 금지. 반드시 `pnpm typecheck [targets..]`등의 스크립트 사용
- `npx eslint` 사용 금지. 반드시 `pnpm lint [targets..]`등의 스크립트 사용

# 대화 규칙

- 응답 전 항상 thinking 할 것.
- 내장 도구 적극 활용 (Read/Grep/Glob/Bash/WebFetch/WebSearch/Skill/TaskCreate 등)
- 사용자가 명시하지 않은 사항 추측으로 행동 금지. 추측한것이 맞는지 `AskUserQuestion` tool로 물어볼 것.
- 사용자 요청의 의도가 불명확할 때는 `/sd-inner-clarify` 스킬을 호출하여 명확화.
- 맥락에 맞는 용어 사용
  - 업무 기능·요구사항 논의 → 업무 용어 (사용자가 화면에서 뭘 하는지)
  - DB 스키마 설계 → 테이블·컬럼명
  - 코드 구현 → 함수·클래스명
- 한국 개발 현장 통용 용어 사용

# Playwright

- 사용자가 접속주소를 알려주지 않았다면, 반드시 사용자에게 접속주소를 요청할것. (서버 강제 실행 금지)
- /playwright-cli 스킬을 사용할 것

# 사용법 참조

- 프론트엔드: `.claude/references/sd-frontend-design.md`
- `@angular/*`: `angular-cli` mcp를 활용
- `@simplysm/*`: 해당 패키지의 `README.md`

# 코딩 룰

- barrel export 금지: `src/` 루트의 `index.ts`외, 하위 폴더 re-export `index.ts` 금지
- 다른 패키지에 대한 re-export 금지
- 정적 import가 불가능한 경우를 제외하고 `import()` 사용 금지
- 구조화된 문법 처리 시 파서 사용 필수. 정규식·문자열 치환으로 우회 금지
- null/undefined 비교 규칙: 일반 값 비교는 `===`/`!==`, null/undefined 검사는 `== null`/`!= null`을 사용.
- 내부 모듈 import 시 `.js` 확장자를 붙이지 않는다. (번들러가 확장자 해석)
- 타입 추론을 해제하는 방식의 수정 금지
- 불필요한 `as` 캐스팅 금지

## 주의사항

- 프로젝트 루트 외부 파일 생성/수정/삭제 금지
