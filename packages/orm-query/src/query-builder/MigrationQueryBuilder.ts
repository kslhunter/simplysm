export class MigrationQueryBuilder {
  public createDatabase(dbName: string): string {
    return `CREATE DATABASE [${dbName}]`;
  }

  public createTable(
    tableDef: {
      database: string;
      scheme: string;
      name: string;
    },
    colDefs: {
      name: string;
      dataType: string;
      nullable?: boolean;
      autoIncrement?: boolean;
    }[]
  ): string {
    let query = "";
    query += `CREATE TABLE [${tableDef.database}].[${tableDef.scheme}].[${tableDef.name}] (\n`;
    query += colDefs
      .map(colDef => `  [${colDef.name}] ${colDef.dataType} ${colDef.autoIncrement ? "IDENTITY(1,1) " : " "}${colDef.nullable ? "NULL" : "NOT NULL"}`)
      .join(",\n") + "\n";
    query += ")";

    return query.trim();
  }

  public addPrimaryKey(
    tableDef: {
      database: string;
      scheme: string;
      name: string;
    },
    pkColDefs: {
      name: string;
      desc?: boolean;
    }[]
  ): string {
    let query = "";

    if (pkColDefs.length > 0) {
      query += `ALTER TABLE [${tableDef.database}].[${tableDef.scheme}].[${tableDef.name}] ADD PRIMARY KEY (${pkColDefs.map(item => `[${item.name}] ${item.desc ? "DESC" : "ASC"}`).join(", ")})\n`;
    }

    return query.trim();
  }

  public addForeignKey(
    tableDef: {
      database: string;
      scheme: string;
      name: string;
    },
    fkDef: {
      name: string;
      columnNames: string[];
      targetTableDef: {
        database: string;
        scheme: string;
        name: string;
      };
      targetColumnNames: string[];
    }
  ): string {
    let query = "";

    query += `ALTER TABLE [${tableDef.database}].[${tableDef.scheme}].[${tableDef.name}] ADD CONSTRAINT [FK_${tableDef.database}_${tableDef.scheme}_${tableDef.name}_${fkDef.name}] FOREIGN KEY (${fkDef.columnNames.map(colName => `[${colName}]`).join(", ")})\n`;
    query += `  REFERENCES [${fkDef.targetTableDef.database}].[${fkDef.targetTableDef.scheme}].[${fkDef.targetTableDef.name}] (${fkDef.targetColumnNames.map(item => `[${item}]`).join(", ")})\n`;
    query += "  ON DELETE NO ACTION\n";
    query += "  ON UPDATE NO ACTION;\n";

    return query.trim();
  }

  public dropDatabase(dbName: string): string {
    return `IF EXISTS(select * from sys.databases WHERE name='${dbName}') DROP DATABASE [${dbName}]`;
  }
}