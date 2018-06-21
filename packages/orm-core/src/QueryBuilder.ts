export interface IQueryDef {
  type: "select" | "insert" | "update" | "upsert" | "delete";
  select?: { [key: string]: string };
  from?: string;
  as?: string;
  where?: string[];
  distinct?: boolean;
  top?: number;
  groupBy?: string[];
  join?: string[];
  limit?: number[];
  orderBy?: string[];
  update?: { [key: string]: string };
  insert?: { [key: string]: string };
  upsert?: { [key: string]: string };
  output?: string[];
}

export class QueryBuilder {
  public def: IQueryDef = {
    type: "select",
  };

  public from(unions: QueryBuilder[], as?: string): QueryBuilder;
  public from(queryBuilder: QueryBuilder, as?: string): QueryBuilder;
  public from(table: string, as?: string): QueryBuilder;
  public from(arg: string | QueryBuilder | QueryBuilder[], as?: string): QueryBuilder {
    const result = this.clone();
    if (arg instanceof Array) {
      result.def.from = "(\n\n  " + arg.map(item => item.query.replace(/\n/g, "\n  ")).join("\n\n  UNION ALL\n\n  ") + "\n\n)";
    }
    else if (arg instanceof QueryBuilder) {
      result.def.from = "(\n  " + arg.query.replace(/\n/g, "\n  ") + "\n)";
    }
    else {
      result.def.from = arg;
    }
    result.def.as = as;
    return result;
  }

  public as(as: string): QueryBuilder {
    const result = this.clone();
    result.def.as = as;
    return result;
  }

  public select(obj: { [key: string]: string }): QueryBuilder {
    const result = this.clone();
    result.def.select = obj;
    return result;
  }

  public where(predicate: string): QueryBuilder {
    const result = this.clone();
    result.def.where = result.def.where || [];
    result.def.where.push(predicate);
    return result;
  }

  public distinct(): QueryBuilder {
    const result = this.clone();
    result.def.distinct = true;
    return result;
  }

  public top(cnt: number): QueryBuilder {
    const result = this.clone();
    result.def.top = cnt;
    return result;
  }

  public orderBy(col: string, rule: "DESC" | "ASC"): QueryBuilder {
    const result = this.clone();
    result.def.orderBy = result.def.orderBy || [];
    result.def.orderBy.push(col + " " + rule);
    return result;
  }

  public limit(skip: number, take: number): QueryBuilder {
    const result = this.clone();
    result.def.limit = [skip, take];
    return result;
  }

  public groupBy(cols: string[]): QueryBuilder {
    const result = this.clone();
    result.def.groupBy = cols;
    return result;
  }

  public join(qb: QueryBuilder): QueryBuilder {
    const result = this.clone();
    result.def.join = result.def.join || [];

    if (Object.keys(qb.def).some(key => key !== "type" && key !== "where" && key !== "from" && key !== "as" && qb.def[key])) {
      let joinQuery = "OUTER APPLY (\n";
      joinQuery += "  " + qb.query.replace(/\n/g, "\n  ") + "\n";
      joinQuery += ") AS " + qb.def.as;
      result.def.join.push(joinQuery);
    }
    else {
      let joinQuery = "LEFT OUTER JOIN " + qb.def.from + " AS " + qb.def.as;
      if (qb.def.where) {
        joinQuery += " ON (" + qb.def.where.join(") AND (") + ")";
      }
      result.def.join.push(joinQuery);
    }

    return result;
  }

  public update(obj: { [key: string]: string }): QueryBuilder {
    const result = this.clone();
    result.def.type = "update";
    result.def.update = obj;
    return result;
  }

  public delete(): QueryBuilder {
    const result = this.clone();
    result.def.type = "delete";
    return result;
  }

  public insert(obj: { [key: string]: string }): QueryBuilder {
    const result = this.clone();
    result.def.type = "insert";
    result.def.insert = obj;
    return result;
  }

  public upsert(obj: { [key: string]: string }): QueryBuilder {
    const result = this.clone();
    result.def.type = "upsert";
    result.def.upsert = obj;
    return result;
  }

  public output(arr: string[]): QueryBuilder {
    const result = this.clone();
    result.def.output = arr;
    return result;
  }

  public get query(): string {
    if (!this.def.from) {
      throw new Error("'FROM'이 반드시 설정되어야 합니다.");
    }

    let query = "";

    if (this.def.type === "select") {
      this._checkKeys(["type", "from", "distinct", "top", "select", "from", "as", "join", "where", "groupBy", "orderBy", "limit"]);

      query += "SELECT" + (this.def.distinct ? " DISTINCT" : "") + (this.def.top ? " TOP " + this.def.top : "") + "\n";

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

      if (this.def.orderBy) {
        query += "ORDER BY " + this.def.orderBy.join(", ") + "\n";
      }

      if (this.def.limit) {
        if (!this.def.orderBy) {
          throw new Error("'LIMIT'을 사용하려면, 'ORDER BY'를 반드시 설정해야 합니다.");
        }

        query += "OFFSET " + this.def.limit[0] + " ROWS FETCH NEXT " + this.def.limit[1] + " ROWS ONLY\n";
      }
    }
    else if (this.def.type === "update") {
      this._checkKeys(["type", "top", "from", "update", "output", "as", "join", "where"]);

      query += "UPDATE" + (this.def.top ? " TOP (" + this.def.top + ")" : "") + " " + this.def.from + " SET\n";
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
    }
    else if (this.def.type === "delete") {
      this._checkKeys(["type", "top", "from", "output", "as", "join", "where"]);

      query += "DELETE" + (this.def.top ? " TOP (" + this.def.top + ")" : "") + " FROM " + this.def.from + "\n";

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
    }
    else if (this.def.type === "insert") {
      this._checkKeys(["type", "from", "insert", "output"]);

      query += "INSERT INTO " + this.def.from + " (" + Object.keys(this.def.insert!).join(", ") + ")\n";

      if (this.def.output) {
        query += "OUTPUT " + this.def.output.join(", ") + "\n";
      }

      query += "VALUES (" + Object.keys(this.def.insert!).map(key => this.def.insert![key]).join(", ") + ")\n";
    }
    else if (this.def.type === "upsert") {
      if (!this.def.where) {
        throw new Error("'UPSERT'하려면 'WHERE'가 반드시 설정되어야 합니다.");
      }

      this._checkKeys(["type", "from", "as", "where", "upsert", "output"]);

      query += "MERGE " + this.def.from + (this.def.as ? " AS " + this.def.as : "") + "\n";
      query += "USING (SELECT 0 as _using) AS _using\n";
      query += "ON (" + this.def.where.join(")\n  AND (") + ")\n";
      query += "WHEN MATCHED THEN\n";
      query += "  UPDATE SET\n";
      query += Object.keys(this.def.upsert!).map(key => "    " + key + " = " + this.def.upsert![key]).join(",\n") + "\n";
      query += "WHEN NOT MATCHED THEN\n";
      query += "  INSERT (" + Object.keys(this.def.upsert!).join(", ") + ")\n";
      query += "  VALUES (" + Object.keys(this.def.upsert!).map(key => this.def.upsert![key]).join(", ") + ")\n";

      if (this.def.output) {
        query += "OUTPUT " + this.def.output.join(", ") + "\n";
      }

      query = query.slice(0, -1) + ";";
    }
    else {
      throw new Error("'TYPE'이 잘못되었습니다. (" + this.def.type + ")");
    }

    return query.trim();
  }

  public clone(): QueryBuilder {
    const result = new QueryBuilder();
    result.def = {
      type: this.def.type,
      from: this.def.from,
      as: this.def.as,
      select: this.def.select && {...this.def.select},
      where: this.def.where && [...this.def.where],
      distinct: this.def.distinct,
      top: this.def.top,
      groupBy: this.def.groupBy && [...this.def.groupBy],
      join: this.def.join && [...this.def.join],
      limit: this.def.limit && [...this.def.limit],
      orderBy: this.def.orderBy && [...this.def.orderBy],
      update: this.def.update && {...this.def.update},
      insert: this.def.insert && {...this.def.insert},
      upsert: this.def.upsert && {...this.def.upsert},
      output: this.def.output && [...this.def.output]
    };
    return result;
  }

  private _checkKeys(keys: string[]): void {
    const invalidKeys = Object.keys(this.def)
      .filter(key => this.def["key"] !== undefined && !keys.includes(key));

    if (invalidKeys.length > 0) {
      throw new Error("'" + this.def.type.toUpperCase() + "'에 '" + invalidKeys.map(key => key.toUpperCase()).join(", ") + "'를 사용할 수 없습니다.");
    }
  }
}