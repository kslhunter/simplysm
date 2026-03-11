# LLM Prompt & Instruction Document Authoring Guide

## Persuasion Principles

All instruction documents must apply the following three principles **without exception**. Before writing the first line, declare that all three will be applied — this is not a post-hoc check.

### Authority

Use direct, imperative language. Remove ambiguity and decision burden.

- Use expressions like "must", "never", "no exceptions", "required", "important"
- Use "all", "always", "every time" to indicate rules without exceptions
- Present rules as standard practices, not personal preferences
- Bad example: "It would be nice to run the tests"
- Good example: "You must run the tests before committing. No exceptions."

### Commitment

Enforce consistency through structured formats.

- Use checklists, sequential workflows, principle lists, etc.
- Require the agent to report its plan before execution
- Bad example: "Follow the steps"
- Good example: "Before proceeding, confirm that all items in the checklist above have been completed."

### Scarcity

Create urgency and order dependency. Prevent delays and skipping.

- Use time-based or order-based constraints
- State prerequisites/priorities explicitly ("must do Y after X", "no Y without X")
- Bad example: "At some point you should validate the changes"
- Good example: "Validate immediately after each change. This validation must be performed before moving to the next step."

## Auxiliary Techniques

- **Contrast examples**: Pair bad/good examples to clarify the correct pattern.
  - **Use them** — when any of the following applies:
    - Rules that require a difference in degree/tone (the bad example draws the boundary)
    - Rules that go against the LLM's default behavior (the default behavior itself is the bad example)
    - Rules where incorrect application looks superficially reasonable (without a bad example, wrong looks right)
  - **Skip them** — when all of the following are true:
    - Binary decision (do/don't) with a clear target
    - The rule statement itself is a specific, actionable instruction
    - Incorrect application is obviously a rule violation
- **Mermaid flowcharts**: Visualize with a Mermaid flowchart when any of the following applies:
  - Nested branches (branch within a branch)
  - Conditional branches inside a loop
  - Paths that split into 3 or more directions
  - Flows that return to a previous step (retry, rollback)

  A single if-else, simple iteration, or sequential steps with about one condition are sufficient as text lists.
