---
name: sd-commit
description: 변경분을 확인해 conventional commits 메시지를 작성하고 git commit까지 수행. Use when 사용자가 커밋 메시지 작성 또는 커밋 수행을 요청할 때.
model: haiku
disable-model-invocation: true
---

# sd-commit

변경분을 확인해 커밋 메시지를 만들고 커밋한다.

- 발행(`push`, `tag` 등)은 하지 않는다.
- git 변경 명령에는 내부 허용 주석 `# sd-git-allow`를 붙인다.

## 커밋 메시지 규칙

- 언어: 사용자 응답 언어와 일치.
- `<type>`: conventional commits 분류 — `fix`·`feat`·`refactor`·`docs`·`chore`·`test`·`build`·`ci`·`style`·`perf`.
- 변경이 단일 `<type>` 인 경우: 제목 1줄만 작성.
- 변경이 복수 `<type>` 에 걸친 경우:
  - 제목: 각 `<type>` 의 요약을 `및`·`,` 로 한 줄에 병합.
  - 본문 (제목과 빈 줄로 분리): `<type>` 별로 아래 블록을 반복하고, 블록 사이를 빈 줄로 분리.
    - 헤더: `[<type>]: <해당 type 요약>`.
    - 변경 항목 bullet (`-`).
