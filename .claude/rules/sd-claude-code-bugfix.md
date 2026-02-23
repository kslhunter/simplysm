# Claude Code Bug Workarounds

## AskUserQuestion UI Clipping

Before calling `AskUserQuestion`, output **2 blank lines** (`\n\n`) so the preceding text is not clipped in the UI.
