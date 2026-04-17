# Eval: sd-prompt

## 행동 Eval

### 시나리오 1: 신규 스킬 생성

- 입력: "/sd-prompt 테스트용으로 .tmp/eval-skills/sd-faq/ 경로에 sd-faq라는 고정 답변 스킬 만들어줘 (`.claude`폴더 아님)"
- 사전 조건: `.tmp/eval-skills/sd-faq/` 디렉토리 없음
- 체크리스트:
  - [ ] `.tmp/eval-skills/sd-faq/SKILL.md` 파일이 존재한다
  - [ ] SKILL.md 최상단에 YAML 프론트매터(`---`로 감싼 블록)가 있고 `name`, `description` 필드를 포함한다
  - [ ] `.tmp/eval-skills/sd-faq/SKILL.eval.md` 파일이 존재한다
  - [ ] SKILL.eval.md에 "행동 Eval" 섹션이 있고 시나리오가 1개 이상 포함된다
  - [ ] SKILL.eval.md의 모든 체크리스트 항목이 산출물(파일/출력) 기준이며, 과정·도구 사용·질문 여부를 평가하는 항목이 없다

## 안티패턴 Eval

- [ ] SKILL.md만 생성하고 SKILL.eval.md를 생성하지 않는다
- [ ] SKILL.eval.md 체크리스트에 주관적 표현("잘 작성되었는가", "적절한가", "좋은가" 등)이 포함된다
