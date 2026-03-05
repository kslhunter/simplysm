import { render } from "@solidjs/testing-library";
import { describe, it, expect, beforeEach } from "vitest";
import { FieldShell } from "../../../../src/components/form-control/field/FieldShell";
import { I18nProvider } from "../../../../src/providers/i18n/I18nProvider";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

// Minimal wrapperClass stub — returns a predictable class string.
// The real getFieldWrapperClass (Field.styles.ts) generates Tailwind classes
// based on size/disabled/inset options.
const stubWrapperClass = (_includeCustom: boolean) => "wrapper-class";

function wrap(ui: () => import("solid-js").JSX.Element) {
  return render(() => <ConfigProvider clientName="test"><I18nProvider>{ui()}</I18nProvider></ConfigProvider>);
}

describe("FieldShell", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  it("renders displayContent when standalone-readonly", () => {
    const { container } = wrap(() => (
      <FieldShell
        errorMsg={undefined}
        invalidVariant="border"
        inset={false}
        isEditable={false}
        wrapperClass={stubWrapperClass}
        dataAttr="data-test-field"
        readonlyExtraClass="sd-test-field"
        displayContent={<span>readonly-text</span>}
      >
        <input type="text" />
      </FieldShell>
    ));
    const div = container.querySelector("[data-test-field]") as HTMLElement;
    expect(div).toBeTruthy();
    expect(div.classList.contains("sd-test-field")).toBe(true);
    expect(div.textContent).toContain("readonly-text");
    expect(container.querySelector("input:not([aria-hidden])")).toBeFalsy();
  });

  it("renders children when standalone-editable", () => {
    const { container } = wrap(() => (
      <FieldShell
        errorMsg={undefined}
        invalidVariant="border"
        inset={false}
        isEditable={true}
        wrapperClass={stubWrapperClass}
        dataAttr="data-test-field"
        displayContent={<span>readonly-text</span>}
      >
        <input type="text" data-testid="my-input" />
      </FieldShell>
    ));
    const input = container.querySelector("[data-testid='my-input']");
    expect(input).toBeTruthy();
    expect(container.textContent).not.toContain("readonly-text");
  });

  it("renders inset sizing + overlay when inset-editable", () => {
    const { container } = wrap(() => (
      <FieldShell
        errorMsg={undefined}
        invalidVariant="dot"
        inset={true}
        isEditable={true}
        wrapperClass={stubWrapperClass}
        dataAttr="data-test-field"
        displayContent={<span>sizing-text</span>}
      >
        <input type="text" data-testid="my-input" />
      </FieldShell>
    ));
    const outer = container.querySelector("[data-test-field]") as HTMLElement;
    expect(outer.classList.contains("relative")).toBe(true);

    const sizingDiv = outer.querySelector("[data-test-field-content]") as HTMLElement;
    expect(sizingDiv).toBeTruthy();
    expect(sizingDiv.style.visibility).toBe("hidden");

    const input = outer.querySelector("[data-testid='my-input']");
    expect(input).toBeTruthy();
  });

  it("renders inset sizing visible when inset-readonly", () => {
    const { container } = wrap(() => (
      <FieldShell
        errorMsg={undefined}
        invalidVariant="dot"
        inset={true}
        isEditable={false}
        wrapperClass={stubWrapperClass}
        dataAttr="data-test-field"
        displayContent={<span>visible-text</span>}
      >
        <input type="text" />
      </FieldShell>
    ));
    const sizingDiv = container.querySelector("[data-test-field-content]") as HTMLElement;
    expect(sizingDiv).toBeTruthy();
    expect(sizingDiv.style.visibility).toBe("");
    expect(sizingDiv.textContent).toContain("visible-text");
    expect(container.querySelector("input:not([aria-hidden])")).toBeFalsy();
  });

  it("uses renderSizing for sizing content when provided", () => {
    const { container } = wrap(() => (
      <FieldShell
        errorMsg={undefined}
        invalidVariant="dot"
        inset={true}
        isEditable={true}
        wrapperClass={stubWrapperClass}
        dataAttr="data-test-field"
        displayContent={<span>display</span>}
        renderSizing={() => <span>custom-sizing</span>}
      >
        <input type="text" />
      </FieldShell>
    ));
    const sizingDiv = container.querySelector("[data-test-field-content]") as HTMLElement;
    expect(sizingDiv.textContent).toContain("custom-sizing");
    expect(sizingDiv.textContent).not.toContain("display");
  });
});
