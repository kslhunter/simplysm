import { Project, SyntaxKind, type ObjectLiteralExpression } from "ts-morph";

/**
 * sd.config.ts에서 packages 객체 리터럴을 찾는다.
 *
 * 구조: const config: SdConfigFn = () => ({ packages: { ... } });
 * -> ArrowFunction -> ParenthesizedExpression -> ObjectLiteral -> "packages" property -> ObjectLiteral
 */
function findPackagesObject(configPath: string): {
  project: Project;
  packagesObj: ObjectLiteralExpression;
} {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(configPath);

  // "config" 변수 선언 찾기
  const configVar = sourceFile.getVariableDeclarationOrThrow("config");
  const arrowFn = configVar.getInitializerIfKindOrThrow(SyntaxKind.ArrowFunction);

  // 화살표 함수 본문에서 반환 객체 찾기
  const body = arrowFn.getBody();
  let returnObj: ObjectLiteralExpression;

  if (body.isKind(SyntaxKind.ParenthesizedExpression)) {
    returnObj = body.getExpressionIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  } else if (body.isKind(SyntaxKind.Block)) {
    const returnStmt = body.getFirstDescendantByKindOrThrow(SyntaxKind.ReturnStatement);
    returnObj = returnStmt.getExpressionIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  } else {
    throw new Error("sd.config.ts의 구조를 인식할 수 없습니다.");
  }

  // "packages" 프로퍼티 찾기
  const packagesProp = returnObj
    .getPropertyOrThrow("packages")
    .asKindOrThrow(SyntaxKind.PropertyAssignment);
  const packagesObj = packagesProp.getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);

  return { project, packagesObj };
}

/**
 * sd.config.ts의 packages 객체에 새 패키지 항목을 추가한다.
 *
 * @returns true: 성공, false: 이미 존재
 */
export function addPackageToSdConfig(
  configPath: string,
  packageName: string,
  config: Record<string, unknown>,
): boolean {
  const { project, packagesObj } = findPackagesObject(configPath);

  // 이미 존재하는지 확인 (따옴표 있는 형태와 없는 형태 모두 체크)
  const existing =
    packagesObj.getProperty(`"${packageName}"`) ?? packagesObj.getProperty(packageName);
  if (existing) {
    return false;
  }

  // 새 프로퍼티 추가 -- config 객체를 ts-morph initializer 문자열로 변환
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
 * sd.config.ts에서 특정 클라이언트의 server 필드를 설정한다.
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
    throw new Error(`클라이언트 "${clientName}"을(를) sd.config.ts에서 찾을 수 없습니다.`);
  }

  const clientProp = clientPropNode.asKindOrThrow(SyntaxKind.PropertyAssignment);
  const clientObj = clientProp.getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);

  // 기존 server 프로퍼티가 있으면 제거
  const serverProp = clientObj.getProperty("server");
  if (serverProp) {
    serverProp.remove();
  }

  // server 프로퍼티 추가
  clientObj.addPropertyAssignment({
    name: "server",
    initializer: `"${serverName}"`,
  });

  project.saveSync();
}

/**
 * eslint.config.ts에 tailwindcss 설정 블록을 추가한다.
 *
 * @returns true: 추가됨, false: 이미 존재
 */
export function addTailwindToEslintConfig(configPath: string, clientName: string): boolean {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(configPath);

  // default export 배열 찾기
  const defaultExport = sourceFile.getFirstDescendantByKindOrThrow(
    SyntaxKind.ArrayLiteralExpression,
  );

  // tailwindcss 설정이 이미 있는지 확인
  const text = defaultExport.getText();
  if (text.includes("tailwindcss")) {
    return false;
  }

  // 새 설정 객체 추가
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
