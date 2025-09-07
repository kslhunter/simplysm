/* eslint-disable no-console */
import * as path from "path";
import { SyntaxKind } from "ts-morph";
import getTsMorphSourceFiles from "./core/get-ts-morph-source-files";
import removeNamedImport from "./core/remove-named-import";

export function convertExtendsSdModalBaseToInterface() {
  const sourceFiles = getTsMorphSourceFiles();

  let totalChanged = 0;

  for (const sourceFile of sourceFiles) {
    let changed = false;
    const relPath = path.basename(sourceFile.getFilePath());

    const modalClass = sourceFile.getClasses().find((classDecl) => {
      const extendsClause = classDecl
        .getHeritageClauses()
        .find((h) => h.getToken() === SyntaxKind.ExtendsKeyword);
      if (!extendsClause) return false;
      const typeNodes = extendsClause.getTypeNodes();
      return typeNodes.some((typeNode) =>
        /^SdModalBase\s*<[^,>]+,\s*[^>]+\s*>$/.test(typeNode.getText()),
      );
    });

    if (!modalClass) continue;

    const extendsClause = modalClass
      .getHeritageClauses()
      .find((h) => h.getToken() === SyntaxKind.ExtendsKeyword);
    if (!extendsClause) continue;
    const typeNodes = extendsClause.getTypeNodes();
    const match = typeNodes[0]?.getText().match(/^SdModalBase\s*<([^,>]+),\s*([^>]+)\s*>$/);
    if (!match) continue;
    const paramTypeName = match[1].trim();
    const modalOutputTypeText = match[2].trim();
    const paramInterface = sourceFile.getInterface(paramTypeName);
    if (!paramInterface) continue;
    let props = paramInterface.getProperties();
    let paramNames = props.map((p) => p.getName());

    const onlyISharedData =
      props.length === 0 &&
      paramInterface.getExtends().some(e =>
        e.getText().includes("ISharedDataModalInputParam")
      );

    if (onlyISharedData) {
      props = [
        {
          getName: () => "selectedItemKeys",
          hasQuestionToken: () => false,
          getTypeNode: () => ({ getText: () => "any[]" })
        },
        {
          getName: () => "selectMode",
          hasQuestionToken: () => true,
          getTypeNode: () => ({ getText: () => `"single" | "multi"` })
        }
      ] as any;
      paramNames = ["selectedItemKeys", "selectMode"];
    }

    // 1. property/class 필드/close 추가
    let lastPropIdx = 0;
    for (const prop of props) {
      const propName = prop.getName();
      const isOptional = prop.hasQuestionToken();
      const propType = prop.getTypeNode()?.getText() ?? "any";
      const initializer = `input${isOptional ? "" : ".required"}<${propType}>()`;
      if (!modalClass.getProperty(propName)) {
        modalClass.insertProperty(lastPropIdx, { name: propName, initializer });
        lastPropIdx++;
        changed = true;
      }
    }
    if (!modalClass.getProperty("close")) {
      modalClass.insertProperty(lastPropIdx, { name: "close", initializer: `output<${modalOutputTypeText}>()` });
      changed = true;
    }

    // 2. extends → implements 변환
    let implementsText: string;
    if (modalOutputTypeText === "ISharedDataModalOutputResult") {
      implementsText = "ISdSelectModal";
    } else {
      implementsText = `ISdModal<${modalOutputTypeText}>`;
    }
    if (!modalClass.getImplements().some(i => i.getText() === implementsText)) {
      modalClass.addImplements(implementsText);
      changed = true;
    }

    // 3. super() 삭제(생성자)
    const ctor = modalClass.getConstructors().first();
    if (ctor) {
      ctor.getStatements().forEach((stmt) => {
        if (stmt.getKind() === SyntaxKind.ExpressionStatement) {
          const expr = stmt.asKind(SyntaxKind.ExpressionStatement)?.getExpression();
          if (expr && expr.getKind() === SyntaxKind.CallExpression) {
            const callExpr = expr.asKind(SyntaxKind.CallExpression);
            if (
              callExpr?.getExpression().getText() === "super" &&
              callExpr.getArguments().length === 0
            ) {
              stmt.remove();
              changed = true;
            }
          }
        }
      });
    }

    // 4. this.open() 전체 삭제(클래스 전체)
    modalClass
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter(
        (expr) =>
          expr.getExpression().getKind() === SyntaxKind.PropertyAccessExpression &&
          expr.getExpression().getText() === "this.open",
      )
      .forEach((expr) => {
        const parentStmt = expr.getFirstAncestorByKind(SyntaxKind.ExpressionStatement);
        if (parentStmt) {
          parentStmt.remove();
          changed = true;
        }
      });

    // 5. params().xxx → xxx() 및 this.params().xxx → this.xxx() AST 치환
    modalClass.forEachDescendant((node) => {
      if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
        const propAccess = node.asKind(SyntaxKind.PropertyAccessExpression)!;
        const propName = propAccess.getName();
        if (!paramNames.includes(propName)) return;
        const expr = propAccess.getExpression();

        // params().xxx
        if (expr.getKind() === SyntaxKind.CallExpression) {
          const callExpr = expr.asKind(SyntaxKind.CallExpression)!;
          const innerExpr = callExpr.getExpression();

          // a) 단독 params()
          if (innerExpr.getKind() === SyntaxKind.Identifier && innerExpr.getText() === "params") {
            propAccess.replaceWithText(`${propName}()`);
            changed = true;
          }
          // b) this.params()
          else if (innerExpr.getKind() === SyntaxKind.PropertyAccessExpression) {
            const propExpr = innerExpr.asKind(SyntaxKind.PropertyAccessExpression)!;
            if (
              propExpr.getExpression().getKind() === SyntaxKind.ThisKeyword &&
              propExpr.getName() === "params"
            ) {
              propAccess.replaceWithText(`this.${propName}()`);
              changed = true;
            }
          }
        }
      }
    });

    // 6. this.close(...) → this.close.emit(...)
    modalClass.forEachDescendant((node) => {
      if (node.getKind() === SyntaxKind.CallExpression) {
        const callExpr = node.asKind(SyntaxKind.CallExpression)!;
        const expr = callExpr.getExpression();
        if (
          expr.getKind() === SyntaxKind.PropertyAccessExpression &&
          expr.asKind(SyntaxKind.PropertyAccessExpression)!.getExpression().getKind() ===
            SyntaxKind.ThisKeyword
        ) {
          const methodName = expr.asKind(SyntaxKind.PropertyAccessExpression)!.getName();
          if (methodName === "close") {
            expr.asKind(SyntaxKind.PropertyAccessExpression)!.replaceWithText(`this.close.emit`);
            changed = true;
          }
        }
      }
    });

    // 7. @Component template: params().xxx → xxx() 치환
    const componentDecorator = modalClass.getDecorator("Component");
    if (componentDecorator) {
      const arg = componentDecorator.getArguments().first();
      if (arg && arg.getKind() === SyntaxKind.ObjectLiteralExpression) {
        const objLit = arg.asKind(SyntaxKind.ObjectLiteralExpression)!;
        const tplProp = objLit.getProperty("template");
        if (
          tplProp &&
          tplProp.getKind() === SyntaxKind.PropertyAssignment &&
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

    // 8. import 관리
    const sdAngularImport = sourceFile.getImportDeclaration(
      d => d.getModuleSpecifierValue() === "@simplysm/sd-angular"
    );
    if (modalOutputTypeText === "ISharedDataModalOutputResult") {
      // ISdSelectModal 추가
      if (sdAngularImport) {
        const namedImports = sdAngularImport.getNamedImports();
        // ISdSelectModal 없으면 추가
        if (!namedImports.some(n => n.getName() === "ISdSelectModal")) {
          sdAngularImport.addNamedImport("ISdSelectModal");
        }
        // ISdModal 제거
        namedImports
          .filter(n => n.getName() === "ISdModal")
          .forEach(n => n.remove());
      } else {
        sourceFile.addImportDeclaration({
          namedImports: ["ISdSelectModal"],
          moduleSpecifier: "@simplysm/sd-angular"
        });
      }
    } else {
      // ISdModal 추가
      if (sdAngularImport) {
        const namedImports = sdAngularImport.getNamedImports();
        // ISdModal 없으면 추가
        if (!namedImports.some(n => n.getName() === "ISdModal")) {
          sdAngularImport.addNamedImport("ISdModal");
        }
        // ISdSelectModal 제거
        namedImports
          .filter(n => n.getName() === "ISdSelectModal")
          .forEach(n => n.remove());
      } else {
        sourceFile.addImportDeclaration({
          namedImports: ["ISdModal"],
          moduleSpecifier: "@simplysm/sd-angular"
        });
      }
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
      if (!imports.includes("output")) {
        ngCoreImport.addNamedImport("output");
        changed = true;
      }
    } else {
      sourceFile.addImportDeclaration({
        namedImports: ["input", "output"],
        moduleSpecifier: "@angular/core",
      });
      changed = true;
    }

    // 9. $effect([this.params], ...) → $effect([], ...) (생성자)
    if (ctor) {
      ctor.forEachDescendant((node) => {
        if (node.getKind() === SyntaxKind.CallExpression) {
          const callExpr = node.asKind(SyntaxKind.CallExpression)!;
          const expr = callExpr.getExpression();
          if (expr.getKind() === SyntaxKind.Identifier && expr.getText() === "$effect") {
            const args = callExpr.getArguments();
            if (
              args.length >= 1 &&
              args[0].getKind() === SyntaxKind.ArrayLiteralExpression &&
              args[0].asKind(SyntaxKind.ArrayLiteralExpression)!.getElements().length === 1
            ) {
              const arrElem = args[0].asKind(SyntaxKind.ArrayLiteralExpression)!.getElements()[0];
              if (
                arrElem.getKind() === SyntaxKind.PropertyAccessExpression &&
                arrElem.getText() === "this.params"
              ) {
                args[0].replaceWithText("[]");
                changed = true;
              }
            }
          }
        }
      });
    }

    // 10. interface 선언 삭제
    paramInterface.remove();

    // 11. extends 삭제 (항상 마지막)
    modalClass.removeExtends();

    // 11. import 삭제
    removeNamedImport(sourceFile, "@simplysm/sd-angular", "SdModalBase");
    removeNamedImport(sourceFile, "@simplysm/sd-angular", "ISharedDataModalInputParam");
    // removeNamedImport(sourceFile, "@simplysm/sd-angular", "ISharedDataModalOutputResult");

    // 12. 저장 및 간결 로그 출력
    if (changed) {
      sourceFile.saveSync();
      totalChanged++;
      console.log(`[modal-updated] ${relPath} :: 모달기반 변경 완료`);
    }
  }
  if (totalChanged > 0) {
    console.log(`\n[완료] 모달변환 완료 (총 ${totalChanged}개)`);
  } else {
    console.log(`[완료] 변환 대상 없음`);
  }
}
