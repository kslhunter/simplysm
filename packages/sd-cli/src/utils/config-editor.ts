import { Project, SyntaxKind, type ObjectLiteralExpression } from "ts-morph";

/**
 * Find packages object literal in sd.config.ts
 *
 * Structure: const config: SdConfigFn = () => ({ packages: { ... } });
 * -> ArrowFunction -> ParenthesizedExpression -> ObjectLiteral -> "packages" property -> ObjectLiteral
 */
function findPackagesObject(configPath: string): {
  project: Project;
  packagesObj: ObjectLiteralExpression;
} {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(configPath);

  // Find "config" variable declaration
  const configVar = sourceFile.getVariableDeclarationOrThrow("config");
  const arrowFn = configVar.getInitializerIfKindOrThrow(SyntaxKind.ArrowFunction);

  // Find return object in arrow function body
  const body = arrowFn.getBody();
  let returnObj: ObjectLiteralExpression;

  if (body.isKind(SyntaxKind.ParenthesizedExpression)) {
    returnObj = body.getExpressionIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  } else if (body.isKind(SyntaxKind.Block)) {
    const returnStmt = body.getFirstDescendantByKindOrThrow(SyntaxKind.ReturnStatement);
    returnObj = returnStmt.getExpressionIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  } else {
    throw new Error("Unable to recognize structure of sd.config.ts");
  }

  // Find "packages" property
  const packagesProp = returnObj
    .getPropertyOrThrow("packages")
    .asKindOrThrow(SyntaxKind.PropertyAssignment);
  const packagesObj = packagesProp.getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);

  return { project, packagesObj };
}

/**
 * Add new package entry to packages object in sd.config.ts
 *
 * @returns true: success, false: already exists
 */
export function addPackageToSdConfig(
  configPath: string,
  packageName: string,
  config: Record<string, unknown>,
): boolean {
  const { project, packagesObj } = findPackagesObject(configPath);

  // Check if already exists (check both quoted and unquoted forms)
  const existing =
    packagesObj.getProperty(`"${packageName}"`) ?? packagesObj.getProperty(packageName);
  if (existing) {
    return false;
  }

  // Add new property -- convert config object to ts-morph initializer string
  const configStr = JSON.stringify(config)
    .replace(/"([^"]+)":/g, "$1: ")
    .replace(/"/g, '"');

  packagesObj.addPropertyAssignment({
    name: `"${packageName}"`,
    initializer: configStr,
  });

  project.saveSync();
  return true;
}

/**
 * Set server field for specific client in sd.config.ts
 */
export function setClientServerInSdConfig(
  configPath: string,
  clientName: string,
  serverName: string,
): void {
  const { project, packagesObj } = findPackagesObject(configPath);

  const clientPropNode =
    packagesObj.getProperty(`"${clientName}"`) ?? packagesObj.getProperty(clientName);
  if (clientPropNode == null) {
    throw new Error(`Client "${clientName}" not found in sd.config.ts`);
  }

  const clientProp = clientPropNode.asKindOrThrow(SyntaxKind.PropertyAssignment);
  const clientObj = clientProp.getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);

  // Remove existing server property if present
  const serverProp = clientObj.getProperty("server");
  if (serverProp) {
    serverProp.remove();
  }

  // Add server property
  clientObj.addPropertyAssignment({
    name: "server",
    initializer: `"${serverName}"`,
  });

  project.saveSync();
}

/**
 * Add tailwindcss config block to eslint.config.ts
 *
 * @returns true: added, false: already exists
 */
export function addTailwindToEslintConfig(configPath: string, clientName: string): boolean {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(configPath);

  // Find default export array
  const defaultExport = sourceFile.getFirstDescendantByKindOrThrow(
    SyntaxKind.ArrayLiteralExpression,
  );

  // Check if tailwindcss config already exists
  const text = defaultExport.getText();
  if (text.includes("tailwindcss")) {
    return false;
  }

  // Add new config object
  defaultExport.addElement(`{
    files: ["**/*.{ts,tsx}"],
    settings: {
      tailwindcss: {
        config: "packages/${clientName}/tailwind.config.ts",
      },
    },
  }`);

  project.saveSync();
  return true;
}
