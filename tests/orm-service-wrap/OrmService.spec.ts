import * as assert from "assert";
import {after, afterEach, before, beforeEach, describe, it} from "mocha";
import {ServiceContainer} from "@simplism/service-container";
import {ServiceInterface} from "@simplism/service-interface";
import {TestDbContext} from "./orm/TestDbContext";
import {JSDOM} from "jsdom";
import {OrmConnector} from "@simplism/orm-service-wrap";

describe("OrmServiceWrap", () => {
  let jsdom: JSDOM;
  let server: ServiceContainer;
  let client: ServiceInterface;
  let orm: OrmConnector;

  before(() => {
    jsdom = new JSDOM("<!DOCTYPE html><html><head></head><body></body></html>", {
      url: "http://localhost:59280/"
    });

    global["location"] = jsdom.window.location;
    global["WebSocket"] = jsdom.window["WebSocket"];
  });

  after(() => {
    jsdom.window.close();
  });

  beforeEach(async () => {
    server = new ServiceContainer();
    await server.startAsync(59280);

    client = new ServiceInterface();
    await client.connectAsync(59280);

    orm = new OrmConnector(client);

    await orm.connectWithoutTransactionAsync(TestDbContext, async db => {
      await db.initializeAsync();
      await db.testModel
        .insertAsync({
          name: "관리자"
        });
    });
  });

  afterEach(async () => {
    try {
      await orm.connectWithoutTransactionAsync(TestDbContext, async db => {
        await db.dropAllAsync();
      });
    }
    catch (err) {
      await client.closeAsync();
      await server.closeAsync();
      throw err;
    }

    await client.closeAsync();
    await server.closeAsync();
  });

  it("일반 쿼리 실행", async () => {
    await orm.connectAsync(TestDbContext, async db => {
      const result = await db.testModel.resultAsync();
      assert.deepStrictEqual(result, [{id: 1, name: "관리자"}]);
    });
  });
});