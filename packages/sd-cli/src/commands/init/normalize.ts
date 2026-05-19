import type { ClientSpec, InitInput, NormalizedInput } from "./types";

const DB_PORTS: Record<NonNullable<InitInput["dbDialect"]>, number> = {
  mysql: 3306,
  postgres: 5432,
  mssql: 1433,
};

export function normalize(input: InitInput): NormalizedInput {
  const clients: ClientSpec[] = input.clients.map((c) => {
    const name = c.name.startsWith("client-") ? c.name : `client-${c.name}`;
    const isMobile = c.type === "mobile";
    return {
      name,
      type: c.type,
      hasRouter: isMobile ? false : c.hasRouter,
      isMobile,
    };
  });

  const hasDb = input.hasServer && input.hasDb;
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
    isMysql: hasDb && input.dbDialect === "mysql",
    isPostgres: hasDb && input.dbDialect === "postgres",
    isMssql: hasDb && input.dbDialect === "mssql",
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
