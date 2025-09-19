import ts from "typescript";
import path from "path";
import { PathUtils } from "@simplysm/sd-core-node";

const createArrayExpression = ts.factory.createArrayLiteralExpression;
const createStringLiteral = ts.factory.createStringLiteral;

export default function transformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => (file: ts.SourceFile) => visitNodeAndChildren(
    file,
    program,
    context,
  );
}

function visitNodeAndChildren(
  node: ts.SourceFile,
  program: ts.Program,
  context: ts.TransformationContext,
): ts.SourceFile;
function visitNodeAndChildren(
  node: ts.Node,
  program: ts.Program,
  context: ts.TransformationContext,
): ts.Node | undefined;
function visitNodeAndChildren(
  node: ts.Node,
  program: ts.Program,
  context: ts.TransformationContext,
): ts.Node | undefined {
  return ts.visitEachChild(
    visitNode(node, program),
    (childNode) => visitNodeAndChildren(childNode, program, context),
    context,
  );
}

function visitNode(node: ts.SourceFile, program: ts.Program): ts.SourceFile;
function visitNode(node: ts.Node, program: ts.Program): ts.Node | undefined;
function visitNode(node: ts.Node, program: ts.Program): ts.Node | undefined {
  const typeChecker = program.getTypeChecker();
  if (isKeysImportExpression(node)) {
    return;
  }
  if (!isKeysCallExpression(node, typeChecker)) {
    return node;
  }
  if (!node.typeArguments) {
    return createArrayExpression([]);
  }
  const type = typeChecker.getTypeFromTypeNode(node.typeArguments[0]);
  const properties = typeChecker.getPropertiesOfType(type);
  return createArrayExpression(properties.map((property) => createStringLiteral(property.name)));
}

function isKeysImportExpression(node: ts.Node): node is ts.ImportDeclaration {
  if (!ts.isImportDeclaration(node)) {
    return false;
  }
  const module = (node.moduleSpecifier as ts.StringLiteral).text;
  try {
    const modulePath = module.startsWith(".")
      ? import.meta.resolve(path.resolve(path.dirname(node.getSourceFile().fileName), module))
      : import.meta.resolve(module);
    return PathUtils.isChildPath(modulePath, import.meta.dirname);
  }
  catch {
    return false;
  }
}

function isKeysCallExpression(
  node: ts.Node,
  typeChecker: ts.TypeChecker,
): node is ts.CallExpression {
  if (!ts.isCallExpression(node)) {
    return false;
  }
  const declaration = typeChecker.getResolvedSignature(node)?.declaration;
  if (!declaration || ts.isJSDocSignature(declaration) || declaration.name?.getText() !== "keys") {
    return false;
  }
  try {
    return PathUtils.isChildPath(
      import.meta.resolve(declaration.getSourceFile().fileName),
      import.meta.dirname,
    );
  }
  catch {
    return false;
  }
}
