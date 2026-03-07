---
name: sd-worktree
description: "Git worktree branch isolation (explicit invocation only)"
model: haiku
---

# sd-worktree

Branch-isolated workflow using git worktrees.

## Flow

```mermaid
flowchart TD
    START([sd-worktree invoked]) --> ADD

    subgraph ADD [add]
        A1["git worktree add .worktrees/NAME -b NAME"]
        A1 -->|fail| HALT
        A1 -->|ok| A2[detect package manager]
        A2 --> A3["pm install (cwd: .worktrees/NAME)"]
        A3 -->|fail| HALT
        A3 -->|ok| A4["cd .worktrees/NAME"]
    end

    A4 --> WORK["work + commit inside worktree"]
    WORK --> MERGE

    subgraph MERGE [merge]
        M0["cd PROJECT_ROOT"]
        M0 --> M1["git merge NAME --no-ff (cwd: PROJECT_ROOT)"]
        M1 -->|fail| HALT
        M1 -->|ok| M2[merge complete]
    end

    M2 --> CLEAN

    subgraph CLEAN [clean]
        C1{"cwd inside worktree?"}
        C1 -->|yes| HALT
        C1 -->|no| C2["rm -rf .worktrees/NAME (bash)"]
        C2 --> C3["git worktree prune"]
        C3 --> C4["git branch -d NAME"]
        C4 -->|fail| HALT
        C4 -->|ok| C5[done]
    end

    HALT([HALT - AskUserQuestion])
```

## Rules

### HALT

When any step reaches **fail** or **HALT**:

1. Show the error message to the user as-is
2. Ask the user how to proceed via `AskUserQuestion`
3. Do **nothing** until the user responds

Manual git merge, git stash, git reset, git clean, or **any workaround is forbidden**. Yolo mode does NOT override HALT.

### Worktree location

All worktrees MUST be created under **`.worktrees/`** (project root).

### Package manager detection

| File | PM |
|---|---|
| `pnpm-lock.yaml` | pnpm |
| `yarn.lock` | yarn |
| `package-lock.json` | npm |
| `bun.lockb` / `bun.lock` | bun |

### clean: use rm -rf

`git worktree remove` almost always fails on Windows due to file locks. Use `rm -rf` (bash) + `git worktree prune` instead.
