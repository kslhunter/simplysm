# Eval: sd-use

## Behavioral Eval

### 시나리오 1: 커밋 요청
- Input: "/sd-use 변경사항 정리해줘"
- 체크리스트:
  - [ ] sd-commit을 선택했음을 사용자에게 안내하는 메시지가 출력됨
  - [ ] Skill 도구를 호출하여 sd-commit을 실행함

### 시나리오 2: 디버그 요청
- Input: "/sd-use 이 에러 좀 분석해줘: TypeError: Cannot read property 'x' of undefined"
- 체크리스트:
  - [ ] sd-debug를 선택했음을 사용자에게 안내하는 메시지가 출력됨
  - [ ] Skill 도구를 호출하여 sd-debug를 실행함

### 시나리오 3: Help 요청
- Input: "/sd-use --help"
- 체크리스트:
  - [ ] 단일 코드 블록으로 CLI --help 스타일의 도움말이 출력됨 (마크다운 표/리스트 금지)
  - [ ] USAGE, DEVELOPMENT FLOW, SKILLS 섹션이 포함됨
  - [ ] 스킬이 카테고리별(개발, 품질, Git, 문서, 도구)로 정렬되어 이름과 설명이 출력됨
  - [ ] 개발 플로우 다이어그램이 포함됨 (sd-wbs → sd-spec → sd-plan → sd-tdd)
  - [ ] Skill 도구를 호출하지 않음 (도움말만 출력)

### 시나리오 4: 개발 프로세스 요청
- Input: "/sd-use 새 기능을 처음부터 끝까지 개발하고 싶어"
- 체크리스트:
  - [ ] sd-dev를 선택했음을 사용자에게 안내하는 메시지가 출력됨
  - [ ] Skill 도구를 호출하여 sd-dev를 실행함

### 시나리오 5: 코드 품질 요청
- Input: "/sd-use 타입체크랑 린트 돌려줘"
- 체크리스트:
  - [ ] sd-check를 선택했음을 사용자에게 안내하는 메시지가 출력됨
  - [ ] Skill 도구를 호출하여 sd-check을 실행함

## Anti-pattern Eval

- [ ] 스킬을 선택하지 않고 직접 작업을 수행하지 않음
- [ ] 사용자에게 어떤 스킬을 사용하는지 안내 없이 Skill 도구를 호출하지 않음
- [ ] 존재하지 않는 sd-* 스킬 이름을 사용하지 않음
