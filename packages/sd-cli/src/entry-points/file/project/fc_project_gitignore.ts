export const fc_project_gitignore = (): string => /* language=gitignore */ `

.idea/**/workspace.xml
.idea/shelf

.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions
!.yarn/cache
#.pnp.*

node_modules
tsconfig-build.json
dist
.cache
.cordova
_logs
_modules
_routes.ts
~$*
.*/

`.trim();
