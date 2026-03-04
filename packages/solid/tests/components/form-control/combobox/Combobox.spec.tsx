import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Combobox } from "../../../../src/components/form-control/combobox/Combobox";
import { I18nProvider } from "../../../../src/providers/i18n/I18nContext";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

describe("Combobox component", () => {
  const mockLoadItems = vi.fn(() => Promise.resolve([]));

  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
    mockLoadItems.mockClear();
  });

  describe("dropdown opening/closing", () => {
    it("opens dropdown on input", async () => {
      const loadItems = vi.fn(() => Promise.resolve([{ id: 1, name: "사과" }]));
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Combobox loadItems={loadItems} renderValue={(v: { name: string }) => <>{v.name}</>} />
        </I18nProvider></ConfigProvider>
      ));

      const input = container.querySelector("input")!;
      fireEvent.input(input, { target: { value: "사" } });

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });
    });

    it("closes dropdown when item is selected", async () => {
      const loadItems = vi.fn(() => Promise.resolve([{ id: 1, name: "사과" }]));
      const { container, getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Combobox loadItems={loadItems} renderValue={(v: { name: string }) => <>{v.name}</>} />
        </I18nProvider></ConfigProvider>
      ));

      const input = container.querySelector("input")!;
      fireEvent.input(input, { target: { value: "사" } });

      await waitFor(() => {
        expect(document.querySelector("[data-combobox-item]")).not.toBeNull();
      });

      const item = document.querySelector("[data-combobox-item]") as HTMLElement;
      fireEvent.click(item);

      await waitFor(() => {
        expect(getByRole("combobox").getAttribute("aria-expanded")).toBe("false");
      });
    });

    it("closes dropdown with Escape key", async () => {
      const loadItems = vi.fn(() => Promise.resolve([{ id: 1, name: "사과" }]));
      const { container, getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Combobox loadItems={loadItems} renderValue={(v: { name: string }) => <>{v.name}</>} />
        </I18nProvider></ConfigProvider>
      ));

      const input = container.querySelector("input")!;
      fireEvent.input(input, { target: { value: "사" } });

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      fireEvent.keyDown(getByRole("combobox"), { key: "Escape" });

      await waitFor(() => {
        expect(getByRole("combobox").getAttribute("aria-expanded")).toBe("false");
      });
    });
  });

  describe("value selection", () => {
    it("calls onValueChange when item is selected", async () => {
      const handleChange = vi.fn();
      const loadItems = vi.fn(() => Promise.resolve([{ id: 1, name: "사과" }]));

      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Combobox
            loadItems={loadItems}
            onValueChange={handleChange}
            renderValue={(v: { name: string }) => <>{v.name}</>}
          />
        </I18nProvider></ConfigProvider>
      ));

      const input = container.querySelector("input")!;
      fireEvent.input(input, { target: { value: "사" } });

      await waitFor(() => {
        expect(document.querySelector("[data-combobox-item]")).not.toBeNull();
      });

      const item = document.querySelector("[data-combobox-item]") as HTMLElement;
      fireEvent.click(item);

      expect(handleChange).toHaveBeenCalledWith({ id: 1, name: "사과" });
    });
  });

  describe("debounce", () => {
    it("calls loadItems after debounce delay", async () => {
      const loadItems = vi.fn(() => Promise.resolve([{ id: 1, name: "결과" }]));

      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Combobox
            loadItems={loadItems}
            debounceMs={50}
            renderValue={(v: { name: string }) => <>{v.name}</>}
          />
        </I18nProvider></ConfigProvider>
      ));

      const input = container.querySelector("input")!;
      fireEvent.input(input, { target: { value: "검색어" } });

      // loadItems is called after debounce
      await waitFor(
        () => {
          expect(loadItems).toHaveBeenCalledWith("검색어");
        },
        { timeout: 200 },
      );
    });
  });

  describe("allowCustomValue", () => {
    it("allows entering custom value with Enter when allowCustomValue is true", () => {
      const handleChange = vi.fn();
      const loadItems = vi.fn(() => Promise.resolve([]));

      const { container, getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Combobox
            loadItems={loadItems}
            onValueChange={handleChange}
            allowCustomValue
            renderValue={(v) => <>{v}</>}
          />
        </I18nProvider></ConfigProvider>
      ));

      const input = container.querySelector("input")!;
      fireEvent.input(input, { target: { value: "새로운 값" } });
      fireEvent.keyDown(getByRole("combobox"), { key: "Enter" });

      expect(handleChange).toHaveBeenCalledWith("새로운 값");
    });

    it("transforms custom value using parseCustomValue", () => {
      const handleChange = vi.fn();
      const loadItems = vi.fn(() => Promise.resolve([]));

      const { container, getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Combobox
            loadItems={loadItems}
            onValueChange={handleChange}
            allowCustomValue
            parseCustomValue={(text) => ({ name: text, custom: true })}
            renderValue={(v: { name: string }) => <>{v.name}</>}
          />
        </I18nProvider></ConfigProvider>
      ));

      const input = container.querySelector("input")!;
      fireEvent.input(input, { target: { value: "테스트" } });
      fireEvent.keyDown(getByRole("combobox"), { key: "Enter" });

      expect(handleChange).toHaveBeenCalledWith({ name: "테스트", custom: true });
    });
  });

  describe("validation", () => {
    it("sets error message when required and value is empty", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Combobox
            loadItems={mockLoadItems}
            required
            value={undefined}
            renderValue={(v) => <>{v}</>}
          />
        </I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("This is a required field");
    });

    it("is valid when required and value exists", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Combobox
            loadItems={mockLoadItems}
            required
            value="선택된 값"
            renderValue={(v) => <>{v}</>}
          />
        </I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message returned by validate function", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Combobox
            loadItems={mockLoadItems}
            validate={(v) => (v === "invalid-val" ? "허용되지 않는 값입니다" : undefined)}
            value="invalid-val"
            renderValue={(v) => <>{v}</>}
          />
        </I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("허용되지 않는 값입니다");
    });

    it("is valid when validate function returns undefined", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Combobox
            loadItems={mockLoadItems}
            validate={(v) => (v === "invalid-val" ? "허용되지 않는 값입니다" : undefined)}
            value="valid-val"
            renderValue={(v) => <>{v}</>}
          />
        </I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });
  });
});
