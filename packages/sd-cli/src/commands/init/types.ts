export type ClientType = "web" | "mobile";
export type DbDialect = "mysql" | "postgresql" | "mssql";

export interface ClientInputSpec {
  name: string;
  type: ClientType;
  hasRouter: boolean;
  /** SSG(빌드 타임 프리렌더) 사용 여부 (web + 라우팅 클라이언트만) */
  useSsg?: boolean;
}

export interface InitInput {
  workspaceName: string;
  description: string;
  hasServer: boolean;
  clients: ClientInputSpec[];
  hasDb: boolean;
  dbDialect?: DbDialect;
  dbContextName?: string;
  hasAuth?: boolean;
  userEntityName?: string;
  userEntityLabel?: string;
  mobileAppId?: string;
  serverPort?: number;
}

export interface ClientSpec {
  name: string;
  type: ClientType;
  hasRouter: boolean;
  isMobile: boolean;
  appStructureName: string;
  needsNgIcons: boolean;
  needsExcel: boolean;
  useSsg: boolean;
  /** robots.txt 지시문 — SSG(SEO) 클라이언트는 전체 허용, 그 외는 전체 차단 */
  robotsDirective: string;
}

export interface NormalizedInput {
  workspaceName: string;
  workspaceNameUpper: string;
  description: string;
  hasServer: boolean;
  hasDb: boolean;
  dbDialect?: DbDialect;
  dbPort: number;
  dbUsername: string;
  dbPassword: string;
  isMysql: boolean;
  isPostgres: boolean;
  isMssql: boolean;
  dbContextClassName: string;
  dbContextNameUpper: string;
  dbContextFileName: string;
  dbFolderName: string;
  hasAuth: boolean;
  userEntityPascal: string;
  userEntityCamel: string;
  userEntityKebab: string;
  userEntityLabel: string;
  appStructureNames: string[];
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
