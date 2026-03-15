---
name: sd-use
description: 사용자의 요청을 분석하여 적절한 sd-* 스킬을 자동으로 매칭하고 즉시 실행.
argument-hint: "<요청 내용> | --help"
---

# sd-use: 자동 스킬 라우터

사용자가 어떤 스킬을 써야할지 모를 때, 요청을 분석하여 적절한 sd-* 계열 스킬을 자동으로 매칭하고 즉시 실행한다.

## 1. 인자 파싱

`$ARGUMENTS`에서 사용자 요청 텍스트를 추출한다.
- `$ARGUMENTS`가 `--help`이면 바로 **5. 도움말 출력** 단계로 이동한다
- `$ARGUMENTS`가 비어있으면 현재 대화 맥락에서 요청을 파악한다
- 대화 맥락도 없으면 AskUserQuestion으로 요청 내용을 질문한다

## 2. 스킬 매칭

사용자 요청의 의도를 분석하여 아래 sd-* 스킬 중 가장 적합한 스킬을 판단한다. sd-use 자신은 매칭 대상에서 제외한다.

| 스킬 | 설명 | 키워드 힌트 |
|------|------|------------|
| sd-debug | 문제(버그, 에러, 비정상 동작)의 근본 원인을 분석하고 해결책을 제시 | 버그, 에러, 오류, 안됨, 무한루프, 크래시, 실패, 문제 |
| sd-document | 문서 파일(.docx/.xlsx/.pptx/.pdf)을 읽어 분석하거나 새 문서를 생성 | .docx, .xlsx, .pptx, .pdf, 문서 읽기, 문서 생성, 보고서, 엑셀 |
| sd-email-analyze | 이메일 파일(.eml/.msg)을 분석하여 헤더, 본문, 첨부파일을 추출 | .eml, .msg, 이메일, 메일 분석 |
| sd-init | 프로젝트 설정 파일을 분석하여 CLAUDE.md를 자동 생성 | CLAUDE.md, 프로젝트 초기화, init |
| sd-plan | 요구분석서 또는 리뷰 결과를 기반으로 TDD 방식의 구현계획서를 작성 | 구현계획, plan, 계획 수립, spec 기반 |
| sd-plan-dev | 구현계획서를 기반으로 TDD 방식의 실제 구현을 수행 | 구현 실행, plan-dev, 계획 실행, TDD 실행 |
| sd-readme | LLM 인덱싱용 README.md 및 docs/ 생성 | README, 문서화, 패키지 문서 |
| sd-audit | 코드베이스를 여러 관점에서 병렬로 점검하고 승인된 결과를 문서로 저장 | 점검, 감사, 개선점, 문제점 |
| sd-spec | 사용자 요청과 코드베이스를 분석하여 요구분석서를 작성 | 요구분석, 요구사항, spec, 기능 정의 |
| sd-check | typecheck, lint(fix), 단위test를 순차 수행하고 에러를 자동 수정 | 품질 검사, check, typecheck, lint, 코드 검사, 자동 수정 |
| sd-test | 테스트 대상에 대해 작업 유형별 TDD 테스트를 독립 수행 | 테스트, 테스트 작성, 유닛 테스트 |
| sd-review | spec/plan 문서와 구현을 비교하여 완성도를 검증 | 리뷰, review, 검증, 충족, 완성도, 구현 검토 |
| sd-commit | 변경사항을 분석하여 [type] scope 형식의 커밋 메시지를 생성하고 커밋 | 커밋, commit, 변경사항 저장, git commit |

키워드 힌트는 참고용이며, 최종 판단은 요청의 전체 맥락과 의도를 기준으로 한다.

### 매칭 결과 분기

**단일 스킬이 명확히 매칭되는 경우:**
- 바로 3단계(스킬 실행)로 진행한다

**복수 스킬이 후보인 경우 (판단 어려움):**
- 후보 스킬들의 설명을 텍스트로 먼저 출력한다
- AskUserQuestion으로 후보 목록을 제시하여 사용자에게 선택을 요청한다
- 사용자가 선택한 스킬로 3단계를 진행한다

**매칭 스킬이 없는 경우:**
- "적합한 스킬을 찾을 수 없습니다."를 출력한 뒤 위 테이블의 스킬 목록을 안내하고 종료한다

## 3. 스킬 안내 출력

스킬을 실행하기 전에 다음 형식으로 안내를 출력한다:

```
> **`/sd-{매칭된 스킬명}`** — {스킬 설명}
>
> 유사 스킬: `/sd-{유사1}` (차이점), `/sd-{유사2}` (차이점)
>
> 다음부터는 `/sd-{매칭된 스킬명} {인자}`로 직접 호출할 수 있습니다.
```

- 유사 스킬은 위 테이블에서 매칭 스킬과 혼동될 수 있는 스킬 1~2개를 선택한다
- 각 유사 스킬에 매칭 스킬과의 차이점을 간결히 설명한다
- 유사 스킬이 없으면 해당 줄을 생략한다

## 4. 스킬 실행

사용자 요청 전체를 인자로 하여 Skill tool로 매칭된 스킬을 호출한다.

## 5. 도움말 출력

`--help` 인자가 주어졌을 때 아래 내용을 그대로 출력하고 종료한다:

````
## sd-* 스킬 프로세스 다이어그램

### 메인 개발 파이프라인

```
  /sd-spec          /sd-audit          /sd-debug
  (요구분석)         (코드점검)          (버그분석)
      |                 |                  |
      v                 v                  v
   spec.md          audit.md           debug.md
      |                 |                  |
      +------------ ---+------------------+
                   v
               /sd-plan
             (구현계획 작성)
                   |
                   v
               plan.md
                   |
                   v
             /sd-plan-dev
          (TDD 방식 구현 수행)
                   |
                   v
            코드 + 테스트
                   |
                   v
             /sd-review
          (구현 완성도 검증)
                   |
                   v
            review.md (미충족 시)
```

### 독립 스킬

```
/sd-check ─────────> typecheck + lint(fix) + test 순차 실행 + 자동 수정

/sd-test ──────────> 테스트 작성 + 실행 (RED > GREEN > Refactor)

/sd-readme ────────> README.md + docs/ 생성

/sd-init ──────────> CLAUDE.md 자동 생성

/sd-document ──────> .docx/.xlsx/.pptx/.pdf 읽기/쓰기

/sd-commit ────────> 변경사항 분석 + [type] scope 커밋 메시지 생성 + 커밋

/sd-email-analyze ─> .eml/.msg 분석 > 첨부파일 추출
                         |
                         v
                     /sd-document (문서 첨부파일)
```

### 라우터

```
/sd-use ──> 사용자 자연어 요청을 분석하여 위 모든 sd-* 스킬로 자동 매칭
```

### 스킬 목록

| 스킬 | 설명 | 사용 예시 |
|------|------|----------|
| `/sd-spec` | 요구분석서 작성 | `/sd-spec 로그인 기능 추가` |
| `/sd-audit` | 병렬 코드 점검 | `/sd-audit packages/core-common` |
| `/sd-debug` | 버그 원인 분석 | `/sd-debug 로그인 시 500 에러 발생` |
| `/sd-plan` | TDD 구현계획 작성 | `/sd-plan .tasks/.../spec.md` |
| `/sd-plan-dev` | 구현계획 기반 구현 | `/sd-plan-dev .tasks/.../plan.md` |
| `/sd-check` | 코드 품질 검사 + 자동 수정 | `/sd-check packages/core-common` |
| `/sd-test` | 독립 TDD 테스트 | `/sd-test packages/core-common/src/utils.ts` |
| `/sd-readme` | README.md 생성 | `/sd-readme packages/core-common` |
| `/sd-init` | CLAUDE.md 생성 | `/sd-init` |
| `/sd-review` | 구현 완성도 검증 | `/sd-review .tasks/login` |
| `/sd-commit` | 커밋 메시지 생성 + 커밋 | `/sd-commit` |
| `/sd-document` | 문서 읽기/쓰기 | `/sd-document report.xlsx` |
| `/sd-email-analyze` | 이메일 분석 | `/sd-email-analyze mail.eml` |
| `/sd-use` | 자동 스킬 매칭 | `/sd-use 로그인 버그 좀 봐줘` |
| `/sd-use --help` | 이 가이드 표시 | `/sd-use --help` |
````
