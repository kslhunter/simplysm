export type ClientType = "web" | "mobile";
export type DbDialect = "mysql" | "postgres" | "mssql";

export interface ClientInputSpec {
  name: string;
  type: ClientType;
  hasRouter: boolean;
}

export interface InitInput {
  workspaceName: string;
  description: string;
  hasServer: boolean;
  clients: ClientInputSpec[];
  hasDb: boolean;
  dbDialect?: DbDialect;
  dbContextName?: string;
  mobileAppId?: string;
  serverPort?: number;
}

export interface ClientSpec {
  name: string;
  type: ClientType;
  hasRouter: boolean;
  isMobile: boolean;
}

export interface NormalizedInput {
  workspaceName: string;
  workspaceNameUpper: string;
  description: string;
  hasServer: boolean;
  hasDb: boolean;
  dbDialect?: DbDialect;
  dbPort: number;
  isMysql: boolean;
  isPostgres: boolean;
  isMssql: boolean;
  dbContextClassName: string;
  dbContextNameUpper: string;
  serverPort: number;
  mobileAppId?: string;
  firstMobileClientName?: string;
  clients: ClientSpec[];
  hasCommon: boolean;
  hasClientCommon: boolean;
  hasMobile: boolean;
  hasAnyClient: boolean;
}

export interface RenderData extends NormalizedInput {
  jwtSecret: string;
}
