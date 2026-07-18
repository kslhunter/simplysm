---
name: sd-commit
description: 변경분을 확인해 conventional commits 메시지를 작성하고 git commit까지 수행. Use when 사용자가 sd-commit 스킬을 직접 지정해 호출할 때만 사용 (자동 트리거 금지).
model: haiku
---

# sd-commit

변경분을 확인해 커밋 메시지를 만들고 커밋함.

- 발행(`push`, `tag` 등)은 하지 말 것.
- git 변경 명령(`git add`, `git commit` 등)에는 내부 허용 주석 `# sd-git-allow`를 붙일 것. 태그 안붙이면 hook에 의해 거부됨.

## 절차

1. `git add -A # sd-git-allow` 로 모든 변경(신규·수정·삭제)을 stage 할 것.
2. `python "<이 스킬 폴더>/collect.py"` 를 실행할 것. staged 기준으로 최근 커밋 이력·변경 통계·diff·삭제 파일 목록을 수집해 임시 파일로 저장하고, 그 파일 경로만 출력함.
3. 출력된 경로의 파일을 **끝까지** 읽을 것. 내용이 잘렸다는 신호가 있으면 offset 을 옮겨 남은 부분을 모두 이어 읽을 것 — 뒷부분에만 있는 변경을 놓치면 커밋 메시지에서 누락됨.
4. 읽은 내용으로 아래 규칙에 맞는 메시지를 작성해 커밋할 것.
5. 커밋된 메시지 출력 후, `커밋되었습니다. 커밋 메시지가 마음에 들지 않을 경우 커밋을 취소하세요.` 메시지를 출력할 것.

수집 파일의 `<stat>` 에는 있는데 `<diff>` 에는 본문이 없는 파일이 있음 — 백업 디렉터리(`.back`·`_back`)와 lock 파일은 diff 본문에서 제외됨. 삭제된 파일도 본문 대신 `<deleted_files>` 의 이름 목록으로만 나옴. 이들은 파일명 기준으로 판단할 것.

## 커밋 메시지 규칙

- 언어: 사용자 응답 언어와 일치시킬 것.
- `<type>`: conventional commits 분류 — `fix`·`feat`·`refactor`·`docs`·`chore`·`test`·`build`·`ci`·`style`·`perf`.
- 변경이 단일 `<type>` 인 경우: 제목 1줄만 작성할 것.
- 변경이 복수 `<type>` 에 걸친 경우:
  - 제목: 각 `<type>` 의 요약을 `및`·`,` 로 한 줄에 병합할 것.
  - 본문 (제목과 빈 줄로 분리): `<type>` 별로 아래 블록을 반복하고, 블록 사이를 빈 줄로 분리할 것.
    - 헤더: `[<type>]: <해당 type 요약>`.
    - 변경 항목 bullet (`-`).
