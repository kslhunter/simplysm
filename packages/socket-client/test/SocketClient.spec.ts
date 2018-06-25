import {JSDOM} from "jsdom";
import * as assert from "assert";
import {after, afterEach, before, beforeEach, describe, it} from "mocha";
import {SocketServer} from "@simplism/socket-server";
import {TestService} from "./services/TestService";
import {SocketClient} from "../src/SocketClient";

describe("SocketClient", () => {
  let jsdom: JSDOM;
  let server: SocketServer;

  before(() => {
    jsdom = new JSDOM("<!DOCTYPE html><html><head></head><body></body></html>", {
      url: "http://localhost/"
    });

    global["location"] = jsdom.window.location;
    global["WebSocket"] = jsdom.window["WebSocket"];
  });

  after(() => {
    jsdom.window.close();
  });

  beforeEach(async () => {
    server = new SocketServer([
      TestService
    ]);
    await server.startAsync();
  });

  afterEach(async () => {
    await server.closeAsync();
  });

  it("일반 명령 수행", async () => {
    const client = new SocketClient();
    await client.connectAsync();

    const result = await client.sendAsync("TestService.getValue", ["값"]);
    assert.strictEqual(result, "value: 값");

    await client.closeAsync();
  });

  it("에러발생시, 에러응답을 받음", async () => {
    const client = new SocketClient();
    await client.connectAsync();

    try {
      await client.sendAsync("TestService.throwError", ["값"]);
      assert.fail("에러가 발생했어야 함");
    }
    catch (err) {
      assert.strictEqual(err instanceof Error, true);
      assert.strictEqual(err.message, "value: 값");
    }

    await client.closeAsync();
  });
});