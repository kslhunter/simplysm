---
name: sd-commit
description: 워크스페이스의 모든 변경을 단일 커밋으로 묶는 스킬. Use when 여러 변경 사항을 한 번에 커밋해야 할 때.
model: haiku
---

# 총괄 커밋

system prompt 의 "Committing changes with git" 절차를 따르되, 아래만 적용함.

## git 호출 prefix

- 대상: 모든 git 호출 (`status`·`diff`·`log`·`add`·`commit`).
- 목적: Pre-tool 훅의 전역 git 조회 차단 우회 마커. `add`·`commit` 도 일관성으로 동일 prefix.
- **도구별 prefix** — 사용 도구에 맞는 문법 1개만 선택:
  - Bash 도구 → `SDGIT=1 git ...`.
  - PowerShell 도구 → `$env:SDGIT='1'; git ...`.
- 금지:
  - Bash 도구에 `$env:...` 사용 — PowerShell 문법.
  - PowerShell 도구에 `SDGIT=1 git ...` 사용 — bash inline env 문법, PowerShell 파서 에러.

## staging

- `git add -A` 사용.
- 본 스킬 호출 = 사용자가 `-A` 위험(민감 파일 staging) 인지·동의.

## 커밋 메시지

- 언어: 사용자 응답 언어와 일치.
- 단일 갈래: 제목 1줄.
- 복수 갈래:
  - 제목: 갈래를 `및`·`,` 로 한 줄 병합.
  - 본문 (빈 줄 후): 갈래별로 아래 블록 반복, 블록 간 빈 줄 분리.
    - 헤더: `[<type>]: <갈래 요약>`.
    - 변경 항목 bullet (`-`).
  - `<type>`: conventional commits — `fix`·`feat`·`refactor`·`docs`·`chore`·`test`·`build`·`ci`·`style`·`perf`.

## 푸시

- 수행 X.
