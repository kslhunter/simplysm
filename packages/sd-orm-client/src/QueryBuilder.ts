import {QueryHelper} from "./QueryHelper";
import {IQueryDef} from "./IQueryDef";

export class QueryBuilder {
  public def: IQueryDef = {
    type: "select"
  };

  public from(def: IQueryDef): QueryBuilder;
  public from(unions: QueryBuilder[], as?: string): QueryBuilder;
  public from(queryBuilder: QueryBuilder, as?: string): QueryBuilder;
  public from(table: string, as?: string): QueryBuilder;
  public from(arg: IQueryDef | string | QueryBuilder | QueryBuilder[], as?: string): QueryBuilder {
    const result: QueryBuilder = this.clone();
    if (arg instanceof Array) {
      result.def.from = "(\n\n  " + arg.map(item => item.query.replace(/\n/g, "\n  ")).join("\n\n  UNION ALL\n\n  ") + "\n\n)";
    }
    else if (arg instanceof QueryBuilder) {
      result.def.from = "(\n  " + arg.query.replace(/\n/g, "\n  ") + "\n)";
    }
    else if (arg["type"]) {
      result.def = arg as IQueryDef;
    }
    else {
      result.def.from = arg as string;
    }
    result.def.as = as || result.def.as;
    return result;
  }

  public as(as: string): QueryBuilder {
    const result: QueryBuilder = this.clone();
    result.def.as = as;
    return result;
  }

  public select(obj: { [key: string]: any }): QueryBuilder {
    const result: QueryBuilder = this.clone();
    const newObj = {};
    for (const key of Object.keys(obj)) {
      newObj[key] = QueryHelper.getFieldQuery(obj[key]);
    }
    result.def.select = newObj;
    return result;
  }

  public where(predicate: string): QueryBuilder {
    const result: QueryBuilder = this.clone();
    result.def.where = result.def.where || [];
    result.def.where.push(predicate);
    return result;
  }

  public distinct(): QueryBuilder {
    const result: QueryBuilder = this.clone();
    result.def.distinct = true;
    return result;
  }

  public top(cnt: number): QueryBuilder {
    const result: QueryBuilder = this.clone();
    result.def.top = cnt;
    return result;
  }

  public orderBy(col: any, rule: "DESC" | "ASC"): QueryBuilder {
    const result: QueryBuilder = this.clone();
    result.def.orderBy = result.def.orderBy || [];
    result.def.orderBy.push(QueryHelper.getFieldQuery(col) + " " + rule);
    return result;
  }

  public limit(skip: number, take: number): QueryBuilder {
    const result: QueryBuilder = this.clone();
    result.def.limit = [skip, take];
    return result;
  }

  public groupBy(cols: any[]): QueryBuilder {
    const result: QueryBuilder = this.clone();
    result.def.groupBy = cols.map(item => QueryHelper.getFieldQuery(item));
    return result;
  }

  public having(predicate: string): QueryBuilder {
    const result: QueryBuilder = this.clone();
    result.def.having = result.def.having || [];
    result.def.having.push(predicate);
    return result;
  }

  public join(qb: QueryBuilder): QueryBuilder | undefined {
    const result: QueryBuilder = this.clone();
    result.def.join = result.def.join || [];

    let joinQuery: string;
    if (Object.keys(qb.def).some(key => key !== "type" && key !== "where" && key !== "from" && key !== "as" && qb.def[key])) {
      joinQuery = "OUTER APPLY (\n";
      joinQuery += "  " + qb.query.replace(/\n/g, "\n  ") + "\n";
      joinQuery += ") AS " + qb.def.as;
    }
    else {
      joinQuery = "LEFT OUTER JOIN " + qb.def.from + " AS " + qb.def.as;
      if (qb.def.where) {
        joinQuery += " ON (" + qb.def.where.join(") AND (") + ")";
      }
    }

    if (result.def.join.includes(joinQuery)) {
      return undefined;
    }

    result.def.join.push(joinQuery);

    return result;
  }

  public update(obj: { [key: string]: string }): QueryBuilder {
    const result: QueryBuilder = this.clone();
    result.def.type = "update";

    const newObj = {};
    for (const key of Object.keys(obj)) {
      newObj[key] = QueryHelper.getFieldQuery(obj[key]);
    }
    result.def.update = newObj;
    return result;
  }

  public delete(): QueryBuilder {
    const result: QueryBuilder = this.clone();
    result.def.type = "delete";
    return result;
  }

  public insert(obj: { [key: string]: string }): QueryBuilder {
    const result: QueryBuilder = this.clone();
    result.def.type = "insert";

    const newObj = {};
    for (const key of Object.keys(obj)) {
      newObj[key] = QueryHelper.getFieldQuery(obj[key]);
    }
    result.def.insert = newObj;
    return result;
  }

  public upsert(obj: { [key: string]: string }, additionalInsertObj?: { [key: string]: any }): QueryBuilder {
    const result: QueryBuilder = this.clone();
    result.def.type = "upsert";

    const newObj = {};
    for (const key of Object.keys(obj)) {
      newObj[key] = QueryHelper.getFieldQuery(obj[key]);
    }

    const newAdObj = {};
    if (additionalInsertObj) {
      for (const key of Object.keys(additionalInsertObj)) {
        newAdObj[key] = QueryHelper.getFieldQuery(additionalInsertObj[key]);
      }
    }

    result.def.update = newObj;
    result.def.insert = {
      ...newObj,
      ...newAdObj
    };
    return result;
  }

  public output(arr: string[]): QueryBuilder {
    const result: QueryBuilder = this.clone();
    result.def.output = arr;
    return result;
  }

  public get query(): string {
    if (!this.def.from) {
      throw new Error("'FROM'이 반드시 설정되어야 합니다.");
    }

    if (this.def.type === "select") {
      return this._getSelectQuery();
    }
    else if (this.def.type === "update") {
      return this._getUpdateQuery();
    }
    else if (this.def.type === "delete") {
      return this._getDeleteQuery();
    }
    else if (this.def.type === "insert") {
      return this._getInsertQuery();
    }
    else if (this.def.type === "upsert") {
      return this._getUpsertQuery();
    }
    else {
      throw new Error("'TYPE'이 잘못되었습니다. (" + this.def.type + ")");
    }
  }

  private _getSelectQuery(): string {
    this._checkKeys(["type", "distinct", "top", "select", "from", "as", "join", "where", "groupBy", "having", "orderBy", "limit"]);

    let query: string = "SELECT" + (this.def.distinct ? " DISTINCT" : "") + (this.def.top ? " TOP " + this.def.top : "") + "\n";

    if (this.def.select) {
      query += Object.keys(this.def.select).map(key => "  " + this.def.select![key] + " AS " + key).join(",\n") + "\n";
    }
    else {
      query += "  *\n";
    }

    query += "FROM " + this.def.from + (this.def.as ? " AS " + this.def.as : "") + "\n";

    if (this.def.join) {
      query += this.def.join.join("\n") + "\n";
    }

    if (this.def.where) {
      query += "WHERE (" + this.def.where.join(")\nAND   (") + ")\n";
    }

    if (this.def.groupBy) {
      query += "GROUP BY " + this.def.groupBy.join(", ") + "\n";
    }

    if (this.def.having) {
      query += "HAVING (" + this.def.having.join(")\nAND   (") + ")\n";
    }

    if (this.def.orderBy) {
      query += "ORDER BY " + this.def.orderBy.join(", ") + "\n";
    }

    if (this.def.limit) {
      if (!this.def.orderBy) {
        throw new Error("'LIMIT'을 사용하려면, 'ORDER BY'를 반드시 설정해야 합니다.");
      }

      query += "OFFSET " + this.def.limit[0] + " ROWS FETCH NEXT " + this.def.limit[1] + " ROWS ONLY\n";
    }

    return query.trim();
  }

  private _getUpdateQuery(): string {
    this._checkKeys(["type", "top", "select", "from", "update", "output", "as", "join", "where"]);

    let query: string = "UPDATE" + (this.def.top ? " TOP (" + this.def.top + ")" : "") + " " + this.def.from + " SET\n";
    query += Object.keys(this.def.update!).map(key => "  " + key + " = " + this.def.update![key]).join(",\n") + "\n";

    if (this.def.output) {
      query += "OUTPUT " + this.def.output.join(", ") + "\n";
    }

    query += "FROM " + this.def.from + (this.def.as ? " AS " + this.def.as : "") + "\n";

    if (this.def.join) {
      query += this.def.join.join("\n") + "\n";
    }

    if (this.def.where) {
      query += "WHERE (" + this.def.where.join(")\nAND   (") + ")\n";
    }

    return query.trim();
  }

  public _getDeleteQuery(): string {
    this._checkKeys(["type", "top", "select", "from", "output", "as", "join", "where"]);

    let query: string = "DELETE" + (this.def.top ? " TOP (" + this.def.top + ")" : "") + " FROM " + this.def.from + "\n";

    if (this.def.output) {
      query += "OUTPUT " + this.def.output.join(", ") + "\n";
    }

    query += "FROM " + this.def.from + (this.def.as ? " AS " + this.def.as : "") + "\n";

    if (this.def.join) {
      query += this.def.join.join("\n") + "\n";
    }

    if (this.def.where) {
      query += "WHERE (" + this.def.where.join(")\nAND   (") + ")\n";
    }

    return query.trim();
  }

  public _getInsertQuery(): string {
    this._checkKeys(["type", "from", "select", "as", "insert", "output"]);

    let query: string = "INSERT INTO " + this.def.from + " (" + Object.keys(this.def.insert!).join(", ") + ")\n";

    if (this.def.output) {
      query += "OUTPUT " + this.def.output.join(", ") + "\n";
    }

    query += "VALUES (" + Object.keys(this.def.insert!).map(key => this.def.insert![key]).join(", ") + ")\n";

    return query.trim();
  }

  public _getUpsertQuery(): string {
    if (!this.def.where) {
      throw new Error("'UPSERT'하려면 'WHERE'가 반드시 설정되어야 합니다.");
    }

    this._checkKeys(["type", "from", "select", "as", "where", "update", "insert", "output"]);

    let query: string = "MERGE " + this.def.from + (this.def.as ? " AS " + this.def.as : "") + "\n";
    query += "USING (SELECT 0 as _using) AS _using\n";
    query += "ON (" + this.def.where.join(")\n  AND (") + ")\n";
    query += "WHEN MATCHED THEN\n";
    query += "  UPDATE SET\n";
    query += Object.keys(this.def.update!).map(key => "    " + key + " = " + this.def.update![key]).join(",\n") + "\n";
    query += "WHEN NOT MATCHED THEN\n";
    query += "  INSERT (" + Object.keys(this.def.insert!).join(", ") + ")\n";
    query += "  VALUES (" + Object.keys(this.def.insert!).map(key => this.def.insert![key]).join(", ") + ")\n";

    if (this.def.output) {
      query += "OUTPUT " + this.def.output.join(", ") + "\n";
    }

    query = query.slice(0, -1) + ";";

    return query.trim();
  }

  public clone(): QueryBuilder {
    const result: QueryBuilder = new QueryBuilder();
    result.def = {
      type: this.def.type,
      from: this.def.from,
      as: this.def.as,
      select: this.def.select && {...this.def.select},
      where: this.def.where && [...this.def.where],
      distinct: this.def.distinct,
      top: this.def.top,
      groupBy: this.def.groupBy && [...this.def.groupBy],
      having: this.def.having && [...this.def.having],
      join: this.def.join && [...this.def.join],
      limit: this.def.limit && [...this.def.limit],
      orderBy: this.def.orderBy && [...this.def.orderBy],
      update: this.def.update && {...this.def.update},
      insert: this.def.insert && {...this.def.insert},
      output: this.def.output && [...this.def.output]
    };
    return result;
  }

  private _checkKeys(keys: string[]): void {
    const invalidKeys: string[] = Object.keys(this.def)
      .filter(key => this.def[key] !== undefined && !keys.includes(key));

    if (invalidKeys.length > 0) {
      throw new Error("'" + this.def.type.toUpperCase() + "'에 '" + invalidKeys.map(key => key.toUpperCase()).join(", ") + "'를 사용할 수 없습니다.");
    }
  }
}
