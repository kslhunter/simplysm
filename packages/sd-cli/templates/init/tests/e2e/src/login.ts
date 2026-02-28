import { describe, expect, it } from "vitest";
import type { Page } from "playwright";

export function loginTests(ctx: { page: Page; baseUrl: string }) {
  describe("Login", () => {
    it("/ 접속 시 /login으로 리다이렉트", async () => {
      await ctx.page.goto(`${ctx.baseUrl}/`, { timeout: 5000 });
      await ctx.page.waitForURL(`${ctx.baseUrl}/#/login`);
      await expect(
        ctx.page.getByRole("button", { name: "로그인" }).textContent(),
      ).resolves.toContain("로그인");
    });

    it("토큰 없이 /home/main 접근 시 /login으로 리다이렉트", async () => {
      await ctx.page.goto(`${ctx.baseUrl}/#/home/main`);
      await ctx.page.waitForURL(`${ctx.baseUrl}/#/login`);
      await expect(
        ctx.page.getByRole("button", { name: "로그인" }).textContent(),
      ).resolves.toContain("로그인");
    });

    it("틀린 비밀번호 시 에러 메시지", async () => {
      await ctx.page.getByPlaceholder("이메일을 입력하세요").fill("admin@test.com");
      await ctx.page.getByPlaceholder("비밀번호를 입력하세요").fill("wrongpassword");
      await ctx.page.getByRole("button", { name: "로그인" }).click();

      const notification = ctx.page.getByRole("alert");
      await notification.waitFor({ timeout: 1000 });
      await expect(notification.textContent()).resolves.toContain(
        "이메일 또는 비밀번호가 올바르지 않습니다",
      );
    });

    it("올바른 자격 증명으로 로그인 성공", async () => {
      await ctx.page.goto(`${ctx.baseUrl}/#/login`);
      await ctx.page.getByRole("button", { name: "로그인" }).waitFor({ timeout: 2000 });

      await ctx.page.getByPlaceholder("이메일을 입력하세요").fill("admin@test.com");
      await ctx.page.getByPlaceholder("비밀번호를 입력하세요").fill("test1234");
      await ctx.page.getByRole("button", { name: "로그인" }).click({ timeout: 2000 });

      await ctx.page.waitForURL(`${ctx.baseUrl}/#/home/main`, { timeout: 2000 });
      const mainContent = ctx.page.locator("main").last();
      await expect(mainContent.locator("h1").textContent()).resolves.toContain("테스트");
    });

    it("마지막 로그인 이메일 기억", async () => {
      const lastLoginEmail = await ctx.page.evaluate(() =>
        JSON.parse(localStorage.getItem("client-admin.last-login-email") ?? "null"),
      );
      expect(lastLoginEmail).toBe("admin@test.com");
    });

    it("페이지 새로고침 시 자동 로그인", async () => {
      await ctx.page.reload();
      await ctx.page.waitForURL(`${ctx.baseUrl}/#/home/main`, { timeout: 2000 });
      const mainContent = ctx.page.locator("main").last();
      await expect(mainContent.locator("h1").textContent()).resolves.toContain("테스트");
    });
  });
}
