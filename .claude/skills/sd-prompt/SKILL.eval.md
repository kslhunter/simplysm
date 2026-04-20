# Eval: sd-prompt

## 행동 Eval

### 시나리오 1: 신규 룰 전체 워크플로우 (Step 1→3)

- 입력: "/sd-prompt 새 룰 만들어줘: 코드 리뷰 시 테스트 파일도 반드시 확인하는 룰"
- 사전 조건: 없음
- 체크리스트:
  - [ ] `.claude/rules/` 디렉토리에 새 룰 `.md` 파일이 생성되었다
  - [ ] 생성된 룰 파일에 "테스트 파일" 관련 지시가 포함되어 있다
  - [ ] `.claude/evals/` 디렉토리에 룰에 대응하는 eval `.md` 파일이 생성되었다
  - [ ] eval 파일에 `## 행동 Eval` 섹션이 존재한다
  - [ ] eval 파일에 체크리스트(`- [ ]`) 항목이 1개 이상 존재한다
  - [ ] eval 파일의 입력이 자연어 발화 형식이다 (프롬프트이므로 슬래시 커맨드가 아님)

### 시나리오 2: 기존 스킬 eval 작성

- 입력: "/sd-prompt .claude/skills/sd-dummy/SKILL.md의 eval 작성해줘"
- 사전 조건:
  - `.claude/skills/sd-dummy/SKILL.md` — 더미 스킬 (name: sd-dummy, description: "더미 테스트 스킬. 'dummy', '테스트' 등을 요청할 때 사용한다."). 내용: Step 1에서 입력 파일을 읽고, Step 2에서 `output/result.md`에 요약을 생성한다.
  - `.claude/skills/sd-dummy/SKILL.eval.md` 없음
- 체크리스트:
  - [ ] `.claude/skills/sd-dummy/SKILL.eval.md`가 생성되었다
  - [ ] eval 파일에 `# Eval: sd-dummy` 헤더가 존재한다
  - [ ] eval 파일의 시나리오 입력이 `/sd-dummy` 슬래시 커맨드 형식이다
  - [ ] eval 파일의 체크리스트 항목이 workspace 파일 또는 텍스트 출력으로 판정 가능한 내용이다 (도구 호출 여부/순서를 체크하지 않음)
  - [ ] eval 파일에 `## 안티패턴 Eval` 섹션이 존재한다

### 시나리오 3: Eval 실행

- 입력: "/sd-prompt .claude/skills/sd-dummy/SKILL.md의 eval 실행해줘"
- 사전 조건:
  - `.claude/skills/sd-dummy/SKILL.md` — 시나리오 2와 동일한 더미 스킬
  - `.claude/skills/sd-dummy/SKILL.eval.md` — 행동 Eval 시나리오 1개 포함 (입력: "/sd-dummy test-input.txt", 체크리스트: `output/result.md` 파일이 생성되었다)
- 체크리스트:
  - [ ] `.tmp/` 하위에 eval workspace 디렉토리가 생성되었다
  - [ ] eval workspace에 `.claude/` 폴더가 복사되었다
  - [ ] eval workspace에 `.claude/rules/sd-eval-env.md` 파일이 생성되었다
  - [ ] 텍스트 출력에 `claude -p` 명령어 실행 흔적이 포함되었다
  - [ ] 텍스트 출력에 Judge 판정 결과(PASS 또는 FAIL)가 포함되었다

### 시나리오 4: 리팩터링 (Step 5)

- 입력: "/sd-prompt .claude/skills/sd-dummy/SKILL.md 리팩터링해줘"
- 사전 조건:
  - `.claude/skills/sd-dummy/SKILL.md` — 의도적으로 Prompt Smell을 포함한 더미 스킬:
    - 중복 지시: "입력 파일을 반드시 읽는다"가 Step 1과 Step 2에 각각 존재
    - 용어 불일치: Step 1에서 "입력 파일", Step 2에서 "소스 파일"로 같은 개념을 다른 단어로 지칭
    - 장황한 표현: "이 단계에서는 사용자가 제공한 입력 파일의 내용을 처음부터 끝까지 빠짐없이 전부 다 읽어야 한다"
  - `.claude/skills/sd-dummy/SKILL.eval.md` — 행동 Eval 시나리오 1개 포함
- 체크리스트:
  - [ ] 텍스트 출력에 Prompt Smell 탐지 결과가 포함되었다 (중복 지시, 용어 불일치, 장황한 표현 중 1개 이상 언급)
  - [ ] 텍스트 출력에 명확화 질문(선택지 제시)이 포함되었다
  - [ ] `.claude/skills/sd-dummy/SKILL.md` 파일이 수정되었다 (원본과 내용이 다르다)
  - [ ] 수정 후 `.tmp/` 하위에 Regression Guard용 eval workspace가 생성되었다

## 안티패턴 Eval

- [ ] SKILL.md만 생성하고 eval 파일을 생성하지 않았다 (시나리오 1, 2)
- [ ] eval 체크리스트에 주관적 기준("잘 작성되었는가", "적절한가", "충분한가")을 사용했다
- [ ] eval 체크리스트에 도구 호출 여부를 체크했다 ("Read 도구를 호출했다", "Grep을 사용했다")
- [ ] 스킬 대상 eval의 입력에서 슬래시 커맨드(`/스킬명`) 형식을 사용하지 않았다
