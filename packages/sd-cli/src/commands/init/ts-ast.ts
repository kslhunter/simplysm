import ts from "typescript";

/** sd.config.ts 의 `packages` 객체 리터럴 탐색 */
export function findPackagesObject(sf: ts.SourceFile): ts.ObjectLiteralExpression | undefined {
  let found: ts.ObjectLiteralExpression | undefined;
  const visit = (node: ts.Node): void => {
    if (found != null) return;
    if (
      ts.isPropertyAssignment(node) &&
      getPropertyName(node.name) === "packages" &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      found = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

export function getPropertyName(propName: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(propName) || ts.isStringLiteral(propName)) return propName.text;
  return undefined;
}

export function getProp(
  obj: ts.ObjectLiteralExpression,
  key: string,
): ts.Expression | undefined {
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) && getPropertyName(p.name) === key) return p.initializer;
  }
  return undefined;
}

export function getObjectProp(
  obj: ts.ObjectLiteralExpression,
  key: string,
): ts.ObjectLiteralExpression | undefined {
  const expr = getProp(obj, key);
  return expr != null && ts.isObjectLiteralExpression(expr) ? expr : undefined;
}

export function getStringProp(obj: ts.ObjectLiteralExpression, key: string): string | undefined {
  const expr = getProp(obj, key);
  return expr != null && ts.isStringLiteral(expr) ? expr.text : undefined;
}
