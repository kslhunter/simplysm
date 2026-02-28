import { describe, it, expect, beforeAll } from "vitest";
import type { Page } from "playwright";

export function employeeCrudTests(ctx: { page: Page; baseUrl: string }) {
  describe("EmployeeSheet CRUD", () => {
    const sheetSelector = '[data-sheet="employee-page-sheet"]';

    function sheetRows() {
      return ctx.page.locator(`${sheetSelector} tbody tr`);
    }

    function dialogLocator() {
      return ctx.page.locator("[data-modal-dialog]").last();
    }

    async function waitForSheetLoaded() {
      await sheetRows().first().waitFor({ timeout: 1000 });
    }

    async function waitForBusyDone() {
      await ctx.page.waitForTimeout(50);
      await ctx.page.waitForFunction(() => !document.querySelector(".animate-spin"));
    }

    async function waitForDialogClosed() {
      await ctx.page.waitForFunction(
        () =>
          document.querySelectorAll("[data-modal-dialog]").length === 0 &&
          document.querySelectorAll("[data-modal-backdrop]").length === 0,
      );
    }

    async function assertNotification(text: string) {
      const alert = ctx.page
        .locator("[data-notification-banner]")
        .filter({ hasText: text })
        .first();
      await alert.waitFor();
      const closeButtons = ctx.page.locator(
        '[data-notification-banner] button[aria-label="알림 닫기"]',
      );
      const count = await closeButtons.count();
      for (let i = count - 1; i >= 0; i--) {
        await closeButtons
          .nth(i)
          .click()
          .catch(() => {});
      }
      await ctx.page.waitForFunction(
        () => document.querySelectorAll("[data-notification-banner]").length === 0,
      );
    }

    async function clickSearch() {
      await ctx.page.getByRole("button", { name: "조회" }).click();
      await waitForBusyDone();
    }

    async function clickAdd() {
      await ctx.page.getByRole("button", { name: /등록/ }).click();
      await dialogLocator().waitFor();
    }

    async function clickEditRow(rowIndex: number) {
      await sheetRows().nth(rowIndex).locator("a").first().click();
      await dialogLocator().waitFor();
      await waitForBusyDone();
    }

    async function fillDialogField(label: string, value: string) {
      const dlg = dialogLocator();
      const th = dlg.locator("th").filter({ hasText: label });
      const td = th.locator("xpath=following-sibling::td[1]");
      const field = td.locator("input:not([aria-hidden])").first();
      await field.fill(value);
    }

    async function clickDialogSubmit() {
      await dialogLocator().getByRole("button", { name: "확인" }).click();
    }

    async function closeDialog() {
      await ctx.page.keyboard.press("Escape");
      await waitForDialogClosed();
    }

    beforeAll(async () => {
      await ctx.page.goto(`${ctx.baseUrl}/#/home/base/employee`);
      await waitForSheetLoaded();
    });

    describe("Create", () => {
      it("새 직원 등록", async () => {
        await clickAdd();

        await fillDialogField("이름", "E2E테스트유저");
        await fillDialogField("이메일", "e2e@test.com");

        await clickDialogSubmit();
        await assertNotification("저장되었습니다");
        await waitForDialogClosed();
        await clickSearch();

        const firstCell = sheetRows().first().locator("td").nth(1);
        await expect(firstCell.textContent()).resolves.toContain("E2E테스트유저");
      });
    });

    describe("Read / Filter", () => {
      it("검색어 필터링", async () => {
        const searchInput = ctx.page.locator("form").first().locator("input").first();
        await searchInput.fill("E2E테스트");
        await clickSearch();

        const rowCount = await sheetRows().count();
        expect(rowCount).toBe(1);
        await expect(sheetRows().first().locator("td").nth(1).textContent()).resolves.toContain(
          "E2E테스트유저",
        );

        await searchInput.fill("");
        await clickSearch();
        const allRowCount = await sheetRows().count();
        expect(allRowCount).toBe(2);
      });
    });

    describe("Update", () => {
      it("기존 유저 이름 수정", async () => {
        await clickEditRow(0);

        await fillDialogField("이름", "E2E수정유저");

        await clickDialogSubmit();
        await assertNotification("저장되었습니다");
        await waitForDialogClosed();
        await clickSearch();

        await expect(sheetRows().first().locator("td").nth(1).textContent()).resolves.toContain(
          "E2E수정유저",
        );
      });
    });

    describe("Delete", () => {
      it("유저 soft delete", async () => {
        await clickEditRow(0);

        await dialogLocator().getByRole("button", { name: "삭제" }).click();
        await assertNotification("삭제되었습니다");
        await waitForDialogClosed();
        await clickSearch();

        const rowCount = await sheetRows().count();
        expect(rowCount).toBe(1);
        await expect(sheetRows().first().locator("td").nth(1).textContent()).resolves.toContain(
          "테스트",
        );
      });

      it("삭제항목 포함 필터로 삭제된 유저 확인", async () => {
        await ctx.page.getByText("삭제항목 포함").click();
        await clickSearch();

        const rowCount = await sheetRows().count();
        expect(rowCount).toBe(2);

        await ctx.page.getByText("삭제항목 포함").click();
        await clickSearch();
      });
    });

    describe("Error cases", () => {
      it("이름 중복 에러", async () => {
        await clickAdd();
        await fillDialogField("이름", "테스트");
        await clickDialogSubmit();
        await assertNotification("동일한 이름이 이미 등록되어 있습니다");

        await closeDialog();
      });

      it("이메일 중복 에러", async () => {
        await clickAdd();
        await fillDialogField("이름", "고유이름");
        await fillDialogField("이메일", "admin@test.com");
        await clickDialogSubmit();
        await assertNotification("동일한 이메일이 이미 등록되어 있습니다");

        await closeDialog();
      });

      it("자기 자신 삭제 불가", async () => {
        await clickEditRow(0);
        await waitForBusyDone();

        const deleteBtn = dialogLocator().getByRole("button", { name: "삭제" });
        expect(await deleteBtn.count()).toBe(0);

        await closeDialog();
      });
    });
  });
}
