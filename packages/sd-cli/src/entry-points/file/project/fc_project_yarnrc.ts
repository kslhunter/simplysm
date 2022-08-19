export const fc_project_yarnrc = (): string => /* language=yml */ `
nodeLinker: node-modules

packageExtensions:
  "@angular-architects/module-federation-runtime@*":
    dependencies:
      "@angular/common": ^14.0.0
      "@angular/core": ^14.0.0
      rxjs: ^7.4.0
      zone.js: ~0.11.4

yarnPath: .yarn/releases/yarn-3.2.2.cjs

`.trim();
