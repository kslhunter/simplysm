import {ISdOrmQueryDef} from "@simplysm/common";

export class SdOrmQueryHelper {
  public static getQuery(def: ISdOrmQueryDef): string {
    if (!def.from) {
      throw new Error("'FROM'이 반드시 설정되어야 합니다.");
    }

    if (def.type === "select") {
      return SdOrmQueryHelper._getSelectQuery(def);
    }
    else if (def.type === "update") {
      return SdOrmQueryHelper._getUpdateQuery(def);
    }
    else if (def.type === "delete") {
      return SdOrmQueryHelper._getDeleteQuery(def);
    }
    else if (def.type === "insert") {
      return SdOrmQueryHelper._getInsertQuery(def);
    }
    else if (def.type === "upsert") {
      return SdOrmQueryHelper._getUpsertQuery(def);
    }
    else {
      throw new Error("'TYPE'이 잘못되었습니다. (" + def.type + ")");
    }
  }

  private static _getSelectQuery(def: ISdOrmQueryDef): string {
    SdOrmQueryHelper._checkKeys(def, ["type", "distinct", "top", "select", "from", "as", "join", "where", "groupBy", "having", "orderBy", "limit"]);

    let query: string = "SELECT" + (def.distinct ? " DISTINCT" : "") + (def.top ? " TOP " + def.top : "") + "\n";

    if (def.select) {
      query += Object.keys(def.select).map(key => "  " + def.select![key] + " AS " + key).join(",\n") + "\n";
    }
    else {
      query += "  *\n";
    }

    query += "FROM " + def.from + (def.as ? " AS " + def.as : "") + "\n";

    if (def.join) {
      query += def.join.join("\n") + "\n";
    }

    if (def.where) {
      query += "WHERE (" + def.where.join(")\nAND   (") + ")\n";
    }

    if (def.groupBy) {
      query += "GROUP BY " + def.groupBy.join(", ") + "\n";
    }

    if (def.having) {
      query += "HAVING (" + def.having.join(")\nAND   (") + ")\n";
    }

    if (def.orderBy) {
      query += "ORDER BY " + def.orderBy.join(", ") + "\n";
    }

    if (def.limit) {
      if (!def.orderBy) {
        throw new Error("'LIMIT'을 사용하려면, 'ORDER BY'를 반드시 설정해야 합니다.");
      }

      query += "OFFSET " + def.limit[0] + " ROWS FETCH NEXT " + def.limit[1] + " ROWS ONLY\n";
    }

    return query.trim();
  }

  private static _getUpdateQuery(def: ISdOrmQueryDef): string {
    SdOrmQueryHelper._checkKeys(def, ["type", "top", "select", "from", "update", "output", "as", "join", "where"]);

    let query: string = "UPDATE" + (def.top ? " TOP (" + def.top + ")" : "") + " " + def.from + " SET\n";
    query += Object.keys(def.update!).map(key => "  " + key + " = " + def.update![key]).join(",\n") + "\n";

    if (def.output) {
      query += "OUTPUT " + def.output.join(", ") + "\n";
    }

    query += "FROM " + def.from + (def.as ? " AS " + def.as : "") + "\n";

    if (def.join) {
      query += def.join.join("\n") + "\n";
    }

    if (def.where) {
      query += "WHERE (" + def.where.join(")\nAND   (") + ")\n";
    }

    return query.trim();
  }

  public static _getDeleteQuery(def: ISdOrmQueryDef): string {
    SdOrmQueryHelper._checkKeys(def, ["type", "top", "select", "from", "output", "as", "join", "where"]);

    let query: string = "DELETE" + (def.top ? " TOP (" + def.top + ")" : "") + " FROM " + def.from + "\n";

    if (def.output) {
      query += "OUTPUT " + def.output.join(", ") + "\n";
    }

    query += "FROM " + def.from + (def.as ? " AS " + def.as : "") + "\n";

    if (def.join) {
      query += def.join.join("\n") + "\n";
    }

    if (def.where) {
      query += "WHERE (" + def.where.join(")\nAND   (") + ")\n";
    }

    return query.trim();
  }

  public static _getInsertQuery(def: ISdOrmQueryDef): string {
    SdOrmQueryHelper._checkKeys(def, ["type", "from", "select", "as", "insert", "output"]);

    let query: string = "INSERT INTO " + def.from + " (" + Object.keys(def.insert!).join(", ") + ")\n";

    if (def.output) {
      query += "OUTPUT " + def.output.join(", ") + "\n";
    }

    query += "VALUES (" + Object.keys(def.insert!).map(key => def.insert![key]).join(", ") + ")\n";

    return query.trim();
  }

  public static _getUpsertQuery(def: ISdOrmQueryDef): string {
    if (!def.where) {
      throw new Error("'UPSERT'하려면 'WHERE'가 반드시 설정되어야 합니다.");
    }

    SdOrmQueryHelper._checkKeys(def, ["type", "from", "select", "as", "where", "update", "insert", "output"]);

    let query: string = "MERGE " + def.from + (def.as ? " AS " + def.as : "") + "\n";
    query += "USING (SELECT 0 as _using) AS _using\n";
    query += "ON (" + def.where.join(")\n  AND (") + ")\n";
    query += "WHEN MATCHED THEN\n";
    query += "  UPDATE SET\n";
    query += Object.keys(def.update!).map(key => "    " + key + " = " + def.update![key]).join(",\n") + "\n";
    query += "WHEN NOT MATCHED THEN\n";
    query += "  INSERT (" + Object.keys(def.insert!).join(", ") + ")\n";
    query += "  VALUES (" + Object.keys(def.insert!).map(key => def.insert![key]).join(", ") + ")\n";

    if (def.output) {
      query += "OUTPUT " + def.output.join(", ") + "\n";
    }

    query = query.slice(0, -1) + ";";

    return query.trim();
  }

  private static _checkKeys(def: ISdOrmQueryDef, keys: string[]): void {
    const invalidKeys: string[] = Object.keys(def)
      .filter(key => def[key] !== undefined && !keys.includes(key));

    if (invalidKeys.length > 0) {
      throw new Error("'" + def.type.toUpperCase() + "'에 '" + invalidKeys.map(key => key.toUpperCase()).join(", ") + "'를 사용할 수 없습니다.");
    }
  }
}
