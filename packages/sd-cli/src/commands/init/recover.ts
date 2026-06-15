import path from "path";
import ts from "typescript";
import { str } from "@simplysm/core-common";
import { fsx } from "@simplysm/core-node";
import { findPackagesObject, getObjectProp, getProp, getPropertyName, getStringProp } from "./ts-ast";
import type { ClientInputSpec, DbDialect, InitInput } from "./types";

/** 기존 워크스페이스 파일에서 복원한 init 입력 + 부가 정보 */
export interface RecoveredWorkspace {
  /** 기존 워크스페이스를 표현하는 init 입력 (clients = 기존 클라이언트 목록) */
  input: InitInput;
  /** packages/client-common 패키지 실재 여부 */
  hasClientCommonPkg: boolean;
  /** common/src/app-structure.ts 의 실제 export 식별자 목록 (선언 순서) */
  appStructureExportNames: string[];
}

export async function recoverWorkspace(cwd: string): Promise<RecoveredWorkspace> {
  const rootPkg = await readRootPackageJson(cwd);
  const sdConfig = await parseSdConfig(cwd);

  const clients: ClientInputSpec[] = [];
  for (const c of sdConfig.clients) {
    clients.push({
      name: c.name,
      type: c.isMobile ? "mobile" : "web",
      hasRouter: await fsx.exists(path.resolve(cwd, "packages", c.name, "src/routes.ts")),
      useSsg: c.useSsg,
    });
  }

  const commonSrc = path.resolve(cwd, "packages/common/src");
  const appStructurePath = path.join(commonSrc, "app-structure.ts");
  const hasAuth = await fsx.exists(appStructurePath);

  let dbContextName: string | undefined;
  let userEntityName: string | undefined;
  let userEntityLabel: string | undefined;
  let appStructureExportNames: string[] = [];

  if (sdConfig.hasDb) {
    const dbFolderName = await findDbFolderName(commonSrc);
    dbContextName = str.toCamelCase(dbFolderName.slice("db-".length));

    if (hasAuth) {
      userEntityName = await findUserEntityName(path.join(commonSrc, dbFolderName));
    }
  }

  if (hasAuth) {
    const appStructureSource = await fsx.read(appStructurePath);
    const sf = ts.createSourceFile(
      "app-structure.ts",
      appStructureSource,
      ts.ScriptTarget.Latest,
      true,
    );
    appStructureExportNames = findExportedVariableNames(sf);
    if (userEntityName != null) {
      userEntityLabel = findMenuTitleByCode(sf, userEntityName);
      if (userEntityLabel == null) {
        throw new Error(
          `common/src/app-structure.ts 에서 사용자 엔티티("${userEntityName}") 메뉴 정의를 찾을 수 없습니다.`,
        );
      }
    }
  }

  return {
    input: {
      workspaceName: rootPkg.workspaceName,
      description: rootPkg.description,
      hasServer: sdConfig.hasServer,
      clients,
      hasDb: sdConfig.hasDb,
      dbDialect: sdConfig.dbDialect,
      dbContextName,
      hasAuth,
      userEntityName,
      userEntityLabel,
      mobileAppId: sdConfig.mobileAppId,
      serverPort: sdConfig.serverPort,
    },
    hasClientCommonPkg: await fsx.exists(path.resolve(cwd, "packages/client-common")),
    appStructureExportNames,
  };
}

//-- 루트 package.json

async function readRootPackageJson(
  cwd: string,
): Promise<{ workspaceName: string; description: string }> {
  const pkgPath = path.resolve(cwd, "package.json");
  if (!(await fsx.exists(pkgPath))) {
    throw new Error(`루트 package.json 을 찾을 수 없습니다: ${pkgPath}`);
  }
  const pkg = JSON.parse(await fsx.read(pkgPath)) as { name?: string; description?: string };
  if (pkg.name == null) {
    throw new Error("루트 package.json 에 name 이 없습니다.");
  }
  return { workspaceName: pkg.name, description: pkg.description ?? "" };
}

//-- sd.config.ts

interface SdConfigInfo {
  hasServer: boolean;
  serverPort?: number;
  hasDb: boolean;
  dbDialect?: DbDialect;
  mobileAppId?: string;
  clients: { name: string; isMobile: boolean; useSsg: boolean }[];
}

async function parseSdConfig(cwd: string): Promise<SdConfigInfo> {
  const configPath = path.resolve(cwd, "sd.config.ts");
  if (!(await fsx.exists(configPath))) {
    throw new Error(`sd.config.ts 를 찾을 수 없습니다: ${configPath}`);
  }
  const source = await fsx.read(configPath);
  const sf = ts.createSourceFile("sd.config.ts", source, ts.ScriptTarget.Latest, true);

  const packagesObj = findPackagesObject(sf);
  if (packagesObj == null) {
    throw new Error("sd.config.ts 에서 packages 정의를 찾을 수 없습니다.");
  }

  const info: SdConfigInfo = { hasServer: false, hasDb: false, clients: [] };

  for (const prop of packagesObj.properties) {
    if (!ts.isPropertyAssignment(prop) || !ts.isObjectLiteralExpression(prop.initializer)) {
      continue;
    }
    const pkgName = getPropertyName(prop.name);
    if (pkgName == null) continue;
    const pkgObj = prop.initializer;
    const target = getStringProp(pkgObj, "target");

    if (target === "server") {
      info.hasServer = true;

      const envObj = getObjectProp(pkgObj, "env");
      const portStr = envObj != null ? getStringProp(envObj, "SERVER_PORT") : undefined;
      if (portStr != null) info.serverPort = Number(portStr);

      const configsObj = getObjectProp(pkgObj, "configs");
      const ormObj = configsObj != null ? getObjectProp(configsObj, "orm") : undefined;
      if (ormObj != null) {
        info.hasDb = true;
        const firstConn = ormObj.properties.find(
          (p): p is ts.PropertyAssignment =>
            ts.isPropertyAssignment(p) && ts.isObjectLiteralExpression(p.initializer),
        );
        if (firstConn != null) {
          info.dbDialect = getStringProp(
            firstConn.initializer as ts.ObjectLiteralExpression,
            "dialect",
          ) as DbDialect | undefined;
        }
      }
    } else if (target === "client") {
      const capacitorObj = getObjectProp(pkgObj, "capacitor");
      if (capacitorObj != null && info.mobileAppId == null) {
        info.mobileAppId = getStringProp(capacitorObj, "appId");
      }
      info.clients.push({
        name: pkgName,
        isMobile: capacitorObj != null,
        useSsg: getProp(pkgObj, "prerender") != null,
      });
    }
  }

  return info;
}

//-- common 패키지 구조

async function findDbFolderName(commonSrc: string): Promise<string> {
  if (!(await fsx.exists(commonSrc))) {
    throw new Error(`packages/common/src 를 찾을 수 없습니다: ${commonSrc}`);
  }
  const children = await fsx.readdir(commonSrc);
  const dbFolderName = children.find((c) => c.startsWith("db-"));
  if (dbFolderName == null) {
    throw new Error("packages/common/src 에서 DB context 폴더(db-*)를 찾을 수 없습니다.");
  }
  return dbFolderName;
}

async function findUserEntityName(dbFolder: string): Promise<string> {
  const masterDir = path.join(dbFolder, "tables/master");
  if (!(await fsx.exists(masterDir))) {
    throw new Error(`사용자 엔티티 테이블 폴더를 찾을 수 없습니다: ${masterDir}`);
  }
  const fileNames = await fsx.readdir(masterDir);
  for (const fileName of fileNames) {
    if (!fileName.endsWith(".ts") || fileName.endsWith("-config.ts")) continue;
    const base = fileName.slice(0, -".ts".length);
    if (fileNames.includes(`${base}-config.ts`)) return base;
  }
  throw new Error(
    `사용자 엔티티 테이블 쌍(<엔티티>.ts + <엔티티>-config.ts)을 찾을 수 없습니다: ${masterDir}`,
  );
}

//-- app-structure.ts

function findExportedVariableNames(sf: ts.SourceFile): string[] {
  const exportNames: string[] = [];
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    const isExported = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (isExported !== true) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (ts.isIdentifier(decl.name)) exportNames.push(decl.name.text);
    }
  }
  return exportNames;
}

function findMenuTitleByCode(sf: ts.SourceFile, code: string): string | undefined {
  let title: string | undefined;
  const visit = (node: ts.Node): void => {
    if (title != null) return;
    if (ts.isObjectLiteralExpression(node) && getStringProp(node, "code") === code) {
      title = getStringProp(node, "title");
      if (title != null) return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return title;
}

