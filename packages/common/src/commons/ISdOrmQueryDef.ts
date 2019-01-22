export interface ISdOrmQueryDef {
  type: "select" | "insert" | "update" | "upsert" | "delete";
  select?: { [key: string]: any };
  from?: string;
  as?: string;
  where?: string[];
  distinct?: boolean;
  top?: number;
  groupBy?: string[];
  having?: string[];
  join?: string[];
  limit?: number[];
  orderBy?: string[];
  update?: { [key: string]: string };
  insert?: { [key: string]: string };
  output?: string[];
}
