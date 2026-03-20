# Eval: sd-prompt

## 행동 Eval

### 시나리오 1: 룰 편집
- 입력: "/sd-prompt sd-claude-rules에 commit 관련 룰 추가해줘"
- 사전 조건: `.claude/rules/sd-claude-rules.md` 존재 (기존 내용 포함)
- 체크리스트:
  - [ ] `.claude/rules/sd-claude-rules.md` 파일을 Read 도구로 읽었다
  - [ ] `.claude/evals/sd-claude-rules.md` 존재 여부를 탐색했다
  - [ ] 상태 탐지 결과(프롬프트만 있음/둘 다 있음)를 출력에 포함했다
  - [ ] ASSUMED 항목이 존재하여 사용자에게 질문했다 (AskUserQuestion 호출 시도)
  - [ ] 기존 룰 내용을 유지하면서 새 룰을 추가했다 (기존 내용 삭제 없음)
  - [ ] 수정된 파일에 commit 관련 룰 내용이 포함되었다

### 시나리오 2: 신규 스킬
- 입력: "/sd-prompt sd-commit이라는 commit 스킬 만들어줘"
- 사전 조건: `.claude/skills/sd-commit/` 디렉토리 없음
- 체크리스트:
  - [ ] `.claude/skills/sd-commit/SKILL.md` 존재 여부를 탐색했다
  - [ ] `.claude/skills/sd-commit/SKILL.eval.md` 존재 여부를 탐색했다
  - [ ] "신규" 또는 "Step 1"을 출력에 포함했다
  - [ ] VERIFIED/INFERRED/ASSUMED 분류를 출력에 포함했다
  - [ ] 사용자에게 질문했다 (AskUserQuestion 호출 시도)
  - [ ] 기존 스킬/룰 목록을 Glob으로 탐색했다

### 시나리오 3: 스킬 수정
- 입력: "/sd-prompt sd-wbs 스킬 사용시 AskUserQuestion없이 알아서 만들게 수정해줘"
- 사전 조건: `.claude/skills/sd-wbs/SKILL.md`와 `.claude/skills/sd-wbs/SKILL.eval.md` 모두 존재
- 체크리스트:
  - [ ] `.claude/skills/sd-wbs/SKILL.md`를 Read 도구로 읽었다
  - [ ] `.claude/skills/sd-wbs/SKILL.eval.md`를 Read 도구로 읽었다
  - [ ] "프롬프트 + Eval 모두 있음" 또는 "Step 4"를 출력에 포함했다
  - [ ] 기존 SKILL.eval.md의 시나리오를 활용하여 Eval을 실행했다
  - [ ] AskUserQuestion 관련 동작을 변경하는 수정이 SKILL.md에 반영되었다.
  - [ ] eval workspace에 `_history/` 디렉토리를 생성했다
  - [ ] 최초 Eval 실행 전 현재 SKILL.md를 `_history/v1.md`로 백업했다

### 시나리오 4: FAIL 시 개선 후보 생성
- 입력: "/sd-prompt sd-dummy 스킬의 출력 마지막에 구분선(---)을 추가하도록 수정해줘"
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
  - [ ] eval workspace에 `_history/` 디렉토리를 생성했다
  - [ ] Eval 실행 후 FAIL이 발생했을 때 프롬프트 개선 후보(candidate)를 2개 이상 출력에 포함했다
  - [ ] 각 candidate에 변경 사항 설명이 출력에 포함되었다
  - [ ] 사용자에게 후보 선택을 요청했다 (AskUserQuestion 호출 시도)

## 안티패턴 Eval

- [ ] Step 0에서 상태 탐지 없이 바로 프롬프트 작성/수정에 들어간다
- [ ] 사용자 확인 없이 다음 Step으로 넘어간다 (AskUserQuestion 호출 시도 없음)
- [ ] Eval 시나리오의 체크리스트에 주관적 기준("잘 작성되었는가", "적절한가")을 사용한다
- [ ] 기존 스킬/룰 파일을 읽지 않고 수정한다
- [ ] FAIL 발생 시 Contrastive 분석 없이 바로 수정에 들어간다 (이전 버전이 2개 이상일 때)
- [ ] 프롬프트 수정 전 이전 버전을 `_history/`에 백업하지 않는다
