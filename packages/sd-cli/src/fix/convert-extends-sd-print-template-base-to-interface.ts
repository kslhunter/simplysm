/* eslint-disable no-console */
import * as path from "path";
import { SyntaxKind } from "ts-morph";
import getTsMorphSourceFiles from "./core/get-ts-morph-source-files";
import removeNamedImport from "./core/remove-named-import";

export function convertExtendsSdPrintTemplateBaseToInterface() {
  const sourceFiles = getTsMorphSourceFiles();

  let totalChanged = 0;

  for (const sourceFile of sourceFiles) {
    let changed = false;
    const relPath = path.basename(sourceFile.getFilePath());

    const printClass = sourceFile.getClasses().find((classDecl) => {
      const extendsClause = classDecl
        .getHeritageClauses()
        .find((h) => h.getToken() === SyntaxKind.ExtendsKeyword);
      if (!extendsClause) return false;
      const typeNodes = extendsClause.getTypeNodes();
      return typeNodes.some((typeNode) =>
        /^SdPrintTemplateBase\s*<[^>]+>$/.test(typeNode.getText()),
      );
    });

    if (!printClass) continue;

    const extendsClause = printClass
      .getHeritageClauses()
      .find((h) => h.getToken() === SyntaxKind.ExtendsKeyword);
    if (!extendsClause) continue;
    const typeNodes = extendsClause.getTypeNodes();
    const match = typeNodes[0]?.getText().match(/^SdPrintTemplateBase\s*<([^>]+)>$/);
    if (!match) continue;
    const paramTypeName = match[1].trim();
    const paramInterface = sourceFile.getInterface(paramTypeName);
    if (!paramInterface) continue;
    const props = paramInterface.getProperties();
    const paramNames = props.map((p) => p.getName());

    // 1. property/class 필드 추가
    let lastPropIdx = 0;
    for (const prop of props) {
      const propName = prop.getName();
      const isOptional = prop.hasQuestionToken();
      const propType = prop.getTypeNode()?.getText() ?? "any";
      const initializer = `input${isOptional ? "" : ".required"}<${propType}>()`;
      if (!printClass.getProperty(propName)) {
        printClass.insertProperty(lastPropIdx, { name: propName, initializer });
        lastPropIdx++;
        changed = true;
      }
    }

    // 2. implements 추가
    if (!printClass.getImplements().some(i => i.getText() === "ISdPrint")) {
      printClass.addImplements("ISdPrint");
      changed = true;
    }

    // 3. super() 삭제 (생성자)
    const ctor = printClass.getConstructors().first();
    if (ctor) {
      ctor.getStatements().forEach((stmt) => {
        if (stmt.getKind() === SyntaxKind.ExpressionStatement) {
          const expr = stmt.asKind(SyntaxKind.ExpressionStatement)?.getExpression();
          if (expr?.asKind(SyntaxKind.CallExpression)?.getExpression().getText() === "super") {
            stmt.remove();
            changed = true;
          }
        }
      });
    }

    // 4. this.print() 전체 삭제
    printClass
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter((expr) =>
        expr.getExpression().getKind() === SyntaxKind.PropertyAccessExpression &&
        expr.getExpression().getText() === "this.print",
      )
      .forEach((expr) => {
        const parentStmt = expr.getFirstAncestorByKind(SyntaxKind.ExpressionStatement);
        if (parentStmt) {
          parentStmt.remove();
          changed = true;
        }
      });

    // 5. params().xxx → xxx() 및 this.params().xxx → this.xxx() AST 치환
    printClass.forEachDescendant((node) => {
      if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
        const propAccess = node.asKind(SyntaxKind.PropertyAccessExpression)!;
        const propName = propAccess.getName();
        if (!paramNames.includes(propName)) return;
        const expr = propAccess.getExpression();

        if (expr.getKind() === SyntaxKind.CallExpression) {
          const callExpr = expr.asKind(SyntaxKind.CallExpression)!;
          const innerExpr = callExpr.getExpression();

          if (innerExpr.getKind() === SyntaxKind.Identifier && innerExpr.getText() === "params") {
            propAccess.replaceWithText(`${propName}()`);
            changed = true;
          } else if (
            innerExpr.getKind() === SyntaxKind.PropertyAccessExpression &&
            innerExpr.asKind(SyntaxKind.PropertyAccessExpression)!.getExpression().getKind() === SyntaxKind.ThisKeyword &&
            innerExpr.asKind(SyntaxKind.PropertyAccessExpression)!.getName() === "params"
          ) {
            propAccess.replaceWithText(`this.${propName}()`);
            changed = true;
          }
        }
      }
    });

    // 6. @Component template: params().xxx → xxx() 치환
    const componentDecorator = printClass.getDecorator("Component");
    if (componentDecorator) {
      const arg = componentDecorator.getArguments().first();
      if (arg?.getKind() === SyntaxKind.ObjectLiteralExpression) {
        const tplProp = arg.asKind(SyntaxKind.ObjectLiteralExpression)!.getProperty("template");
        if (
          tplProp?.getKind() === SyntaxKind.PropertyAssignment &&
          tplProp.asKind(SyntaxKind.PropertyAssignment)!.getInitializer()
        ) {
          const propAssign = tplProp.asKind(SyntaxKind.PropertyAssignment)!;
          const init = propAssign.getInitializerOrThrow();
          let tplText = init.getText();
          let tplTextRaw = tplText;
          for (const paramName of paramNames) {
            const paramsPattern = new RegExp(`params\\(\\)\\.${paramName}\\b`, "g");
            tplTextRaw = tplTextRaw.replace(paramsPattern, `${paramName}()`);
          }
          if (tplTextRaw !== tplText) {
            propAssign.setInitializer(tplTextRaw);
            changed = true;
          }
        }
      }
    }

    // 7. import 정리
    const sdAngularImport = sourceFile.getImportDeclaration(
      d => d.getModuleSpecifierValue() === "@simplysm/sd-angular"
    );
    if (sdAngularImport) {
      const namedImports = sdAngularImport.getNamedImports();
      if (!namedImports.some(n => n.getName() === "ISdPrint")) {
        sdAngularImport.addNamedImport("ISdPrint");
        changed = true;
      }
    } else {
      sourceFile.addImportDeclaration({
        namedImports: ["ISdPrint"],
        moduleSpecifier: "@simplysm/sd-angular"
      });
      changed = true;
    }

    const ngCoreImport = sourceFile.getImportDeclaration(
      (d) => d.getModuleSpecifierValue() === "@angular/core",
    );
    if (ngCoreImport) {
      const imports = ngCoreImport.getNamedImports().map((n) => n.getName());
      if (!imports.includes("input")) {
        ngCoreImport.addNamedImport("input");
        changed = true;
      }
    } else {
      sourceFile.addImportDeclaration({
        namedImports: ["input"],
        moduleSpecifier: "@angular/core",
      });
      changed = true;
    }

    // 8. interface 선언 삭제
    paramInterface.remove();

    // 9. extends 삭제
    printClass.removeExtends();

    // 10. 불필요한 import 제거
    removeNamedImport(sourceFile, "@simplysm/sd-angular", "SdPrintTemplateBase");

    // 11. 저장 및 로그 출력
    if (changed) {
      sourceFile.saveSync();
      totalChanged++;
      console.log(`[print-updated] ${relPath} :: 프린트 기반 변경 완료`);
    }
  }

  if (totalChanged > 0) {
    console.log(`\n[완료] 프린트 변환 완료 (총 ${totalChanged}개)`);
  } else {
    console.log(`[완료] 변환 대상 없음`);
  }
}
