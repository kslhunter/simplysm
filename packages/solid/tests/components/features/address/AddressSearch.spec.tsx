import { render, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, beforeEach } from "vitest";
import { DialogProvider } from "../../../../src/components/disclosure/DialogProvider";
import { useDialog } from "../../../../src/components/disclosure/DialogContext";
import { AddressSearchContent } from "../../../../src/components/features/address/AddressSearch";
import { I18nProvider } from "../../../../src/providers/i18n/I18nContext";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

function TestApp() {
  const dialog = useDialog();

  return (
    <button
      data-testid="open-btn"
      onClick={() => {
        void dialog.show(AddressSearchContent, {}, {
          header: "주소 검색",
        });
      }}
    >
      주소 검색 열기
    </button>
  );
}

describe("AddressSearchContent", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  it("mounts and renders Daum Postcode widget inside content area", async () => {
    const { getByTestId } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <DialogProvider>
          <TestApp />
        </DialogProvider>
      </I18nProvider></ConfigProvider>
    ));

    getByTestId("open-btn").click();

    // wait for Daum Postcode script load + widget embed
    await waitFor(
      () => {
        const content = document.querySelector("[data-address-content]");
        expect(content).not.toBeNull();
        // once the Daum Postcode widget is embedded, content has child elements
        expect(content!.children.length).toBeGreaterThan(0);
      },
      { timeout: 10000 },
    );
  });
});
