/* eslint-disable no-console */
import { SyntaxKind } from "ts-morph";
import getTsMortphSourceFiles from "./core/get-ts-morph-source-files";
import convertSymbols from "./core/convert-symbol";

export default function convertSdIconToFaIcon() {
  // 1. SdIconControl → FaIconComponent
  convertSymbols({
    "@simplysm/sd-angular#SdIconControl": "@fortawesome/angular-fontawesome#FaIconComponent",
  });

  const sourceFiles = getTsMortphSourceFiles();

  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath();
    let didChange = false;

    const importDecls = sourceFile.getImportDeclarations();

    for (const importDecl of importDecls) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();

      // 2. pro-regular-svg-icons → 개별 모듈로 분할
      if (moduleSpecifier === "@fortawesome/pro-regular-svg-icons") {
        const namedImports = importDecl.getNamedImports();

        for (const namedImport of namedImports) {
          const name = namedImport.getName(); // e.g. faLock
          sourceFile.insertImportDeclaration(importDecl.getChildIndex(), {
            namedImports: [name],
            moduleSpecifier: `@fortawesome/pro-regular-svg-icons/${name}`,
          });
          console.log(`  [아이콘 분할 import] ${name} → /${name}`);
        }

        importDecl.remove();
        didChange = true;
      }

      // 2. free-solid-svg-icons → 개별 모듈로 분할
      if (moduleSpecifier === "@fortawesome/free-solid-svg-icons") {
        const namedImports = importDecl.getNamedImports();

        for (const namedImport of namedImports) {
          const name = namedImport.getName(); // e.g. faLock
          sourceFile.insertImportDeclaration(importDecl.getChildIndex(), {
            namedImports: [name],
            moduleSpecifier: `@fortawesome/free-solid-svg-icons/${name}`,
          });
          console.log(`  [아이콘 분할 import] ${name} → /${name}`);
        }

        importDecl.remove();
        didChange = true;
      }
    }

    // 3. 템플릿 내 sd-icon → fa-icon 및 fixedWidth 보정
    const templates = sourceFile.getDescendantsOfKind(SyntaxKind.NoSubstitutionTemplateLiteral);

    for (const tmpl of templates) {
      const raw = tmpl.getLiteralText();
      if (!raw.includes("<sd-icon")) continue;

      const replaced = raw
        // <sd-icon ... /> → <fa-icon ... />
        .replace(/<sd-icon\b([^>]*)\/>/g, (_, attrs) => {
          const newAttrs = attrs
            // 이미 바인딩된 [fixedWidth]=은 건드리지 않음
            .replace(/\s(?<!\[)fixedWidth(?!\s*=\s*["'])/g, ' [fixedWidth]="true"')
            .trim();
          return `<fa-icon ${newAttrs} />`;
        })

        // <sd-icon ...>...</sd-icon> → <fa-icon ...>...</fa-icon>
        .replace(/<sd-icon\b([^>]*)>([\s\S]*?)<\/sd-icon>/g, (_, attrs, inner) => {
          const newAttrs = attrs
            .replace(/\s(?<!\[)fixedWidth(?!\s*=\s*["'])/g, ' [fixedWidth]="true"')
            .trim();
          return `<fa-icon ${newAttrs}>${inner}</fa-icon>`;
        });

      if (replaced !== raw) {
        tmpl.setLiteralValue(replaced);
        console.log(`[template] ${sourceFile.getBaseName()} :: <sd-icon> → <fa-icon> 변환됨`);
        didChange = true;
      }
    }

    if (didChange) {
      sourceFile.saveSync();
      console.log(`[저장 완료] ${filePath}`);
    }
  }
}
