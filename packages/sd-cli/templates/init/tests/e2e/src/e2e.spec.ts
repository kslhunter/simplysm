import { describe, inject, beforeAll, afterAll } from "vitest";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { loginTests } from "./login";
import { employeeCrudTests } from "./employee-crud";

const ctx = {} as { page: Page; baseUrl: string };

let browser: Browser;
let context: BrowserContext;

describe("E2E", () => {
  beforeAll(async () => {
    ctx.baseUrl = inject("baseUrl");
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    ctx.page = await context.newPage();
    ctx.page.setDefaultTimeout(500);

    // 브라우저 콘솔 에러 → 테스트 콘솔에 출력
    ctx.page.on("pageerror", (err) => {
      console.error(`[PAGE_ERROR] ${err.message}`);
    });
    ctx.page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error(`[CONSOLE_ERROR] ${msg.text()}`);
      }
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  loginTests(ctx);
  employeeCrudTests(ctx);
});
