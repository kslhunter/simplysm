import { str } from "@simplysm/core-common";
import type { ClientSpec, InitInput, NormalizedInput } from "./types";

const DB_PORTS: Record<NonNullable<InitInput["dbDialect"]>, number> = {
  mysql: 3306,
  postgresql: 5432,
  mssql: 1433,
};

const DB_CREDENTIALS: Record<
  NonNullable<InitInput["dbDialect"]>,
  { username: string; password: string }
> = {
  mysql: { username: "root", password: "1234" },
  postgresql: { username: "postgres", password: "postgres" },
  mssql: { username: "sa", password: "1234" },
};

function toDbContextBase(name: string): string {
  return name.replace(/DbContext$/i, "");
}

function toDbContextClassName(name: string): string {
  const trimmed = toDbContextBase(name);
  const pascal = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return `${pascal}DbContext`;
}

function toDbContextNameUpper(name: string): string {
  return toDbContextBase(name).toUpperCase();
}

function toDbContextKebab(name: string): string {
  return toDbContextBase(name)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

function toDbContextFileName(name: string): string {
  return `${toDbContextKebab(name)}.db-context`;
}

export function normalize(input: InitInput): NormalizedInput {
  const hasDb = input.hasServer && input.hasDb;
  const hasAuth = hasDb && (input.hasAuth ?? false);

  const clients: ClientSpec[] = input.clients.map((c) => {
    const name = c.name.startsWith("client-") ? c.name : `client-${c.name}`;
    const isMobile = c.type === "mobile";
    const hasRouter = isMobile ? false : c.hasRouter;
    const baseName = name.startsWith("client-") ? name.slice("client-".length) : name;
    return {
      name,
      type: c.type,
      hasRouter,
      isMobile,
      appStructureName: `${str.toCamelCase(baseName)}AppStructureItems`,
      needsNgIcons: (hasRouter && hasAuth) || hasDb,
    };
  });

  const routerClients = clients.filter((c) => c.hasRouter);
  const appStructureNames =
    routerClients.length > 0
      ? routerClients.map((c) => c.appStructureName)
      : ["appStructureItems"];

  const userEntityKebab = hasAuth ? (input.userEntityName ?? "user") : "";
  const userEntityLabel = hasAuth ? (input.userEntityLabel ?? "사용자") : "";
  const hasCommon = input.hasServer;
  const hasClientCommon = input.hasServer || clients.length >= 2;
  const hasMobile = clients.some((c) => c.isMobile);

  return {
    workspaceName: input.workspaceName,
    workspaceNameUpper: input.workspaceName.toUpperCase().replace(/-/g, "_"),
    description: input.description,
    hasServer: input.hasServer,
    hasDb,
    dbDialect: hasDb ? input.dbDialect : undefined,
    dbPort: hasDb && input.dbDialect != null ? DB_PORTS[input.dbDialect] : 0,
    dbUsername: hasDb && input.dbDialect != null ? DB_CREDENTIALS[input.dbDialect].username : "",
    dbPassword: hasDb && input.dbDialect != null ? DB_CREDENTIALS[input.dbDialect].password : "",
    isMysql: hasDb && input.dbDialect === "mysql",
    isPostgres: hasDb && input.dbDialect === "postgresql",
    isMssql: hasDb && input.dbDialect === "mssql",
    dbContextClassName: hasDb ? toDbContextClassName(input.dbContextName ?? "main") : "",
    dbContextNameUpper: hasDb ? toDbContextNameUpper(input.dbContextName ?? "main") : "",
    dbContextFileName: hasDb ? toDbContextFileName(input.dbContextName ?? "main") : "",
    dbFolderName: hasDb ? `db-${toDbContextKebab(input.dbContextName ?? "main")}` : "",
    hasAuth,
    userEntityPascal: hasAuth ? str.toPascalCase(userEntityKebab) : "",
    userEntityCamel: hasAuth ? str.toCamelCase(userEntityKebab) : "",
    userEntityKebab,
    userEntityLabel,
    appStructureNames,
    serverPort: input.serverPort ?? 40080,
    mobileAppId: hasMobile ? input.mobileAppId : undefined,
    firstMobileClientName: clients.find((c) => c.isMobile)?.name,
    clients,
    hasCommon,
    hasClientCommon,
    hasMobile,
    hasAnyClient: clients.length > 0,
  };
}
