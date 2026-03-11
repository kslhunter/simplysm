# Migration Rules

When porting/migrating code from another codebase (e.g., v12 Angular → v13 SolidJS):

1. **Analyze every line**: Read the original source and all dependencies (imports, base classes, etc.) line by line. Identify every feature, prop, and behavior without exception. If a dependency cannot be found, you must ask the user.
2. **Ask about every difference**: Any change from the original (API, pattern, design, omission, addition) must be confirmed with the user. Making arbitrary decisions and proceeding is strictly prohibited.
3. **Verify after completion**: Compare the result 1:1 against the original and report any omissions or differences to the user.
