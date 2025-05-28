/* eslint-disable no-console */
import {
  ArrowFunction,
  CallExpression,
  PropertyDeclaration,
  SourceFile,
  SyntaxKind,
} from "ts-morph";
import getTsMorphSourceFiles from "./core/get-ts-morph-source-files";

export function convertToUsePermsSignal() {
  const sourceFiles = getTsMorphSourceFiles();
  let totalChanged = 0;

  for (const sourceFile of sourceFiles) {
    let changed = false;

    for (const cls of sourceFile.getClasses()) {
      try {
        const result = processClass(cls);
        if (result.success) {
          changed = true;
        }
      } catch (error) {
        console.error(`[오류] ${sourceFile.getBaseName()} 클래스 처리 중 오류:`, error);
      }
    }

    if (changed) {
      addImportIfNeeded(sourceFile);
      sourceFile.saveSync();
      totalChanged++;
      console.log(`[updated] ${sourceFile.getBaseName()} :: usePermsSignal 변환 완료`);
    }
  }

  console.log(
    totalChanged > 0 ? `\n[완료] 변환 완료 (총 ${totalChanged}개)` : `[완료] 변환 대상 없음`,
  );
}

function processClass(cls: any) {
  const viewCodesProp = getPropertyDeclaration(cls, "viewCodes");
  const permsProp = getPropertyDeclaration(cls, "perms");

  if (!viewCodesProp || !permsProp) {
    return { success: false, reason: "필수 프로퍼티 없음" };
  }

  const viewCodesInit = viewCodesProp.getInitializer();
  const permsInit = permsProp.getInitializer();

  if (!isValidViewCodesInit(viewCodesInit) || !isValidPermsInit(permsInit)) {
    return { success: false, reason: "초기화 값이 유효하지 않음" };
  }

  const permsCallExpr = permsInit as CallExpression;
  const arrowFunction = getArrowFunction(permsCallExpr);

  if (!arrowFunction) {
    return { success: false, reason: "Arrow function을 찾을 수 없음" };
  }

  const callExpression = getPermsCallExpression(arrowFunction);

  if (!callExpression) {
    return { success: false, reason: "getViewPerms 호출을 찾을 수 없음" };
  }

  const args = callExpression.getArguments();
  if (args.length !== 2) {
    return { success: false, reason: "인자 개수가 맞지 않음" };
  }

  // 변환 실행
  const viewCodesText = viewCodesInit!.getText();
  const permsText = args[1].getText();

  permsProp.setInitializer(`usePermsSignal(${viewCodesText}, ${permsText})`);
  viewCodesProp.remove();

  return { success: true };
}

function getPropertyDeclaration(cls: any, name: string): PropertyDeclaration | undefined {
  const prop = cls.getInstanceProperty(name);
  return prop?.getKind() === SyntaxKind.PropertyDeclaration ? prop : undefined;
}

function isValidViewCodesInit(init: any): boolean {
  return init?.getKind() === SyntaxKind.ArrayLiteralExpression;
}

function isValidPermsInit(init: any): boolean {
  return init?.getKind() === SyntaxKind.CallExpression;
}

function getArrowFunction(callExpr: CallExpression): ArrowFunction | undefined {
  const firstArg = callExpr.getArguments().first();
  return firstArg?.getKind() === SyntaxKind.ArrowFunction ? (firstArg as ArrowFunction) : undefined;
}

function getPermsCallExpression(arrowFn: ArrowFunction): CallExpression | undefined {
  const body = arrowFn.getBody();

  if (body.getKind() !== SyntaxKind.CallExpression) {
    return undefined;
  }

  const callExpr = body as CallExpression;
  return callExpr.getText().includes("this._sdAppStructure.getViewPerms") ? callExpr : undefined;
}

function addImportIfNeeded(sourceFile: SourceFile) {
  const sdAngularImport = sourceFile.getImportDeclaration(
    (d: any) => d.getModuleSpecifierValue() === "@simplysm/sd-angular",
  );

  if (sdAngularImport) {
    const hasImport = sdAngularImport
      .getNamedImports()
      .some((n: any) => n.getName() === "usePermsSignal");

    if (!hasImport) {
      sdAngularImport.addNamedImport("usePermsSignal");
    }
  } else {
    sourceFile.addImportDeclaration({
      namedImports: ["usePermsSignal"],
      moduleSpecifier: "@simplysm/sd-angular",
    });
  }
}
