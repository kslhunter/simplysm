# Eval: sd-prompt

## 행동 Eval

### 시나리오 1: 룰 편집
- 입력: "/sd-prompt sd-test-rule에 인사 관련 룰 추가해줘"
- 사전 조건: `.claude/rules/sd-test-rule.md` 존재 (내용: 아래 참조)
  ```
  # 테스트 룰
  - 출력은 한국어로 작성한다
  ```
- 체크리스트:
  - [ ] 출력이 기존 sd-test-rule.md의 내용에 기반한 분석을 포함한다
  - [ ] Eval 파일 존재 여부에 대한 탐지 결과가 출력에 포함되었다
  - [ ] 상태 탐지 결과(프롬프트만 있음/둘 다 있음)를 출력에 포함했다
  - [ ] ASSUMED 항목이 존재하여 질문했다
  - [ ] 기존 룰 내용을 유지하면서 새 룰을 추가했다 (기존 내용 삭제 없음)
  - [ ] 수정된 파일에 인사 관련 룰 내용이 포함되었다

### 시나리오 2: 신규 스킬
- 입력: "/sd-prompt sd-faq라는 고정 답변 스킬 만들어줘"
- 사전 조건: `.claude/skills/sd-faq/` 디렉토리 없음
- 체크리스트:
  - [ ] sd-faq 스킬의 존재 여부를 확인했다
  - [ ] "신규" 또는 "Step 1"을 출력에 포함했다
  - [ ] VERIFIED/INFERRED/ASSUMED 분류를 출력에 포함했다
  - [ ] ASSUMED 항목에 대해 질문했다
  - [ ] 기존 스킬/룰 목록이 출력에 반영되어 있다

### 시나리오 3: 스킬 수정
- 입력: "/sd-prompt sd-echo 스킬의 출력 앞에 접두어를 붙이도록 수정해줘"
- 사전 조건:
  - `.claude/skills/sd-echo/SKILL.md` 존재 (내용: 아래 참조)
    ```
    ---
    name: sd-echo
    description: 더미 스킬
    ---
    # sd-echo
    사용자 입력을 그대로 출력한다.
    ```
  - `.claude/skills/sd-echo/SKILL.eval.md` 존재 (내용: 아래 참조)
    ```
    # Eval: sd-echo
    ## 행동 Eval
    ### 시나리오 1: 기본 출력
    - 입력: "/sd-echo 테스트"
    - 체크리스트:
      - [ ] "테스트"라는 단어가 출력에 포함되었다
    ```
- 체크리스트:
  - [ ] 출력이 sd-echo SKILL.md의 내용에 기반한 분석을 포함한다
  - [ ] 출력이 sd-echo SKILL.eval.md의 내용에 기반한 분석을 포함한다
  - [ ] "프롬프트 + Eval 모두 있음" 또는 "Step 2"를 출력에 포함했다
  - [ ] 접두어 관련 체크리스트 항목이 Eval에 추가되었다
  - [ ] 접두어 관련 수정 내용이 출력에 포함되었다
  - [ ] eval workspace에 `_history/` 디렉토리를 생성했다
  - [ ] 최초 Eval 실행 전 현재 SKILL.md를 `_history/org.md`로 백업했다

### 시나리오 4: FAIL 시 개선 후보 생성
- 입력: "/sd-prompt sd-dummy 스킬을 Eval해주되 Preflight는 하지말고 바로 Eval해줘"
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
  - [ ] FAIL 항목에 대해 "기대"(체크리스트가 요구한 행동)가 Eval 결과에 포함되었다
  - [ ] FAIL 항목에 대해 "실제"(eval 대상이 한 행동 인용)가 Eval 결과에 포함되었다
  - [ ] FAIL 항목에 대해 원인 판별(프롬프트 부족 또는 체크리스트 부정확)이 Eval 결과에 포함되었다
  - [ ] FAIL 발생 시 프롬프트 개선 후보(candidate)를 2개 이상 출력에 포함했다
  - [ ] 각 candidate에 변경 사항 설명이 출력에 포함되었다
  - [ ] 후보 선택을 질문했다

## 안티패턴 Eval

- [ ] Step 0에서 상태 탐지 없이 바로 프롬프트 작성/수정에 들어간다
- [ ] Step 2에서 Eval 시나리오를 보여주지 않고 바로 Step 3으로 넘어간다
- [ ] FAIL 발생 시 수정 방향을 보여주지 않고 바로 수정한다
- [ ] Eval 시나리오의 체크리스트에 주관적 기준("잘 작성되었는가", "적절한가")을 사용한다
- [ ] 기존 스킬/룰 파일의 내용을 파악하지 않고 수정한다
- [ ] FAIL 발생 시 Contrastive 분석 없이 바로 수정에 들어간다 (이전 버전이 2개 이상일 때)
- [ ] 프롬프트 수정 전 이전 버전을 `_history/`에 백업하지 않는다
- [ ] eval 개선 루프에서 workspace 내의 스킬 파일을 직접 수정한다 (메인 원본이 아닌 `.tmp/` workspace 복사본을 수정)
