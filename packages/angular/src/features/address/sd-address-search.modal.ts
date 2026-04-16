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

declare const daum:
  | {
      postcode: {
        load(callback: () => void): void;
      };
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeData) => void;
        onresize: (size: { height: number }) => void;
        width: string;
        height: string;
      }) => { embed(el: HTMLElement, options: { autoClose: boolean }): void };
    }
  | undefined;

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

function loadDaumPostcodeScript(): Promise<void> {
  const existing = document.getElementById("daum_address");
  if (existing != null) {
    if (typeof daum !== "undefined") {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      existing.addEventListener(
        "load",
        () => {
          daum!.postcode.load(() => {
            resolve();
          });
        },
        { once: true },
      );
      existing.addEventListener(
        "error",
        () => {
          existing.remove();
          reject(new Error("주소 검색 스크립트를 불러올 수 없습니다."));
        },
        { once: true },
      );
    });
  }

  return new Promise<void>((resolve, reject) => {
    const scriptEl = document.createElement("script");
    scriptEl.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    scriptEl.setAttribute("id", "daum_address");

    scriptEl.onload = (): void => {
      daum!.postcode.load(() => {
        resolve();
      });
    };
    scriptEl.onerror = (): void => {
      scriptEl.remove();
      reject(new Error("주소 검색 스크립트를 불러올 수 없습니다."));
    };
    document.head.appendChild(scriptEl);
  });
}

@Component({
  selector: "sd-address-search-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdBusyContainer],
  template: `
    <sd-busy-container [busy]="!initialized()">
      @if (errorMessage() != null) {
        <div class="_error">{{ errorMessage() }}</div>
      } @else {
        <div #content style="min-height: 100px;"></div>
      }
    </sd-busy-container>
  `,
})
export class SdAddressSearchModal implements SdModalContentDef<Address>, OnInit {
  contentElRef = viewChild<"content", ElementRef<HTMLElement>>("content", {
    read: ElementRef,
  });

  close = output<Address>();

  initialized = signal(false);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    void this._initAsync();
  }

  private async _initAsync() {
    try {
      await loadDaumPostcodeScript();
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : String(err));
      this.initialized.set(true);
      return;
    }

    const contentElRef = this.contentElRef();
    if (contentElRef == null) return;
    const contentEl = contentElRef.nativeElement;

    new daum!.Postcode({
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
