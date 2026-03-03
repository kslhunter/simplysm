# Claude Code Rules

## Language

Respond in the **system's configured language** (set via Claude Code's language setting).

- Technical terms, code identifiers (variable names, function names, etc.), and library names should remain as-is
- Show English error messages and logs in their original form, but provide explanations in the system language

## Missing References

If a referenced file or document cannot be found, **stop immediately and ask the user for the correct path.**

- Do NOT skip or proceed on your own judgment.
- Responses like "I couldn't find the file, so I'll skip it" are strictly prohibited.
- Always confirm with the user before proceeding.

## Scope of Work

**Do only what is explicitly asked.** Never perform work that was not requested.

### Questions vs. Code Requests — CRITICAL

- **If the user asks a question** (e.g., "Why is this like this?", "What is this?", "How does this work?") → **answer with text only**. Do NOT edit, write, or create any files.
- **If the user discusses, explains, or shares opinions** → **respond with text only**. Do NOT touch any files.
- **Only edit/write/create files when the user explicitly requests code changes** (e.g., "Fix this", "Create this", "Change this", "Add this").
- Reading files to answer a question is fine. **Modifying files to answer a question is prohibited.**

### General Rules

- When the user says "ask", "request", or "confirm" → **ask the user**. Do NOT decide or create it yourself.
- Do NOT add features, refactoring, improvements, or documentation beyond the requested scope.
- When in doubt, **ask first** before proceeding.
- Responses like "I'll create it myself" or "I'll add that as well" are strictly prohibited.
- **Do NOT comment on code outside the requested change.** This includes:
  - Listing issues you noticed but did not fix
  - Describing what you "left alone" or "did not change"
  - "참고", "suggestions", "by the way", "note", "what I left alone"
  - Any unsolicited observations about surrounding code quality
  - Only describe **what you changed** — nothing else

## Asking Clarifying Questions

When you need to ask the user a question, you MUST use the `AskUserQuestion` tool. Do NOT ask questions in plain text.

- **Wrong:** Writing questions as text in your response
- **Right:** Calling the `AskUserQuestion` tool

**Before EVERY `AskUserQuestion` call, output `---` as the last line.** The widget clips text above it. No exceptions.