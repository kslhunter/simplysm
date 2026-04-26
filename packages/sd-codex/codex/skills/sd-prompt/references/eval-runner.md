# Eval 실행 절차

workspace 준비 → 시나리오 실행 subagent → Judge subagent 판정 을 순서대로 수행한다.

## workspace 준비

Eval은 격리된 workspace에서 실행한다. **프롬프트 수정은 항상 메인 원본에서** 하고, workspace는 eval 실행 전에 메인에서 복제하여 생성한다.

```
.tmp/{yyMMddHHmmss}_eval-{스킬명}/
  {시나리오명}/          <- 시나리오별 작업 디렉토리
    .codex/             <- 프로젝트 루트의 .codex/ 전체를 복사
    {사전 조건 파일들}   <- 시나리오별 추가 파일
```

매 실행마다 새 workspace를 생성한다. 각 시나리오에 대해:

1. 프로젝트 루트의 `.codex/` 폴더를 시나리오 디렉토리에 **통째로 복사**한다.
2. 시나리오의 사전 조건에 따라 추가 파일을 복사하거나 생성한다.
3. 시나리오 디렉토리에 `.codex/rules/sd-eval-env.md`를 생성한다. 본문은 `.codex/skills/sd-prompt/references/sd-eval-env-template.md` 템플릿을 그대로 복사한다.

## 시나리오 실행 subagent

각 시나리오마다, 이 스킬 실행 요청을 `spawn_agent` 사용 승인으로 보고 `spawn_agent`(fork_context: `false`, effort: `medium`)를 실행한다. 여러 시나리오는 병렬로 실행할 수 있다.

subagent 입력:

```markdown
격리 workspace `{시나리오 디렉토리}`에서 Eval 시나리오를 실행한다.

반드시 먼저 `{시나리오 디렉토리}/.codex/rules/sd-eval-env.md`를 읽고 따른다.
작업 디렉토리 밖의 파일은 읽거나 수정하지 않는다.

사용자 입력:
{eval 시나리오의 입력}

완료 시 실제 사용자에게 응답하듯 최종 응답을 작성한다.
```

subagent가 완료되면, subagent 최종 응답을 `{시나리오 디렉토리}/run-output.md`에 저장한다.

## Judge 판정

실행 완료 후, 이 스킬 실행 요청을 `spawn_agent` 사용 승인으로 보고 Judge subagent를 `spawn_agent`(fork_context: `false`, effort: `medium`)로 실행하고 다음을 전달한다:

```markdown
다음 Eval 실행 결과를 판정하고, FAIL 항목에 대해 개선안을 제안하라:

## 평가 대상
- 프롬프트 원문: {프롬프트 파일 경로}
- Eval 파일: {Eval 파일 경로}
- 시나리오 번호: {수행 시나리오 번호}
- workspace: {.tmp/{yyMMddHHmmss}_eval-{스킬명}/{시나리오명}/}
  - `run-output.md`: 시나리오 실행 subagent의 최종 응답
  - workspace 내 생성된 파일들

## 판정 원칙
- 체크리스트 문구를 **문자 그대로** 판정하라. 명시되지 않은 추가 요건을 유추하지 않는다.
- 사용자 질문은 텍스트 출력으로 대체된 환경이다. 선택지를 텍스트로 제시한 것 자체가 질문을 수행한 것에 해당한다. 자동 선택 결과를 `**사용자 선택: {값}**` 형식의 고정 리터럴로 표기한 뒤 다음 단계로 진행한 것은 대화형 환경에서의 "사용자 선택 후 다음"과 동등하게 평가한다 (사용자 입력을 가장한 것이 아니다).
- **Eval 환경이 곧 정답 환경이다.** FAIL의 원인 "프롬프트" 혹은 "Eval 체크리스트" 문제이다. 환경의 문제일 수는 없다.

## 절차

평가 대상을 확인하여, 각 체크리스트 항목에 대해 PASS/FAIL을 판정하라.

FAIL 항목에 대해:
1. 원인 가설을 최소 2개 이상 수립한다 (프롬프트 문제 / Eval 체크리스트 문제를 반드시 포함)
2. 각 가설에 대해 run-output.md의 실제 행동에서 지지/반박 증거를 찾는다
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
