# 평가: sd-commit

## 동작 평가

### 시나리오 1: 복수 타입/복수 scope 변경

- 입력: "/sd-commit"
- 사전조건: git repo에 packages/solid/src/Button.ts (신규), packages/core-common/src/StringUtil.ts (버그수정 변경)이 존재
- 체크리스트:
  - [ ] `git add -A`가 실행되었다 (특정 파일만 add하지 않음)
  - [ ] 커밋 메시지 제목(첫 줄)이 변경된 scope들의 요약이다 (예: "solid, core-common ...")
  - [ ] 커밋 메시지 본문에 `[feat]` 그룹이 존재하고 solid 관련 항목이 포함되어 있다
  - [ ] 커밋 메시지 본문에 `[fix]` 그룹이 존재하고 core-common 관련 항목이 포함되어 있다
  - [ ] 서로 다른 type의 변경이 별도 그룹으로 분리되어 있다 (섞이지 않음)
  - [ ] 커밋 메시지에 Co-Authored-By 라인이 포함되어 있다
  - [ ] 사용자에게 커밋 메시지를 보여주고 확인을 요청했다 (AskUserQuestion 또는 질문 텍스트 출력)
  - [ ] git commit이 실제로 생성되었다

### 시나리오 2: 단일 타입/단일 scope 변경

- 입력: "/sd-commit"
- 사전조건: git repo에 packages/solid/src/Input.ts (신규)만 변경됨
- 체크리스트:
  - [ ] `git add -A`가 실행되었다
  - [ ] 커밋 메시지 제목에 scope(solid)이 포함되어 있다
  - [ ] 커밋 메시지 본문에 `[feat]` 그룹이 존재한다
  - [ ] 불필요한 빈 그룹이 없다 (변경이 없는 type 그룹이 나열되지 않음)
  - [ ] git commit이 실제로 생성되었다

### 시나리오 3: 루트 레벨 + 패키지 혼합 변경

- 입력: "/sd-commit"
- 사전조건: git repo에 package.json (chore 변경), packages/solid/src/App.ts (refactor 변경: 변수명 리네이밍 등 동작 변경 없는 코드 정리) 존재
- 체크리스트:
  - [ ] `git add -A`가 실행되었다
  - [ ] 루트 레벨 파일 변경에 대해 적절한 scope가 부여되었다 (빈 scope가 아님)
  - [ ] `[chore]` 그룹과 `[refactor]` 그룹이 분리되어 있다
  - [ ] git commit이 실제로 생성되었다

## 안티패턴 평가

- [ ] 특정 파일만 선택적으로 `git add`하지 않았다 (반드시 `git add -A`)
- [ ] 커밋 메시지에 type 그룹 없이 평문으로만 작성하지 않았다
- [ ] 영어가 아닌 대화 언어(한국어)로 커밋 메시지를 작성했다
