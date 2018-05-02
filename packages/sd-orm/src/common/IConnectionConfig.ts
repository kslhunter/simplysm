export interface IConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  schema?: string;
}