import { ChangeDetectionStrategy, Component, ElementRef } from "@angular/core";
import { SdModalBase } from "../providers/SdModalProvider";

@Component({
  selector: "sd-address-search-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_content" style="min-height: 100px;"></div>
  `
})
export class SdAddressSearchModal extends SdModalBase<undefined, IAddress> {
  public constructor(private readonly _elRef: ElementRef<HTMLElement>) {
    super();
  }

  public async sdOnOpen(param: undefined): Promise<void> {
    const run = () => {
      const contentEl = this._elRef.nativeElement.firstChild! as HTMLDivElement;

      // @ts-ignore
      daum.postcode.load(() => {
        // @ts-ignore
        new daum.Postcode({
          oncomplete: (data: any) => {
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

            this.close({
              postNumber: data.zonecode,
              address: addr + extraAddr,
              buildingName: data.buildingName
            });
          },
          onresize: (size: any) => {
            contentEl.style.height = size.height + "px";
          },
          width: "100%",
          height: "100%"
        }).embed(contentEl, { autoClose: false });
      });
    };

    if (!document.getElementById("daum_address")) {
      const scriptEl = document.createElement("script");
      scriptEl.async = true;
      scriptEl.src = "http://dmaps.daum.net/map_js_init/postcode.v2.js?autoload=false";
      scriptEl.setAttribute("id", "daum_address");

      scriptEl.onload = () => {
        run();
      };
      document.head!.appendChild(scriptEl);
    } else {
      run();
    }
  }
}

interface IAddress {
  postNumber: string | undefined;
  address: string | undefined;
  buildingName: string | undefined;
}
