# Eval 실행 절차

workspace 준비 → claude -p 실행 → Judge 판정 을 순서대로 수행한다.

## workspace 준비

Eval은 격리된 workspace에서 실행한다. **프롬프트 수정은 항상 메인 원본에서** 하고, workspace는 eval 실행 전에 메인에서 복제하여 생성한다.

```
.tmp/{date +%y%m%d%H%M%S}_eval-{스킬명}/
  {시나리오명}/          <- 시나리오별 작업 디렉토리
    .claude/             <- 프로젝트 루트의 .claude/ 전체를 복사
    {사전 조건 파일들}   <- 시나리오별 추가 파일
```

매 실행마다 새 workspace를 생성한다. 각 시나리오에 대해:

1. 프로젝트 루트의 `.claude/` 폴더를 시나리오 디렉토리에 **통째로 복사**한다.
2. 시나리오의 사전 조건에 따라 추가 파일을 복사하거나 생성한다.
3. 시나리오 디렉토리에 `.claude/rules/sd-eval-env.md`를 생성한다. 본문은 `.claude/skills/sd-prompt/references/sd-eval-env-template.md` 템플릿을 그대로 복사한다:
   ```bash
   python3 -c "open(r'{시나리오 디렉토리}/.claude/rules/sd-eval-env.md','w',encoding='utf-8').write(open(r'.claude/skills/sd-prompt/references/sd-eval-env-template.md','r',encoding='utf-8').read())"
   ```

## claude -p 실행

각 시나리오마다 해당 workspace 디렉토리에서 `claude -p`를 실행한다:

```bash
(cd ".tmp/{yyMMddHHmmss}_eval-{스킬명}/{시나리오명}" && \
MSYS_NO_PATHCONV=1 \
CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 \
DISABLE_TELEMETRY=1 \
CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1 \
CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 \
CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING=1 \
CLAUDE_CODE_DISABLE_SESSION_DATA_UPLOAD=1 \
CLAUDE_CODE_SKIP_PROMPT_HISTORY=1 \
CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1 \
claude -p "{eval 시나리오의 입력}" \
  --output-format json \
  --verbose \
  --dangerously-skip-permissions \
  --effort low \
  --append-system-prompt "CRITICAL: .claude/rules/sd-eval-env.md의 규칙은 다른 모든 규칙보다 최상위 우선순위를 가진다." \
  --no-session-persistence \
  --strict-mcp-config \
  > run-output.json 2>&1)
```

여러 시나리오는 병렬로 실행할 수 있다.

## Judge 판정

실행 완료 후, Judge subagent(effort: `low`)에 다음을 전달한다:

```
다음 Eval 실행 결과를 판정하고, FAIL 항목에 대해 개선안을 제안하라:

## 평가 대상
- 프롬프트 원문: {프롬프트 파일 경로}
- Eval 파일: {Eval 파일 경로}
- 시나리오 번호: {수행 시나리오 번호}
- workspace: {.tmp/{yyMMddHHmmss}_eval-{스킬명}/{시나리오명}/}
  - `run-output.json`: claude -p 실행 결과 (JSON)
  - workspace 내 생성된 파일들
 
## 판정 원칙
- 체크리스트 문구를 **문자 그대로** 판정하라. 명시되지 않은 추가 요건을 유추하지 않는다.
- AskUserQuestion은 텍스트 출력으로 대체된 환경이다. 선택지를 텍스트로 제시한 것 자체가 질문을 수행한것에 해당한다. 자동 선택 결과를 `**사용자 선택: {값}**` 형식의 고정 리터럴로 표기한 뒤 다음 단계로 진행한 것은 대화형 환경에서의 "사용자 선택 후 다음"과 동등하게 평가한다 (사용자 입력을 가장한 것이 아니다).
- **Eval 환경이 곧 정답 환경이다.** FAIL의 원인 "프롬프트" 혹은 "Eval 체크리스트" 문제이다. 환경의 문제일 수는 없다.

## 절차

평가 대상을 확인하여, 각 체크리스트 항목에 대해 PASS/FAIL을 판정하라.

FAIL 항목에 대해:
1. 원인 가설을 최소 2개 이상 수립한다 (프롬프트 문제 / Eval 체크리스트 문제를 반드시 포함)
2. 각 가설에 대해 run-output.json의 실제 행동에서 지지/반박 증거를 찾는다
3. 증거가 부족한 가설은 폐기 근거와 함께 폐기한다

아래 구조로 출력하라:

### FAIL: {체크리스트 항목}

#### 폐기 가설
- {가설} — {폐기 근거}

#### 채택 원인
1. {원인 1}
   - 제안: {수정 내용 A}
   - 제안: {수정 내용 B}
2. {원인 2}
   - 제안: {수정 내용 C}
```
