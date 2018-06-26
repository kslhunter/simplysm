import * as assert from "assert";
import {after, afterEach, before, beforeEach, describe, it} from "mocha";
import {ServiceContainer} from "@simplism/service-container";
import {ServiceInterface} from "@simplism/service-interface";
import {TestDbContext} from "./orm/TestDbContext";
import {JSDOM} from "jsdom";

describe("Service", () => {
  let jsdom: JSDOM;
  let server: ServiceContainer;
  let client: ServiceInterface;

  before(() => {
    jsdom = new JSDOM("<!DOCTYPE html><html><head></head><body></body></html>", {
      url: "http://localhost/"
    });

    global["location"] = jsdom.window.location;
    global["WebSocket"] = jsdom.window["WebSocket"];
  });

  after(() => {
    console.log("!!!!");
    jsdom.window.close();
  });

  beforeEach(async () => {
    server = new ServiceContainer();
    await server.startAsync();

    client = new ServiceInterface();
    await client.connectAsync();

    await client.orm.connectAsync(TestDbContext, async db => {
      await db.initializeAsync();
      await db.testModel
        .insertAsync({
          name: "관리자"
        });
    });
  });

  afterEach(async () => {
    try {
      await client.orm.connectAsync(TestDbContext, async db => {
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
    await client.orm.connectAsync(TestDbContext, async db => {
      const result = await db.testModel.resultAsync();
      assert.deepStrictEqual(result, [{id: 1, name: "관리자"}]);
    });
  });
});