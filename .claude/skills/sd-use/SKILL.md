---
name: sd-use
description: 자연어 요청을 적절한 sd-* 스킬로 라우팅하는 스킬. "sd-use 커밋해줘", "sd-use --help" 등을 요청할 때 사용한다.
model: haiku
---

# sd-use: SD 스킬 라우터

사용자의 요청을 적절한 sd-* 스킬로 라우팅한다. 개별 sd-* 스킬에 익숙하지 않은 사용자가 원하는 작업을 자연어로 설명하면, sd-use가 가장 적합한 스킬을 선택하여 실행한다.

## 인자

| 인자 | 설명 |
|------|------|
| `{request}` | 사용자가 원하는 작업의 자연어 설명 |
| `--help` | 워크플로우 개요 및 스킬 카탈로그 표시 |

## Step 1: 입력 파싱

- 인자가 없거나 `--help`이면 → Step 2
- 그 외 → Step 3

## Step 2: Help 모드

아래 코드 블록을 그대로 출력한 후 종료한다. Skill 도구를 호출하지 않는다.
마크다운 표나 리스트로 변환하지 않는다. 반드시 단일 코드 블록(``` 안)으로 출력한다.

````
sd-use — SD 스킬 라우터

USAGE
  /sd-use <request>       자연어 요청을 적절한 스킬로 라우팅
  /sd-use --help          이 도움말 표시

FLOWS
  진입점                             개발 파이프라인
  sd-wbs    프로젝트 → Feature 분해 ─┐
  sd-review 코드 리뷰 → 수정 개발 루프 ├→ sd-plan → sd-tdd
  (없음)    바로 개발 시작          ─┘  └────────┘
                                        sd-dev (순차 실행)

  sd-debug  버그/에러 → 원인 분석 보고 (분석 종착, 후속은 사용자 지시)

SKILLS
  개발
    sd-dev              Feature 전체 개발 (wbs → plan → TDD → check → review)
    sd-wbs              프로젝트 → Feature 분해 (WBS)
    sd-plan             Feature 요구명세 + 구현계획 작성
    sd-tdd              구현 계획 → TDD 코드 구현

  품질
    sd-check            typecheck / lint / test 실행 및 에러 수정
    sd-review           로직 버그, 보안, 성능, 설계 이슈 리뷰 및 수정 개발 연결
    sd-refactor         구조·설계·아키텍처 리팩토링 분석 리포트
    sd-debug            버그/에러 근본 원인 분석 및 보고

  Git
    sd-commit           전체 변경사항 단일 커밋 생성
    sd-issue            GitHub 이슈 생성

  문서
    sd-claude-docs      CLAUDE.md + usage 문서 생성
    sd-doc-extract      문서에서 텍스트/이미지 추출
    sd-deliverable      매뉴얼 & SIT 문서 생성

  도구
    sd-prompt           스킬/프롬프트 파일 생성·개선
    sd-outlook          Outlook 메일 검색/다운로드
````

## Step 3: 스킬 실행

### 3-1. 스킬 라우팅

스킬 카탈로그를 참조하여 사용자의 요청을 가장 적합한 스킬에 라우팅한다. 단일 스킬에 명확히 라우팅되지 않으면 후보 스킬들을 선택지로 제시하여 사용자에게 확인한다. (`.claude/rules/sd-options.md`를 읽고 따른다)

### 3-2. 안내 및 실행

선택된 스킬을 사용자에게 알리는 텍스트 메시지를 출력한 후 Skill 도구를 호출한다. 안내는 필수이다. 예시: `> **sd-commit** 스킬을 실행합니다.`

선택된 스킬 이름과 함께 사용자의 원래 요청을 `args`로 전달한다.
