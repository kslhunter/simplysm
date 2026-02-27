import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSignal } from "solid-js";
import { Select } from "../../../../src/components/form-control/select/Select";
import { I18nProvider } from "../../../../src/providers/i18n/I18nContext";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

describe("Select component", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  afterEach(() => {
    localStorage.removeItem("test.i18n-locale");
  });

  describe("basic rendering", () => {
    it("renders trigger", () => {
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      expect(getByRole("combobox")).not.toBeNull();
    });

    it("displays placeholder", () => {
      const { getByText } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select placeholder="Please select" renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      expect(getByText("Please select")).not.toBeNull();
    });
  });

  describe("dropdown opening/closing", () => {
    it("opens dropdown on trigger click", async () => {
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        const dropdown = document.querySelector("[data-dropdown]");
        expect(dropdown).not.toBeNull();
        // Verify dropdown content
        const selectItem = dropdown?.querySelector("[data-select-item]");
        expect(selectItem).not.toBeNull();
      });
    });

    it("changes value and closes dropdown when item is selected", async () => {
      const [value, setValue] = createSignal<string | undefined>();
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select value={value()} onValueChange={setValue} renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const selectItem = document.querySelector("[data-select-item]") as HTMLElement;
      fireEvent.click(selectItem);

      // Value changed
      expect(value()).toBe("apple");
      // aria-expanded becomes false (close triggered)
      expect(getByRole("combobox").getAttribute("aria-expanded")).toBe("false");
    });
  });

  describe("single selection", () => {
    it("calls onValueChange when item is selected", async () => {
      const handleChange = vi.fn();
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select onValueChange={handleChange} renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const selectItem = document.querySelector("[data-select-item]") as HTMLElement;
      fireEvent.click(selectItem);
      expect(handleChange).toHaveBeenCalledWith("apple");
    });

    it("displays selected value in trigger", () => {
      const [value, setValue] = createSignal<string | undefined>("apple");

      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select value={value()} onValueChange={setValue} renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
          <Select.Item value="banana">바나나</Select.Item>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      expect(getByRole("combobox").textContent).toContain("apple");
    });
  });

  describe("multiple selection", () => {
    it("allows selecting multiple items in multiple mode", async () => {
      const [value, setValue] = createSignal<string[]>([]);
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select<string>
          multiple
          value={value()}
          onValueChange={(v) => setValue(v)}
          renderValue={(v) => <>{v}</>}
        >
          <Select.Item value="apple">사과</Select.Item>
          <Select.Item value="banana">바나나</Select.Item>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const selectItems = document.querySelectorAll("[data-select-item]");
      fireEvent.click(selectItems[0]);
      expect(value()).toEqual(["apple"]);

      fireEvent.click(selectItems[1]);
      expect(value()).toEqual(["apple", "banana"]);
    });

    it("does not close dropdown when item is selected in multiple mode", async () => {
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select multiple renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const selectItem = document.querySelector("[data-select-item]") as HTMLElement;
      fireEvent.click(selectItem);

      // dropdown remains open
      expect(document.querySelector("[data-dropdown]")).not.toBeNull();
    });
  });

  describe("sub components", () => {
    it("renders Select.Action", () => {
      const handleClick = vi.fn();
      const { getByText } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
          <Select.Action onClick={handleClick}>+</Select.Action>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      expect(getByText("+")).not.toBeNull();
      fireEvent.click(getByText("+"));
      expect(handleClick).toHaveBeenCalled();
    });

    it("renders Select.Header at top of dropdown", async () => {
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select renderValue={(v) => <>{v}</>}>
          <Select.Header>
            <div data-testid="header">Header Area</div>
          </Select.Header>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        const dropdown = document.querySelector("[data-dropdown]");
        expect(dropdown).not.toBeNull();
        const header = dropdown?.querySelector("[data-testid='header']");
        expect(header).not.toBeNull();
        expect(header?.textContent).toBe("Header Area");
      });
    });
  });

  describe("disabled state", () => {
    it("does not respond to trigger click when disabled", () => {
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select disabled renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      fireEvent.click(getByRole("combobox"));

      expect(document.querySelector("[data-dropdown]")).toBeNull();
    });

    it("sets aria-disabled when disabled", () => {
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select disabled renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      expect(getByRole("combobox").getAttribute("aria-disabled")).toBe("true");
    });
  });

  describe("accessibility", () => {
    it("sets role=combobox", () => {
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      expect(getByRole("combobox")).not.toBeNull();
    });

    it("sets aria-expanded=true when open", async () => {
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      const trigger = getByRole("combobox");
      expect(trigger.getAttribute("aria-expanded")).toBe("false");

      fireEvent.click(trigger);

      await waitFor(() => {
        expect(trigger.getAttribute("aria-expanded")).toBe("true");
      });
    });
  });

  describe("search functionality", () => {
    it("displays search input when getSearchText is provided", async () => {
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select
          items={["apple", "banana", "cherry"]}
          getSearchText={(item) => item}
          renderValue={(v) => <>{v}</>}
        >
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        const searchInput = document.querySelector("[data-dropdown] [data-text-field]");
        expect(searchInput).not.toBeNull();
      });
    });

    it("filters items when search text is entered", async () => {
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select
          items={["apple", "banana", "cherry"]}
          getSearchText={(item) => item}
          renderValue={(v) => <>{v}</>}
        >
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown] [data-text-field]")).not.toBeNull();
      });

      const searchInput = document.querySelector("[data-dropdown] [data-text-field] input") as HTMLInputElement;
      fireEvent.input(searchInput, { target: { value: "ban" } });

      await waitFor(() => {
        const items = document.querySelectorAll("[data-select-item]");
        // unset + banana = 2
        expect(items.length).toBe(2);
        expect(items[0].textContent).toContain("Unset");
        expect(items[1].textContent).toContain("banana");
      });
    });

    it("searches with space-separated AND matching", async () => {
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select
          items={["red apple", "green apple", "banana"]}
          getSearchText={(item) => item}
          renderValue={(v) => <>{v}</>}
        >
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown] [data-text-field]")).not.toBeNull();
      });

      const searchInput = document.querySelector("[data-dropdown] [data-text-field] input") as HTMLInputElement;
      fireEvent.input(searchInput, { target: { value: "red apple" } });

      await waitFor(() => {
        const items = document.querySelectorAll("[data-select-item]");
        // unset + red apple = 2
        expect(items.length).toBe(2);
        expect(items[0].textContent).toContain("Unset");
        expect(items[1].textContent).toContain("red apple");
      });
    });

    it("does not display search input when getSearchText is not provided", async () => {
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select items={["apple", "banana"]} renderValue={(v) => <>{v}</>}>
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      expect(document.querySelector("[data-dropdown] [data-text-field]")).toBeNull();
    });
  });

  describe("unspecified item", () => {
    it("displays unspecified item for single selection without required", async () => {
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select items={["apple", "banana"]} renderValue={(v) => <>{v}</>}>
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const items = document.querySelectorAll("[data-select-item]");
      // unset + apple + banana = 3
      expect(items.length).toBe(3);
      expect(items[0].textContent).toContain("Unset");
    });

    it("does not display unspecified item when required", async () => {
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select items={["apple", "banana"]} required renderValue={(v) => <>{v}</>}>
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const items = document.querySelectorAll("[data-select-item]");
      // apple + banana = 2 (no unset)
      expect(items.length).toBe(2);
    });

    it("does not display unspecified item in multiple selection", async () => {
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select multiple items={["apple", "banana"]} renderValue={(v) => <>{v}</>}>
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const items = document.querySelectorAll("[data-select-item]");
      // apple + banana = 2 (no unset)
      expect(items.length).toBe(2);
    });
  });

  describe("select all/deselect all", () => {
    it("displays select all/deselect all button in multiple mode", async () => {
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select multiple items={["apple", "banana", "cherry"]} renderValue={(v) => <>{v}</>}>
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-select-all]")).not.toBeNull();
        expect(document.querySelector("[data-deselect-all]")).not.toBeNull();
      });
    });

    it("selects all items when select all button is clicked", async () => {
      const [value, setValue] = createSignal<string[]>([]);
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select<string>
          multiple
          items={["apple", "banana", "cherry"]}
          value={value()}
          onValueChange={setValue}
          renderValue={(v) => <>{v}</>}
        >
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-select-all]")).not.toBeNull();
      });

      const selectAllBtn = document.querySelector("[data-select-all]") as HTMLElement;
      fireEvent.click(selectAllBtn);

      expect(value()).toEqual(["apple", "banana", "cherry"]);
    });

    it("deselects all items when deselect all button is clicked", async () => {
      const [value, setValue] = createSignal<string[]>(["apple", "banana"]);
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select<string>
          multiple
          items={["apple", "banana", "cherry"]}
          value={value()}
          onValueChange={setValue}
          renderValue={(v) => <>{v}</>}
        >
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-deselect-all]")).not.toBeNull();
      });

      const deselectAllBtn = document.querySelector("[data-deselect-all]") as HTMLElement;
      fireEvent.click(deselectAllBtn);

      expect(value()).toEqual([]);
    });

    it("does not display select all/deselect all button when hideSelectAll is set", async () => {
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select multiple hideSelectAll items={["apple", "banana"]} renderValue={(v) => <>{v}</>}>
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      expect(document.querySelector("[data-select-all]")).toBeNull();
      expect(document.querySelector("[data-deselect-all]")).toBeNull();
    });

    it("does not display select all/deselect all button in single selection mode", async () => {
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select items={["apple", "banana"]} renderValue={(v) => <>{v}</>}>
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      expect(document.querySelector("[data-select-all]")).toBeNull();
    });
  });

  describe("hiding handling", () => {
    it("hides items where getIsHidden is true", async () => {
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select
          items={["apple", "banana", "cherry"]}
          getIsHidden={(item) => item === "banana"}
          renderValue={(v) => <>{v}</>}
        >
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const items = document.querySelectorAll("[data-select-item]");
      const texts = Array.from(items).map((el) => el.textContent);
      // unset + apple + cherry (banana hidden)
      expect(texts).toContain("Unset");
      expect(texts.some((t) => t.includes("apple"))).toBe(true);
      expect(texts.some((t) => t.includes("cherry"))).toBe(true);
      expect(texts.some((t) => t.includes("banana"))).toBe(false);
    });

    it("displays hidden selected item with strikethrough", async () => {
      const { getByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select
          items={["apple", "banana", "cherry"]}
          getIsHidden={(item) => item === "banana"}
          value="banana"
          renderValue={(v) => <>{v}</>}
        >
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
        </I18nProvider></ConfigProvider>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const items = document.querySelectorAll("[data-select-item]");
      const bananaItem = Array.from(items).find((el) => el.textContent.includes("banana"));
      expect(bananaItem).not.toBeNull();
      // Verify strikethrough style
      expect(bananaItem!.classList.contains("line-through")).toBe(true);
    });
  });

  describe("validation", () => {
    it("sets error message when required and value is empty", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select required value={undefined} renderValue={(v) => <>{v}</>}>
          <Select.Item value="a">Option A</Select.Item>
        </Select>
        </I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("This is a required field");
    });

    it("is valid when required and value exists", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select required value="a" renderValue={(v) => <>{v}</>}>
          <Select.Item value="a">Option A</Select.Item>
        </Select>
        </I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("sets error message when validate function returns error", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select
          validate={(v) => (v === "invalid-val" ? "Value is not allowed" : undefined)}
          value="invalid-val"
          renderValue={(v) => <>{v}</>}
        >
          <Select.Item value="invalid-val">Invalid</Select.Item>
        </Select>
        </I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("Value is not allowed");
    });

    it("is valid when validate function returns undefined", () => {
      const { container } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Select
          validate={(v) => (v === "invalid-val" ? "Value is not allowed" : undefined)}
          value="valid-val"
          renderValue={(v) => <>{v}</>}
        >
          <Select.Item value="valid-val">Valid</Select.Item>
        </Select>
        </I18nProvider></ConfigProvider>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });
  });
});
