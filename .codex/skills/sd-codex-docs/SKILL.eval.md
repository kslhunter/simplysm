# Eval: sd-codex-docs

## 행동 Eval

### 시나리오 1: 루트 AGENTS.md를 작업 지침서로 생성

- 입력: "$sd-codex-docs"
- 체크리스트:
  - [ ] `.codex/skills/sd-codex-docs/SKILL.md`의 `## Step 4: 루트 AGENTS.md 생성` 아래에 루트 AGENTS.md를 Codex가 작업 전에 읽고 따르는 작업 지침서로 작성하라는 문장이 있다.
  - [ ] `.codex/skills/sd-codex-docs/SKILL.md`의 `## Step 4: 루트 AGENTS.md 생성` 아래에 프로젝트 소개서, 기술 스택 요약서, 아키텍처 설명서처럼 작성하지 말라는 문장이 있다.
  - [ ] `.codex/skills/sd-codex-docs/SKILL.md`의 루트 AGENTS.md 포함 섹션 목록에 `작업 언어`, `무조건 항상 읽어야 할 자료`, `저장소 구조와 수정 경계`, `패키지 라우팅`, `명령어`, `코딩 규칙`, `테스트와 검증 기준`, `주의할 변경사항`이 모두 포함되어 있다.
  - [ ] `.codex/skills/sd-codex-docs/SKILL.md`의 루트 AGENTS.md 예시에 `## 작업 언어`, `## 무조건 항상 읽어야 할 자료`, `## 저장소 구조와 수정 경계`, `## 패키지 라우팅`, `## 명령어`, `## 코딩 규칙`, `## 테스트와 검증 기준`, `## 주의할 변경사항` 제목이 모두 포함되어 있다.
  - [ ] `.codex/skills/sd-codex-docs/SKILL.md`의 `#### 작성 원칙`에 일반적인 `npm run script -- --flag` 습관을 추측으로 적용하지 말라는 규칙이 있다.
  - [ ] `.codex/skills/sd-codex-docs/SKILL.md`의 `#### 작성 원칙`에 `pnpm sd-cli <command>`처럼 커스텀 CLI를 감싸는 스크립트는 `--target` 같은 옵션을 중간 `--` 없이 작성하라는 규칙이 있다.
  - [ ] `.codex/skills/sd-codex-docs/SKILL.md`에 `#### 명령어 작성 규칙` 섹션이 없다.
  - [ ] `.codex/skills/sd-codex-docs/SKILL.md`의 루트 AGENTS.md 제외할 내용에 프로젝트 홍보 문구, 긴 개요, 기술 스택 나열만을 위한 섹션, 작업 판단에 쓰이지 않는 의존 관계 다이어그램이 포함되어 있다.

## 안티패턴 Eval

- [ ] 루트 AGENTS.md 포함 섹션 목록이 `프로젝트 정보`, `모노레포 구조`, `기술 스택`, `아키텍처` 중심의 필수 섹션 목록으로만 구성되어 있지 않다.
- [ ] 루트 AGENTS.md 예시가 명령어, 아키텍처, 코딩 규칙만 중심으로 구성되어 있지 않다.
