import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  output,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { SdBusyContainerControl } from "../controls/sd-busy-container.control";
import { ISdModal } from "../providers/sd-modal.provider";
import { $signal } from "../utils/bindings/$signal";

@Component({
  selector: "sd-address-search-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdBusyContainerControl],
  template: `
    <sd-busy-container [busy]="!initialized()">
      <div #content style="min-height: 100px;"></div>
    </sd-busy-container>
  `,
})
export class SdAddressSearchModal implements ISdModal<IAddress>, OnInit {
  contentElRef = viewChild.required<"content", ElementRef<HTMLElement>>("content", {
    read: ElementRef,
  });

  close = output<IAddress>();

  initialized = $signal(false);

  async ngOnInit() {
    if (!document.getElementById("daum_address")) {
      await new Promise<void>((resolve) => {
        const scriptEl = document.createElement("script");
        // scriptEl.async = true;
        scriptEl.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
        scriptEl.setAttribute("id", "daum_address");

        scriptEl.onload = (): void => {
          // @ts-expect-error
          daum.postcode.load(() => {
            resolve();
          });
        };
        document.head.appendChild(scriptEl);
      });
    }

    const contentEl = this.contentElRef().nativeElement;

    // @ts-expect-error
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

        this.close.emit({
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

    this.initialized.set(true);
  }
}

interface IAddress {
  postNumber: string | undefined;
  address: string | undefined;
  buildingName: string | undefined;
}
