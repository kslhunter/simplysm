---
name: sd-commit
description: 워크스페이스 전체 변경을 staging 한 뒤 git diff 기반으로 conventional commits 메시지를 작성해 단일 커밋. API 키 없이 현재 Claude 세션(haiku)으로 동작. /sd:sd-commit 으로 호출.
model: haiku
disable-model-invocation: true
---

# sd-commit

워크스페이스의 모든 변경을 staging → git diff 기반 conventional commits 메시지 작성 → **단일 커밋**까지 완결. OpenAI·Anthropic API 키 불필요, haiku 로 수행.

## 절대 원칙

- 변경을 **의미 단위로 쪼개 여러 커밋으로 분리하지 말 것** — 한 repo 의 변경은 원칙적으로 **단일 커밋**.
- 예외 — **저장소 경계 분리 커밋**: 한 워크스페이스가 여러 원격 저장소로 나뉘어 push 되는 구조(예: git subtree 로 특정 폴더만 별도 repo 로 가는 경우)에서는 그 **저장소 경계로만** 커밋을 분리한다. 경계 위치·분리 여부는 해당 repo 규칙(CLAUDE.md 등)을 따른다. "의미 단위 분할" 과 다르며, 그 외 사유로는 분리하지 않는다.
- staging·커밋은 `collect.py`·`commit.py` 로만 수행한다. `git add`·`git reset`·`git commit` 등 git 명령을 **직접 실행 금지** — 이 두 스크립트 외의 방법으로 커밋하지 않는다.

## 절차

1. 컨텍스트 수집:

   ```
   python "${CLAUDE_PLUGIN_ROOT}/skills/sd-commit/scripts/collect.py"
   ```

   - `git add -A` 후 diff/log/stat 을 임시 파일에 저장하고, 그 파일 경로를 stdout 으로 출력.
   - `변경사항이 없습니다.` 로 종료(exit 1)하면 커밋할 변경이 없는 것 — 그 사실만 알리고 종료.

2. 출력된 context 파일을 **처음부터 끝까지 전부** Read 한 뒤(2000줄을 넘으면 `offset` 으로 이어 읽어 **한 줄도 누락 없이** 전부 확보), 아래 규칙으로 커밋 메시지를 작성.
   - 언어: 사용자 응답 언어와 일치.
   - `<type>`: conventional commits 분류 — `fix`·`feat`·`refactor`·`docs`·`chore`·`test`·`build`·`ci`·`style`·`perf`.
   - 변경이 단일 `<type>` 인 경우: 제목 1줄만 작성.
   - 변경이 복수 `<type>` 에 걸친 경우:
     - 제목: 각 `<type>` 의 요약을 `및`·`,` 로 한 줄에 병합.
     - 본문 (제목과 빈 줄로 분리): `<type>` 별로 아래 블록을 반복하고, 블록 사이를 빈 줄로 분리.
       - 헤더: `[<type>]: <해당 type 요약>`.
       - 변경 항목 bullet (`-`).

3. 작성한 메시지를 **stdin** 으로 commit.py 에 넘겨 커밋(메시지를 셸 인자로 넣지 말 것 — 따옴표·백틱에서 깨짐). commit.py 가 staging 을 전담한다 — 매 호출 시 인덱스를 초기화한 뒤 대상만 다시 담아 커밋하므로, 아래 형식으로만 호출한다. stdin 전달 구문은 셸에 맞춘다 — bash 는 heredoc, PowerShell 은 here-string 파이프(`@'...'@ | python ...`). PowerShell 에서 heredoc(`<<`)은 파서 에러가 나며, here-string 의 닫는 `'@` 는 들여쓰기 없이 줄 맨 앞 단독 줄에 와야 한다(아래 예시는 마크다운 들여쓰기가 있으니 실제 실행 시 `'@` 를 줄 맨 앞으로).

   - **단일 커밋 (일반)**: 메시지만 stdin 으로 넘긴다.

     bash:

     ```
     python "${CLAUDE_PLUGIN_ROOT}/skills/sd-commit/scripts/commit.py" <<'COMMIT_MSG'
     <작성한 커밋 메시지>
     COMMIT_MSG
     ```

     PowerShell:

     ```
     @'
     <작성한 커밋 메시지>
     '@ | python "${CLAUDE_PLUGIN_ROOT}/skills/sd-commit/scripts/commit.py"
     ```

   - **저장소 경계 분리 커밋 (절대 원칙의 예외 상황만)**: 경계별로 commit.py 를 반복 호출한다. 각 경계는 `--only <경로...>` 로 그 경로만 커밋하고, **마지막(나머지) 경계는 `--only` 를 생략**해 잔여 전체를 커밋한다(분류 누락 방지). 경계별 메시지는 각각 stdin 으로 넘긴다.

     예 — `shared/` 폴더만 별도 repo 로 가는 구조에서 `shared/` 와 그 외를 분리:

     bash:

     ```
     python "${CLAUDE_PLUGIN_ROOT}/skills/sd-commit/scripts/commit.py" --only shared/ <<'COMMIT_MSG'
     <shared/ 변경 메시지 — 그 별도 repo 에 공개돼도 무관한 내용만>
     COMMIT_MSG

     python "${CLAUDE_PLUGIN_ROOT}/skills/sd-commit/scripts/commit.py" <<'COMMIT_MSG'
     <나머지(개인) 변경 메시지>
     COMMIT_MSG
     ```

     PowerShell:

     ```
     @'
     <shared/ 변경 메시지 — 그 별도 repo 에 공개돼도 무관한 내용만>
     '@ | python "${CLAUDE_PLUGIN_ROOT}/skills/sd-commit/scripts/commit.py" --only shared/

     @'
     <나머지(개인) 변경 메시지>
     '@ | python "${CLAUDE_PLUGIN_ROOT}/skills/sd-commit/scripts/commit.py"
     ```