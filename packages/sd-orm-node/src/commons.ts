export interface IDbConnectionConfig {
  dialect?: "mssql" | "mysql";
  host?: string;
  port?: number;
  username: string;
  password: string;
}