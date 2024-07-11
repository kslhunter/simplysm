import {ChangeDetectionStrategy, Component, ElementRef, inject, Input, ViewEncapsulation} from "@angular/core";

@Component({
  selector: "sd-print-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content/>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    sd-print-page {
      display: block;
      break-after: page;
      page-break-after: always;

      &[sd-orientation=portrait] {
        width: 595.28pt;
        height: 841.89pt;
      }

      &[sd-orientation=landscape] {
        width: 841.89pt;
        height: 595.28pt;
      }
    }
  `],
  host: {
    "[attr.sd-orientation]": "orientation"
  }
})
export class SdPrintPageControl {
  elRef = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input() orientation: "portrait" | "landscape" = "portrait";
}
