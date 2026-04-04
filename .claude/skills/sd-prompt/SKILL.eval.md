# Eval: sd-prompt

## 행동 Eval

### 시나리오 1: 신규 스킬 생성

- 입력: "/sd-prompt sd-faq라는 고정 답변 스킬 만들어줘"
- 사전 조건: `.claude/skills/sd-faq/` 디렉토리 없음
- 체크리스트:
  - [ ] 불명확한 부분에 대해 사용자에게 질문했다
  - [ ] Eval 파일(SKILL.eval.md)이 프롬프트보다 먼저 작성되었다
  - [ ] SKILL.md에 프론트매터(name, description)가 포함되었다
  - [ ] SKILL.eval.md에 객관적 체크리스트가 포함되었다

### 시나리오 2: 기존 스킬 Eval 실행

- 입력: "/sd-prompt sd-dummy 스킬을 Eval해줘"
- 사전 조건:
  - `.claude/skills/sd-dummy/SKILL.md` 존재 (내용: 아래 참조)
    ```
    ---
    name: sd-dummy
    description: 더미 스킬
    ---
    # sd-dummy
    사용자 입력을 그대로 출력한다.
    ```
  - `.claude/skills/sd-dummy/SKILL.eval.md` 존재 (내용: 아래 참조)
    ```
    # Eval: sd-dummy
    ## 행동 Eval
    ### 시나리오 1: 기본 출력
    - 입력: "/sd-dummy 테스트"
    - 체크리스트:
      - [ ] 출력의 마지막 줄이 "---"이다
      - [ ] "테스트"라는 단어가 출력에 포함되었다
    ```
- 체크리스트:
  - [ ] 격리된 workspace(.tmp/)에서 claude -p가 실행되었다
  - [ ] FAIL 항목에 대한 개선 제안이 출력에 포함되었다
  - [ ] 개선 제안에 대해 사용자에게 질문했다

## 안티패턴 Eval

- [ ] Eval 시나리오 없이 바로 프롬프트 작성에 들어간다
- [ ] FAIL 발생 시 사용자 확인 없이 바로 수정한다
- [ ] Eval 체크리스트에 주관적 기준("잘 작성되었는가", "적절한가")을 사용한다
- [ ] .tmp/ workspace의 파일을 직접 수정한다 (메인 원본을 수정해야 함)
