import ts from "typescript";
import { findPackagesObject, getPropertyName, getProp } from "./ts-ast";
import type { ClientSpec, RenderData } from "./types";

/** 공유 파일 1개에 대한 패치 결과 */
export interface FilePatch {
  /** 패치 성공 시 새 파일 내용. 앵커 탐색 실패 시 undefined */
  patched?: string;
  /** 수동 반영 안내용 스니펫 */
  snippet: string;
}

interface TextEdit {
  start: number;
  end: number;
  text: string;
}

function applyEdits(source: string, edits: TextEdit[]): string {
  let result = source;
  for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  }
  return result;
}

function lineStartOf(source: string, pos: number): number {
  return source.lastIndexOf("\n", pos - 1) + 1;
}

function parseTs(fileName: string, source: string): ts.SourceFile {
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
}

//-- sd.config.ts

function buildSdConfigClientBlock(data: RenderData, client: ClientSpec): string {
  const lines: string[] = [];
  lines.push(`    "${client.name}": {`);
  lines.push(`      target: "client",`);
  if (data.hasServer) {
    lines.push(`      server: "server",`);
  }
  if (client.useSsg) {
    lines.push(`      prerender: ["/"],`);
  }
  if (client.isMobile) {
    lines.push(`      pwa: false,`);
    lines.push(`      capacitor: {`);
    lines.push(`        appId: "${data.mobileAppId}",`);
    lines.push(`        appName: "${data.description}",`);
    lines.push(`        icon: "res/icon.png",`);
    lines.push(`        platform: {`);
    lines.push(`          android: {},`);
    lines.push(`        },`);
    lines.push(`      },`);
  }
  lines.push(`    },`);
  return lines.join("\n") + "\n";
}

export function patchSdConfig(source: string, data: RenderData, client: ClientSpec): FilePatch {
  const block = buildSdConfigClientBlock(data, client);
  const snippet = block;

  const sf = parseTs("sd.config.ts", source);
  const packagesObj = findPackagesObject(sf);
  if (packagesObj == null) return { snippet };

  const closeBracePos = packagesObj.getEnd() - 1;
  const lastProp = packagesObj.properties.at(-1);
  if (lastProp != null && !source.slice(lastProp.end, closeBracePos).includes(",")) {
    return { snippet };
  }

  const insertPos = lineStartOf(source, closeBracePos);
  return {
    patched: applyEdits(source, [{ start: insertPos, end: insertPos, text: block }]),
    snippet,
  };
}

//-- vitest.config.ts

function buildVitestProjectBlock(client: ClientSpec): string {
  return (
    [
      `      {`,
      `        extends: true,`,
      `        plugins: [sdAngularPlugin({ pkg: "${client.name}" })],`,
      `        test: {`,
      `          name: "${client.name}",`,
      `          setupFiles: ["packages/${client.name}/tests/vitest.setup.ts"],`,
      `          include: ["packages/${client.name}/tests/**/*.spec.{ts,js,mjs,cjs}"],`,
      `          browser: {`,
      `            provider: playwright(),`,
      `            enabled: true,`,
      `            headless: true,`,
      `            screenshotFailures: false,`,
      `            instances: [{ browser: "chromium", viewport: { width: 1920, height: 1080 } }],`,
      `          },`,
      `        },`,
      `      },`,
    ].join("\n") + "\n"
  );
}

export function patchVitestConfig(source: string, client: ClientSpec): FilePatch {
  const block = buildVitestProjectBlock(client);
  const snippet = block;

  const sf = parseTs("vitest.config.ts", source);

  let projectsArray: ts.ArrayLiteralExpression | undefined;
  const visit = (node: ts.Node): void => {
    if (projectsArray != null) return;
    if (
      ts.isPropertyAssignment(node) &&
      getPropertyName(node.name) === "projects" &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      projectsArray = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (projectsArray == null) return { snippet };

  const closeBracketPos = projectsArray.getEnd() - 1;
  const lastElement = projectsArray.elements.at(-1);
  if (lastElement != null && !source.slice(lastElement.end, closeBracketPos).includes(",")) {
    return { snippet };
  }

  const insertPos = lineStartOf(source, closeBracketPos);
  return {
    patched: applyEdits(source, [{ start: insertPos, end: insertPos, text: block }]),
    snippet,
  };
}

//-- 루트 package.json

export function patchRootPackageJson(source: string, client: ClientSpec): FilePatch {
  const block = `    "run-device": "sd-cli device -t ${client.name}",\n    "-----": "",\n`;
  const snippet = block;

  const sf = ts.parseJsonText("package.json", source);
  const rootStmt = sf.statements.at(0);
  if (rootStmt == null || !ts.isObjectLiteralExpression(rootStmt.expression)) {
    return { snippet };
  }
  const scriptsExpr = getProp(rootStmt.expression, "scripts");
  if (scriptsExpr == null || !ts.isObjectLiteralExpression(scriptsExpr)) {
    return { snippet };
  }

  const separatorProp = scriptsExpr.properties.find(
    (p) => ts.isPropertyAssignment(p) && getPropertyName(p.name) === "----",
  );
  if (separatorProp != null) {
    const lineEnd = source.indexOf("\n", separatorProp.end);
    if (lineEnd < 0) return { snippet };
    const insertPos = lineEnd + 1;
    return {
      patched: applyEdits(source, [{ start: insertPos, end: insertPos, text: block }]),
      snippet,
    };
  }

  const replaceDepsProp = scriptsExpr.properties.find(
    (p) => ts.isPropertyAssignment(p) && getPropertyName(p.name) === "replace-deps",
  );
  if (replaceDepsProp != null) {
    const insertPos = lineStartOf(source, replaceDepsProp.getStart(sf));
    return {
      patched: applyEdits(source, [{ start: insertPos, end: insertPos, text: block }]),
      snippet,
    };
  }

  return { snippet };
}

//-- common/src/app-structure.ts

function buildAppStructureBlock(data: RenderData, client: ClientSpec): string {
  return `export const ${client.appStructureName}: AppStructureItem[] = [
  { title: "메인화면", code: "main", isNotMenu: true },
  { title: "내 정보 수정", code: "my-info", isNotMenu: true },

  {
    code: "master",
    title: "기준정보",
    icon: tablerDatabase,
    children: [
      { code: "role-permission", title: "역할/권한", perms: ["use", "edit"] },
      { code: "${data.userEntityKebab}", title: "${data.userEntityLabel}", perms: ["use", "edit"] },
    ],
  },
  {
    code: "system",
    title: "시스템",
    icon: tablerSettings,
    children: [
      { code: "data-log", title: "데이터 변경내역", perms: ["use"] },
      { code: "system-log", title: "시스템 로그", perms: ["use"] },
    ],
  },
];
`;
}

export function patchAppStructure(source: string, data: RenderData, client: ClientSpec): FilePatch {
  const block = buildAppStructureBlock(data, client);
  const base = source.endsWith("\n") ? source : `${source}\n`;
  return { patched: `${base}\n${block}`, snippet: block };
}

//-- server/src/services/dev.service.ts

export function patchDevService(
  source: string,
  existingExportNames: string[],
  data: RenderData,
  client: ClientSpec,
  /** 권한 계산, import 에서 신규 export 로 대체할 기본 export 이름 (기존 라우팅 클라이언트 0개 케이스) */
  replaceExportName?: string,
): FilePatch {
  const combinedNames = [...existingExportNames, client.appStructureName];
  const combinedExpr =
    combinedNames.length > 1
      ? `[${combinedNames.map((n) => `...${n}`).join(", ")}]`
      : combinedNames[0];
  const snippet = [
    `- import 에 ${client.appStructureName} 추가 (from "@${data.workspaceName}/common")`,
    `- getFlatPermissions 첫 번째 인자를 ${combinedExpr} 로 변경`,
  ].join("\n");

  const sf = parseTs("dev.service.ts", source);

  //-- ① import 명세자 추가 (대체 대상이 있으면 그 명세자를 신규 이름으로 교체)
  const moduleName = `@${data.workspaceName}/common`;
  let importSpecifiers: ts.NodeArray<ts.ImportSpecifier> | undefined;
  for (const stmt of sf.statements) {
    if (
      ts.isImportDeclaration(stmt) &&
      ts.isStringLiteral(stmt.moduleSpecifier) &&
      stmt.moduleSpecifier.text === moduleName &&
      stmt.importClause?.namedBindings != null &&
      ts.isNamedImports(stmt.importClause.namedBindings) &&
      stmt.importClause.namedBindings.elements.length > 0
    ) {
      importSpecifiers = stmt.importClause.namedBindings.elements;
      break;
    }
  }
  if (importSpecifiers == null) return { snippet };

  const replaceTarget =
    replaceExportName != null
      ? importSpecifiers.find((s) => s.name.text === replaceExportName)
      : undefined;
  const importEdit: TextEdit =
    replaceTarget != null
      ? {
          start: replaceTarget.getStart(sf),
          end: replaceTarget.end,
          text: client.appStructureName,
        }
      : (() => {
          const lastSpecifier = importSpecifiers[importSpecifiers.length - 1];
          return {
            start: lastSpecifier.end,
            end: lastSpecifier.end,
            text: `, ${client.appStructureName}`,
          };
        })();

  //-- ② getFlatPermissions 첫 번째 인자 교체
  let permsArg: ts.Expression | undefined;
  const visit = (node: ts.Node): void => {
    if (permsArg != null) return;
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "getFlatPermissions" &&
      node.arguments.length > 0
    ) {
      permsArg = node.arguments[0];
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (permsArg == null) return { snippet };

  return {
    patched: applyEdits(source, [
      importEdit,
      { start: permsArg.getStart(sf), end: permsArg.end, text: combinedExpr },
    ]),
    snippet,
  };
}
