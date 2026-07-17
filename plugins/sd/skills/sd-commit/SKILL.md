---
name: sd-commit
description: 변경분을 확인해 conventional commits 메시지를 작성하고 git commit까지 수행. Use when 사용자가 sd-commit 스킬을 직접 지정해 호출할 때만 사용 (자동 트리거 금지).
model: haiku
---

# sd-commit

변경분을 확인해 커밋 메시지를 만들고 커밋함.

- 발행(`push`, `tag` 등)은 하지 말 것.
- git 변경 명령(`git add`, `git commit` 등)에는 내부 허용 주석 `# sd-git-allow`를 붙일 것. 태그 안붙이면 hook에 의해 거부됨.
- 커밋 전 `git add -A # sd-git-allow` 를 먼저 실행해 모든 변경(신규·수정·삭제)을 stage 하고, staged를 기준으로 커밋 메시지를 작성할 것.
- 커밋된 메시지 출력 후, `커밋되었습니다. 커밋 메시지가 마음에 들지 않을 경우 커밋을 취소하세요.` 메시지를 출력할 것.

## 커밋 메시지 규칙

- 언어: 사용자 응답 언어와 일치시킬 것.
- `<type>`: conventional commits 분류 — `fix`·`feat`·`refactor`·`docs`·`chore`·`test`·`build`·`ci`·`style`·`perf`.
- 변경이 단일 `<type>` 인 경우: 제목 1줄만 작성할 것.
- 변경이 복수 `<type>` 에 걸친 경우:
  - 제목: 각 `<type>` 의 요약을 `및`·`,` 로 한 줄에 병합할 것.
  - 본문 (제목과 빈 줄로 분리): `<type>` 별로 아래 블록을 반복하고, 블록 사이를 빈 줄로 분리할 것.
    - 헤더: `[<type>]: <해당 type 요약>`.
    - 변경 항목 bullet (`-`).
