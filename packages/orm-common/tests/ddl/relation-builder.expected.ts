import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

export const basicForeignKey: ExpectedSql = {
  mysql: mysql`
ALTER TABLE \`TestDb\`.\`Post\` ADD CONSTRAINT \`FK_Post_user\`
FOREIGN KEY (\`userId\`) REFERENCES \`TestDb\`.\`User\` (\`id\`)
  `,
  mssql: tsql`
ALTER TABLE [TestDb].[TestSchema].[Post] ADD CONSTRAINT [FK_Post_user]
FOREIGN KEY ([userId]) REFERENCES [TestDb].[TestSchema].[User] ([id]);
CREATE INDEX [IDX_Post_Post_user] ON [TestDb].[TestSchema].[Post] ([userId]);
  `,
  postgresql: pgsql`
ALTER TABLE "TestSchema"."Post" ADD CONSTRAINT "FK_Post_user"
FOREIGN KEY ("userId") REFERENCES "TestSchema"."User" ("id");
CREATE INDEX "IDX_Post_Post_user" ON "TestSchema"."Post" ("userId");
  `,
};

export const compositeForeignKey: ExpectedSql = {
  mysql: mysql`
ALTER TABLE \`TestDb\`.\`Employee\` ADD CONSTRAINT \`FK_Employee_company\`
FOREIGN KEY (\`companyId\`, \`companyRegionId\`) REFERENCES \`TestDb\`.\`Company\` (\`id\`, \`regionId\`)
  `,
  mssql: tsql`
ALTER TABLE [TestDb].[TestSchema].[Employee] ADD CONSTRAINT [FK_Employee_company]
FOREIGN KEY ([companyId], [companyRegionId]) REFERENCES [TestDb].[TestSchema].[Company] ([id], [regionId]);
CREATE INDEX [IDX_Employee_Employee_company] ON [TestDb].[TestSchema].[Employee] ([companyId], [companyRegionId]);
  `,
  postgresql: pgsql`
ALTER TABLE "TestSchema"."Employee" ADD CONSTRAINT "FK_Employee_company"
FOREIGN KEY ("companyId", "companyRegionId") REFERENCES "TestSchema"."Company" ("id", "regionId");
CREATE INDEX "IDX_Employee_Employee_company" ON "TestSchema"."Employee" ("companyId", "companyRegionId");
  `,
};
