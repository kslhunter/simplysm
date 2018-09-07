import {DbContext} from "./DbContext";

export interface IDbMigration {
  up(db: DbContext): Promise<void>;
}