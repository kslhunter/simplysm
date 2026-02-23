import { render, waitFor } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { DialogProvider } from "../../../src/components/disclosure/DialogProvider";
import { useDialog } from "../../../src/components/disclosure/DialogContext";
import { AddressSearchContent } from "../../../src/features/address/AddressSearch";

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
  it("마운트 시 Daum Postcode 위젯이 content 영역에 렌더된다", async () => {
    const { getByTestId } = render(() => (
      <DialogProvider>
        <TestApp />
      </DialogProvider>
    ));

    getByTestId("open-btn").click();

    // Daum Postcode 스크립트 로드 + 위젯 embed 대기
    await waitFor(
      () => {
        const content = document.querySelector("[data-address-content]");
        expect(content).not.toBeNull();
        // Daum Postcode 위젯이 embed되면 content 내부에 자식 요소가 생긴다
        expect(content!.children.length).toBeGreaterThan(0);
      },
      { timeout: 10000 },
    );
  });
});
