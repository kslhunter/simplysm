import { Procedure } from "../../../src/schema/procedure-builder";

export const GetUserById = Procedure("GetUserById")
  .params((c) => ({
    userId: c.bigint(),
  }))
  .returns((c) => ({
    id: c.bigint(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
  }))
  .body("-- DBMSwrite matching query --");
