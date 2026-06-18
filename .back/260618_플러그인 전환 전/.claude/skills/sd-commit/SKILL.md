---
name: sd-commit
description: 워크스페이스의 모든 변경을 단일 커밋으로 묶는 스킬. Use when 여러 변경 사항을 한 번에 커밋해야 할 때.
model: haiku
---

# 총괄 커밋

system prompt 의 "Committing changes with git" 절차를 따르되, 아래 항목만 본 스킬의 규칙으로 덮어씀.

## git 호출 prefix

- 대상: 모든 git 호출 (`status`·`diff`·`log`·`add`·`commit`).
- 목적: Pre-tool 훅의 전역 git 조회 차단을 우회하는 마커. `add`·`commit` 도 일관성을 위해 동일 prefix.
- **도구별 prefix** — 사용 도구에 맞는 문법 1개만 선택:
  - Bash 도구 → `SDGIT=1 git ...`.
  - PowerShell 도구 → `$env:SDGIT='1'; git ...`.
- 금지:
  - Bash 도구에 `$env:...` 사용 — PowerShell 문법.
  - PowerShell 도구에 `SDGIT=1 git ...` 사용 — bash inline env 문법, PowerShell 파서 에러.

## staging

- `git add -A` 사용.
- 본 스킬 호출 = 사용자가 `-A` 위험(민감 파일 staging) 을 인지하고 동의한 것으로 간주.

## 커밋 메시지

- 언어: 사용자 응답 언어와 일치.
- `<type>`: conventional commits 분류 — `fix`·`feat`·`refactor`·`docs`·`chore`·`test`·`build`·`ci`·`style`·`perf`.
- 변경이 단일 `<type>` 인 경우: 제목 1줄만 작성.
- 변경이 복수 `<type>` 에 걸친 경우:
  - 제목: 각 `<type>` 의 요약을 `및`·`,` 로 한 줄에 병합.
  - 본문 (제목과 빈 줄로 분리): `<type>` 별로 아래 블록을 반복하고, 블록 사이를 빈 줄로 분리.
    - 헤더: `[<type>]: <해당 type 요약>`.
    - 변경 항목 bullet (`-`).

## 푸시

- 수행 안 함.
