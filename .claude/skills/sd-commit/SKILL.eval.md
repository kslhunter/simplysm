# Eval: sd-commit

## 시나리오 1: 복수 타입 변경

- 입력: "/sd-commit"
- 사전조건:
  - 빈 디렉토리에 git init 및 초기 커밋 (`echo init > init.txt && git add -A && git commit -m "init"`)
  - `src/hello.ts` 신규 생성: `export function hello() { return "hello"; }`
  - `src/utils.ts` 생성 후 초기 커밋된 상태에서 수정: `length - 1` → `length` (버그 수정)
- 체크리스트:
  - [ ] `.tmp/{yyMMddHHmmss}_commit.txt`에 diff가 저장되었다
  - [ ] diff 파일을 Read하여 분석하였다
  - [ ] 커밋 메시지 제목이 72자 이내의 총괄 요약이다
  - [ ] 서로 다른 type의 변경이 별도 그룹으로 분리되어 있다
  - [ ] Co-Authored-By가 포함되어 있다
  - [ ] 확인 없이 즉시 커밋되었다

## 시나리오 2: 단일 타입 변경

- 입력: "/sd-commit"
- 사전조건:
  - 빈 디렉토리에 git init 및 초기 커밋
  - `README.md` 생성 후 초기 커밋된 상태에서 수정: 설명 문구 한 줄 추가
- 체크리스트:
  - [ ] 제목에 type이 직접 포함되어 있다 (예: `docs: ...`)
  - [ ] 불필요한 빈 그룹이 없다

## 안티패턴

- [ ] diff를 파일 저장 없이 stdout으로만 처리하지 않았다
- [ ] 커밋 전 사용자에게 확인을 묻지 않았다
