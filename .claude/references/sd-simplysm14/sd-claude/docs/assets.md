# Asset Structure

`claude/` 디렉토리는 배포 에셋으로, `postinstall` 시 소비 프로젝트의 `.claude/`에 복사된다. `sd-*` 접두어를 가진 항목만 관리 대상이다.

## 디렉토리 구조

```
claude/
├── references/          ← 스킬/규칙에서 참조하는 공유 문서
├── rules/               ← Claude Code 규칙 파일
├── skills/              ← 스킬 파일 디렉토리
├── sd-check-bash.py      ← 훅 스크립트
├── sd-check-write.py    ← 훅 스크립트
├── sd-session-start.sh  ← 훅 스크립트
└── sd-statusline.py     ← 훅 스크립트
```

## `claude/skills/`

16개 `sd-*` 접두어 스킬 디렉토리. 각 스킬은 아래 파일을 포함한다:

| 파일            | 필수 | Description                                                  |
| --------------- | ---- | ------------------------------------------------------------ |
| `SKILL.md`      | 필수 | 스킬 정의 (YAML frontmatter: `name`, `description`, `model`) |
| `SKILL.eval.md` | 선택 | Eval 시나리오                                                |
| `references/`   | 선택 | 스킬에서 참조하는 참고 문서                                  |

### 스킬 목록

| 디렉토리            | 스킬 이름        | Description                                      |
| ------------------- | ---------------- | ------------------------------------------------ |
| `sd-check/`         | sd-check         | typecheck/lint/test 실행 및 에러 해결            |
| `sd-claude-docs/`   | sd-claude-docs   | CLAUDE.md + usage 문서 동시 생성                 |
| `sd-commit/`        | sd-commit        | 전체 변경사항에 대한 단일 커밋 생성              |
| `sd-debug/`         | sd-debug         | 버그 근본 원인 분석 및 해결책 제안               |
| `sd-deliverable/`   | sd-deliverable   | 매뉴얼/SIT 문서 생성                             |
| `sd-dev/`           | sd-dev           | 통합 개발 오케스트레이터 (요구명세 → TDD → 리뷰) |
| `sd-doc-extract/`   | sd-doc-extract   | 문서 파일 텍스트/이미지 추출 (Python)            |
| `sd-issue/`         | sd-issue         | GitHub 이슈 생성                                 |
| `sd-outlook/`       | sd-outlook       | Outlook 메일 검색/다운로드 (Python)              |
| `sd-plan/`          | sd-plan          | 요구명세/구현계획 작성                           |
| `sd-prompt/`        | sd-prompt        | 스킬/프롬프트 파일 작성/개선                     |
| `sd-refactor/`      | sd-refactor      | 리팩토링 분석 리포트 생성                        |
| `sd-review/`        | sd-review        | 코드 리뷰 리포트 생성                            |
| `sd-tdd/`           | sd-tdd           | TDD 개발                                         |
| `sd-use/`           | sd-use           | 자연어 → sd-\* 스킬 라우팅                       |
| `sd-wbs/`           | sd-wbs           | WBS Feature 분해                                 |

### SKILL.md frontmatter 형식

```yaml
---
name: sd-commit
description: 전체 변경사항에 대한 단일 커밋을 생성하는 스킬. ...
model: haiku
---
```

| Field         | Type     | Description                        |
| ------------- | -------- | ---------------------------------- |
| `name`        | `string` | 스킬 이름 (슬래시 명령어로 사용됨) |
| `description` | `string` | 스킬 설명 (스킬 목록에 표시됨)     |
| `model`       | `string` | 사용할 모델 (선택, 예: `haiku`)    |

## `claude/rules/`

Claude Code 규칙 파일. 세션 시작 시 `sd-session-start.sh`에 의해 읽기 대상으로 출력된다. 2개 파일.

| 파일                 | Description                                                          |
| -------------------- | -------------------------------------------------------------------- |
| `sd-claude-rules.md` | 금지 명령어, 도구 사용 규칙, 코딩 규칙, 대화 규칙, 패키지 참조 규칙 |
| `sd-options.md`      | 사용자에게 선택지 제시 지침 (장단점, 점수, 결정 대상 명시 규칙)     |

## `claude/references/`

스킬과 규칙에서 참조하는 공유 문서. 규칙 파일에서 `Read tool로 읽으라`는 지시로 참조된다. 7개 md파일 + 1개 디렉토리.

| 파일/디렉토리           | Description                               |
| ----------------------- | ----------------------------------------- |
| `sd-clarify.md`         | 사용자 요청 명확화 지침                   |
| `sd-debug.md`           | 디버그 프로세스 참조 문서                 |
| `sd-frontend-design.md` | 프론트엔드 UI 코드 작성 지침              |
| `sd-review.md`          | 코드 리뷰 관점 참조 문서                  |
| `sd-simplysm14.md`      | simplysm 패키지 문서 진입점               |
| `sd-simplysm14/`        | simplysm v14 패키지별 usage 문서 디렉토리 |
| `sd-testing.md`         | 테스트 작성 지침                          |

## 소스 오브 트루스

개발 시 소스 오브 트루스는 모노레포 루트의 `.claude/` 디렉토리다. `packages/sd-claude/claude/`는 `prepack`(`sync.mjs`) 시 루트에서 복사되는 배포용 스냅샷이다.

```
루트 .claude/sd-* (소스 오브 트루스)
  ↓ prepack (sync.mjs)
packages/sd-claude/claude/sd-* (배포 스냅샷)
  ↓ postinstall (postinstall.mjs)
소비 프로젝트 .claude/sd-* (설치됨)
```
