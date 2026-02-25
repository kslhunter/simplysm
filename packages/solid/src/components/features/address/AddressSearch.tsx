import { type Component, createSignal, onMount } from "solid-js";
import { BusyContainer } from "../../feedback/busy/BusyContainer";
import { useDialogInstance } from "../../disclosure/DialogInstanceContext";

export interface AddressSearchResult {
  postNumber: string | undefined;
  address: string | undefined;
  buildingName: string | undefined;
}

export const AddressSearchContent: Component = () => {
  const dialogInstance = useDialogInstance<AddressSearchResult>();

  const [initialized, setInitialized] = createSignal(false);
  let contentEl!: HTMLDivElement;

  onMount(async () => {
    if (!document.getElementById("daum_address")) {
      await new Promise<void>((resolve) => {
        const scriptEl = document.createElement("script");
        scriptEl.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
        scriptEl.setAttribute("id", "daum_address");

        scriptEl.onload = (): void => {
          // @ts-expect-error -- Daum Postcode global API
          daum.postcode.load(() => {
            resolve();
          });
        };
        document.head.appendChild(scriptEl);
      });
    }

    // @ts-expect-error -- Daum Postcode global API
    new daum.Postcode({
      oncomplete: (data: any): void => {
        const addr = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;

        let extraAddr = "";
        if (data.userSelectedType === "R") {
          if (data.bname !== "" && /[동로가]$/g.test(data.bname)) {
            extraAddr += data.bname;
          }

          if (data.buildingName !== "" && data.apartment === "Y") {
            extraAddr += extraAddr !== "" ? ", " + data.buildingName : data.buildingName;
          }

          if (extraAddr !== "") {
            extraAddr = " (" + extraAddr + ")";
          }
        }

        dialogInstance?.close({
          postNumber: data.zonecode,
          address: addr + extraAddr,
          buildingName: data.buildingName,
        });
      },
      onresize: (size: any): void => {
        contentEl.style.height = size.height + "px";
      },
      width: "100%",
      height: "100%",
    }).embed(contentEl, { autoClose: false });

    setInitialized(true);
  });

  return (
    <BusyContainer busy={!initialized()}>
      <div ref={contentEl} data-address-content style={{ "min-height": "100px" }} />
    </BusyContainer>
  );
};
