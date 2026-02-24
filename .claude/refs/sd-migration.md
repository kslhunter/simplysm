# Migration Rules

When porting/migrating code from another codebase (e.g., v12 Angular → v13 SolidJS):

1. **Analyze every line**: Read the original source and all its dependencies (imports, base classes, etc.) line by line. Understand every feature, prop, and behavior. If a dependency cannot be found, ask the user.
2. **Ask about every difference**: Any change from the original (API, pattern, design, omission, addition) must be asked to the user. Never decide silently.
3. **Verify after completion**: Compare the result 1:1 with the original and report any omissions or differences to the user.
