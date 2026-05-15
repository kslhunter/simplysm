---
name: sd-commit
description: 워크스페이스의 모든 변경을 단일 커밋으로 묶는 스킬. Use when 여러 변경 사항을 한 번에 커밋해야 할 때
---

# 총괄 커밋

system prompt 의 "Committing changes with git" 절차를 따르되, 아래만 적용한다.

- Staging은 `git add -A` 사용. 본 스킬 호출 = 사용자가 -A 위험(민감 파일 staging) 인지·동의한 것으로 간주.
- 메시지는 사용자 응답 언어와 일치.
- 변경이 여러 갈래면:
  - 제목: 갈래들을 `및`/`,` 로 한 줄 병합
  - 본문(빈 줄 후): 갈래별 헤더 `[<type>]: <갈래 요약>` + 변경 항목 불릿(`-`). 갈래 간 빈 줄로 분리.
  - `<type>`: conventional commits (`fix`/`feat`/`refactor`/`docs`/`chore`/`test`/`build`/`ci`/`style`/`perf`)
- 푸시는 수행하지 않음.
