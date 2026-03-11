# Skill Authoring Best Practices (Anthropic Official)

> Condensed from Anthropic's official skill authoring guide. Covers patterns not already in cso-guide.md, writing-guide.md, or testing-skills-with-subagents.md.

## Core Principles

### Concise is key

Context window is a public good. Only metadata (name, description) is pre-loaded; SKILL.md is read on-demand. But once loaded, every token competes with conversation history.

**Default assumption:** Claude is already very smart. Only add context Claude doesn't already have.

### Set appropriate degrees of freedom

Match specificity to task fragility:

| Freedom level | When to use | Example |
|--------------|-------------|---------|
| **High** (text instructions) | Multiple valid approaches, context-dependent | Code review process |
| **Medium** (pseudocode/templates) | Preferred pattern exists, some variation ok | Report generation template |
| **Low** (exact scripts) | Fragile operations, consistency critical | Database migration commands |

**Analogy:** Narrow bridge with cliffs = low freedom (exact instructions). Open field = high freedom (general direction).

### Test with all models you plan to use

- **Haiku**: Does the Skill provide enough guidance?
- **Sonnet**: Is the Skill clear and efficient?
- **Opus**: Does the Skill avoid over-explaining?

What works for Opus might need more detail for Haiku.

## Skill Structure

### Progressive disclosure

SKILL.md = overview that points to detailed files. Keep body under 500 lines.

```
pdf/
├── SKILL.md              # Main instructions (loaded when triggered)
├── FORMS.md              # Form-filling guide (loaded as needed)
├── reference.md          # API reference (loaded as needed)
└── scripts/
    ├── analyze_form.py   # Utility script (executed, not loaded)
    └── fill_form.py      # Form filling script
```

**Key rules:**
- Keep references one level deep from SKILL.md (no nested references)
- For files 100+ lines, include table of contents at top
- Name files descriptively: `form_validation_rules.md`, not `doc2.md`

## Workflows and Feedback Loops

### Use workflows for complex tasks

Break complex operations into sequential steps with a checklist:

````markdown
## PDF form filling workflow

```
Task Progress:
- [ ] Step 1: Analyze the form (run analyze_form.py)
- [ ] Step 2: Create field mapping (edit fields.json)
- [ ] Step 3: Validate mapping (run validate_fields.py)
- [ ] Step 4: Fill the form (run fill_form.py)
- [ ] Step 5: Verify output (run verify_output.py)
```
````

### Implement feedback loops

**Pattern:** Run validator -> fix errors -> repeat

```markdown
1. Make edits to document
2. **Validate immediately**: `python scripts/validate.py`
3. If validation fails: fix issues, run validation again
4. **Only proceed when validation passes**
```

### Conditional workflow pattern

```markdown
1. Determine the modification type:
   **Creating new?** -> Follow "Creation workflow"
   **Editing existing?** -> Follow "Editing workflow"
```

## Content Guidelines

- **Avoid time-sensitive info**: Use "Current method" / "Old patterns" sections instead of dates
- **Consistent terminology**: Pick one term and use it throughout (not "endpoint" + "URL" + "route")
- **Provide defaults, not options**: "Use pdfplumber" not "You can use pypdf, or pdfplumber, or..."

## Executable Code Patterns

### Solve, don't punt

Handle errors in scripts rather than failing and letting Claude figure it out.

### Plan-validate-execute pattern

For complex batch operations, add an intermediate plan file:

1. Analyze input
2. **Create plan file** (e.g., `changes.json`)
3. **Validate plan** with script
4. Execute plan
5. Verify output

Catches errors before changes are applied. Use for: batch operations, destructive changes, high-stakes operations.

### Utility scripts

Pre-made scripts > generated code:
- More reliable, save tokens, ensure consistency
- Make execution intent clear: "Run `script.py`" (execute) vs "See `script.py`" (read as reference)

### Package dependencies

List required packages in SKILL.md and verify availability.

### MCP tool references

Always use fully qualified names: `ServerName:tool_name`

```markdown
Use the BigQuery:bigquery_schema tool to retrieve table schemas.
```

## Checklist

### Core quality
- [ ] Description specific with key terms
- [ ] SKILL.md body under 500 lines
- [ ] No time-sensitive information
- [ ] Consistent terminology
- [ ] Concrete examples
- [ ] References one level deep
- [ ] Clear workflow steps

### Code and scripts
- [ ] Scripts solve problems (don't punt to Claude)
- [ ] Explicit error handling
- [ ] No magic constants
- [ ] Required packages listed
- [ ] Forward slashes in paths (not backslash)
- [ ] Validation/verification steps for critical operations
- [ ] Feedback loops for quality-critical tasks

### Testing
- [ ] Tested with real usage scenarios
- [ ] Tested across model tiers if applicable
