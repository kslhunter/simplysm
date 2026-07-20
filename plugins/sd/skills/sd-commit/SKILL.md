---
name: sd-commit
description: 변경분을 확인해 conventional commits 메시지를 작성하고 git commit까지 수행. Use when 사용자가 직접 호출할 때만.
model: haiku
---

# sd-commit

- 발행(`push`, `tag` 등)은 하지 마세요.
- git 변경 명령(`git add`, `git commit` 등)에는 내부 허용 주석 `# sd-git-allow` 를 붙여야 합니다. 태그를 안 붙이면 hook 에 의해 거부됩니다.

## 절차

1. `git status --porcelain` 으로 변경 파일을 확인하고 프로젝트 포맷터로 포맷하세요.
2. `git add -A # sd-git-allow` 로 모든 변경(신규, 수정, 삭제)을 stage 하세요.
3. `python "${CLAUDE_SKILL_DIR}/scripts/collect.py"` 를 실행하세요.
   - staged 기준으로 최근 커밋 이력, 변경 통계, diff, 삭제 파일 목록을 수집해 임시 파일로 저장하고, 그 파일 경로만 출력합니다.
4. 출력된 경로의 파일을 끝까지 읽어야 합니다.
   - 내용이 잘렸다는 신호가 있으면 offset 을 옮겨 남은 부분을 모두 이어 읽으세요.
   - 뒷부분에만 있는 변경을 놓치면 커밋 메시지에서 누락됩니다.
5. 읽은 내용으로 아래 규칙에 맞는 메시지를 작성해 커밋하세요.
6. 커밋된 메시지 출력 후, `커밋되었습니다. 커밋 메시지가 마음에 들지 않을 경우 커밋을 취소하세요.` 메시지를 출력하세요.

- 수집 파일의 `<stat>` 에는 있는데 `<diff>` 에는 본문이 없는 파일은 파일명 기준으로 판단하세요.
  - 백업 디렉터리(`.back`, `_back`)와 lock 파일은 diff 본문에서 제외됩니다.
  - 삭제된 파일은 본문 대신 `<deleted_files>` 의 이름 목록으로만 나옵니다.

## 커밋 메시지 규칙

- 언어는 사용자 응답 언어와 일치시키세요.
- `<type>` 은 conventional commits 분류입니다 — `fix`, `feat`, `refactor`, `docs`, `chore`, `test`, `build`, `ci`, `style`, `perf`.
- 변경이 단일 `<type>` 이면 `<type>: <요약>` 제목 1줄만 작성하세요.
- 변경이 복수 `<type>` 에 걸치면 아래와 같이 작성하세요.
  - 제목은 `misc: <총괄 요약>` 입니다. 변경 전체를 아우르는 한 줄을 쓰세요.
    - `<type>` 별 요약을 제목에 열거하지 마세요. 개별 내용은 본문 블록에서만 드러냅니다.
  - 본문은 제목과 빈 줄로 분리하고, `<type>` 별로 아래 블록을 반복하며 블록 사이를 빈 줄로 분리합니다.
    - 헤더: `[<type>]: <해당 type 요약>`.
    - 변경 항목 bullet (`-`).
