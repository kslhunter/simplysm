---
name: sd-worktree
description: Use when starting new feature work, bug fixes, or any task that benefits from branch isolation - creates a git worktree under .worktrees/ and guides to next planning step
---

# sd-worktree

## Overview

`.worktrees/` 하위에 git worktree를 생성·머지·정리한다. 메인 working tree의 현재 브랜치를 원본 브랜치로 사용한다.

**중요**: Claude Code의 작업 디렉토리(cd)가 메인과 worktree를 오가므로, 각 커맨드 전후로 cd 위치를 반드시 확인할 것.

## 대상 worktree 결정

모든 커맨드에서 대상 worktree 이름은 다음 순서로 결정한다:
1. 사용자가 args에 명시한 경우 → 그대로 사용
2. 현재 cd가 `.worktrees/<name>/` 안인 경우 → 해당 `<name>` 사용 (스크립트가 자동 감지)
3. 위 둘 다 해당하지 않으면 → 사용자에게 질문

## Commands

### add — worktree 생성

args에서 작업 설명을 받아 kebab-case 이름을 결정한 뒤 실행한다.

```bash
# 메인에서 실행
node .claude/skills/sd-worktree/sd-worktree.mjs add <name>
cd .worktrees/<name>   # worktree로 이동
```

- 이후 작업은 worktree 안에서 수행
- 다음 단계 안내:
  1. **brainstorming** (`/brainstorming`)
  2. **writing-plans** (`/writing-plans`)

### rebase — 메인 브랜치 위로 rebase

```bash
# worktree 안에서 실행 가능
node .claude/skills/sd-worktree/sd-worktree.mjs rebase [name]
```

- 메인 브랜치의 최신 커밋 위로 worktree 브랜치를 rebase
- uncommitted 변경이 있으면 에러 → 먼저 commit 또는 stash 필요
- merge 전에 히스토리를 깔끔하게 정리하고 싶을 때 사용

### merge — 메인 브랜치에 머지

```bash
# worktree 안에서 실행 가능 (스크립트가 cwd를 메인으로 지정)
node .claude/skills/sd-worktree/sd-worktree.mjs merge [name]
```

- 메인 working tree의 현재 브랜치에 worktree 브랜치를 `--no-ff` merge
- uncommitted 변경이 있으면 에러 → 먼저 commit 또는 stash 필요
- merge 후 반드시 `cd <프로젝트 루트>`로 이동 (이후 clean을 위해)

### clean — worktree 제거 및 브랜치 삭제

```bash
# 반드시 메인으로 이동 후 실행 (worktree 디렉토리가 삭제됨)
cd <프로젝트 루트>
node .claude/skills/sd-worktree/sd-worktree.mjs clean <name>
```

- `git worktree remove` + `git branch -d`
- worktree 안에서 실행하면 스크립트가 에러로 차단함 → 반드시 메인으로 cd 이동 후 실행

## 전체 흐름 예시

```
(메인: 13.x)  → /sd-worktree add modal-migration
              → cd .worktrees/modal-migration
(worktree)    → ... 작업 ...
(worktree)    → /sd-worktree rebase          # (선택) 메인 최신 커밋 위로 rebase
(worktree)    → /sd-worktree merge
(worktree)    → cd <프로젝트 루트>
(메인: 13.x)  → /sd-worktree clean modal-migration
```
