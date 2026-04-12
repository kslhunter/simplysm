import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  output,
  signal,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import type { OnInit } from "@angular/core";
import { SdBusyContainer } from "../../core/busy/sd-busy-container";
import type { SdModalContentDef } from "../../core/modal/sd-modal.provider";

declare const daum: {
  postcode: {
    load(callback: () => void): void;
  };
  Postcode: new (options: {
    oncomplete: (data: DaumPostcodeData) => void;
    onresize: (size: { height: number }) => void;
    width: string;
    height: string;
  }) => { embed(el: HTMLElement, options: { autoClose: boolean }): void };
};

interface DaumPostcodeData {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  userSelectedType: "R" | "J";
  bname: string;
  buildingName: string;
  apartment: "Y" | "N";
}

export interface Address {
  postNumber: string | undefined;
  address: string | undefined;
  buildingName: string | undefined;
}

@Component({
  selector: "sd-address-search-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdBusyContainer],
  template: `
    <sd-busy-container [busy]="!initialized()">
      <div #content style="min-height: 100px;"></div>
    </sd-busy-container>
  `,
})
export class SdAddressSearchModal implements SdModalContentDef<Address>, OnInit {
  contentElRef = viewChild.required<"content", ElementRef<HTMLElement>>("content", {
    read: ElementRef,
  });

  close = output<Address>();

  initialized = signal(false);

  ngOnInit() {
    void this._initAsync();
  }

  private async _initAsync() {
    if (!document.getElementById("daum_address")) {
      await new Promise<void>((resolve, reject) => {
        const scriptEl = document.createElement("script");
        scriptEl.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
        scriptEl.setAttribute("id", "daum_address");

        scriptEl.onload = (): void => {
          daum.postcode.load(() => {
            resolve();
          });
        };
        scriptEl.onerror = (): void => {
          reject(new Error("주소 검색 스크립트를 불러올 수 없습니다."));
        };
        document.head.appendChild(scriptEl);
      });
    }

    const contentEl = this.contentElRef().nativeElement;

    new daum.Postcode({
      oncomplete: (data: DaumPostcodeData): void => {
        const addr = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;

        let extraAddr = "";
        if (data.userSelectedType === "R") {
          if (data.bname !== "" && /[동로가]$/.test(data.bname)) {
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
      onresize: (size: { height: number }): void => {
        contentEl.style.height = size.height + "px";
      },
      width: "100%",
      height: "100%",
    }).embed(contentEl, { autoClose: false });

    this.initialized.set(true);
  }
}
