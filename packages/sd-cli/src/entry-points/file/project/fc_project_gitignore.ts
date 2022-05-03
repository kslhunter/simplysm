export const fc_project_gitignore = (): string => /* language=gitignore */ `

.idea/**/workspace.xml
.idea/shelf
node_modules
tsconfig-build.json
dist
.cache
.cordova
_logs
_modules
_routes.ts
~$*.xlsx
.*

`.trim();
