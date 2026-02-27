import { render, waitFor } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { DialogProvider } from "../../../../src/components/disclosure/DialogProvider";
import { useDialog } from "../../../../src/components/disclosure/DialogContext";
import { AddressSearchContent } from "../../../../src/components/features/address/AddressSearch";

function TestApp() {
  const dialog = useDialog();

  return (
    <button
      data-testid="open-btn"
      onClick={() => {
        void dialog.show(() => <AddressSearchContent />, {
          header: "주소 검색",
        });
      }}
    >
      주소 검색 열기
    </button>
  );
}

describe("AddressSearchContent", () => {
  it("mounts and renders Daum Postcode widget inside content area", async () => {
    const { getByTestId } = render(() => (
      <DialogProvider>
        <TestApp />
      </DialogProvider>
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
