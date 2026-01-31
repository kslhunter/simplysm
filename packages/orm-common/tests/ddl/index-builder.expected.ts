import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

export const singleColumnIndex: ExpectedSql = {
  mysql: mysql`CREATE INDEX \`IDX_User_email\` ON \`TestDb\`.\`User\` (\`email\` ASC)`,
  mssql: tsql`CREATE INDEX [IDX_User_email] ON [TestDb].[TestSchema].[User] ([email] ASC)`,
  postgresql: pgsql`CREATE INDEX "IDX_User_email" ON "TestSchema"."User" ("email" ASC)`,
};

export const uniqueIndex: ExpectedSql = {
  mysql: mysql`CREATE UNIQUE INDEX \`IDX_User_email\` ON \`TestDb\`.\`User\` (\`email\` ASC)`,
  mssql: tsql`CREATE UNIQUE INDEX [IDX_User_email] ON [TestDb].[TestSchema].[User] ([email] ASC)`,
  postgresql: pgsql`CREATE UNIQUE INDEX "IDX_User_email" ON "TestSchema"."User" ("email" ASC)`,
};

export const compositeIndex: ExpectedSql = {
  mysql: mysql`CREATE INDEX \`IDX_User_name_email\` ON \`TestDb\`.\`User\` (\`name\` ASC, \`email\` ASC)`,
  mssql: tsql`CREATE INDEX [IDX_User_name_email] ON [TestDb].[TestSchema].[User] ([name] ASC, [email] ASC)`,
  postgresql: pgsql`CREATE INDEX "IDX_User_name_email" ON "TestSchema"."User" ("name" ASC, "email" ASC)`,
};

export const orderByIndex: ExpectedSql = {
  mysql: mysql`CREATE INDEX \`IDX_User_name_email\` ON \`TestDb\`.\`User\` (\`name\` DESC, \`email\` ASC)`,
  mssql: tsql`CREATE INDEX [IDX_User_name_email] ON [TestDb].[TestSchema].[User] ([name] DESC, [email] ASC)`,
  postgresql: pgsql`CREATE INDEX "IDX_User_name_email" ON "TestSchema"."User" ("name" DESC, "email" ASC)`,
};

export const customNameIndex: ExpectedSql = {
  mysql: mysql`CREATE INDEX \`UQ_User_email\` ON \`TestDb\`.\`User\` (\`email\` ASC)`,
  mssql: tsql`CREATE INDEX [UQ_User_email] ON [TestDb].[TestSchema].[User] ([email] ASC)`,
  postgresql: pgsql`CREATE INDEX "UQ_User_email" ON "TestSchema"."User" ("email" ASC)`,
};

export const uniqueOrderByIndex: ExpectedSql = {
  mysql: mysql`CREATE UNIQUE INDEX \`IDX_User_name_email\` ON \`TestDb\`.\`User\` (\`name\` DESC, \`email\` ASC)`,
  mssql: tsql`CREATE UNIQUE INDEX [IDX_User_name_email] ON [TestDb].[TestSchema].[User] ([name] DESC, [email] ASC)`,
  postgresql: pgsql`CREATE UNIQUE INDEX "IDX_User_name_email" ON "TestSchema"."User" ("name" DESC, "email" ASC)`,
};
