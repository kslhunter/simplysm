import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  HostListener,
  inject,
  Input,
  ViewEncapsulation
} from "@angular/core";
import {SdTabControl} from "./SdTabControl";

@Component({
  selector: "sd-tab-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    sd-tab-item {
      display: inline-block;
      padding: var(--gap-sm) var(--gap-default);
      cursor: pointer;
      margin-bottom: -2px;

      @media not all and (pointer: coarse) {
        border-top: 2px solid transparent;
        border-left: 1px solid transparent;
        border-right: 1px solid transparent;

        &:hover {
          background: rgba(0, 0, 0, .05);
        }

        &[sd-selected=true] {
          background: white;
          border-color: var(--theme-grey-lighter);
        }
      }

      @media all and (pointer: coarse) {
        border-bottom: 2px solid transparent !important;
        font-weight: bold;
        color: var(--theme-grey-default);

        &[sd-selected=true] {
          border-bottom: 3px solid var(--theme-primary-default) !important;
          color: var(--theme-primary-default);
        }
      }
    }
  `],
  host: {
    "[attr.sd-selected]": "isSelected"
  }
})
export class SdTabItemControl {
  @Input() value?: any;

  #parentControl: SdTabControl = inject(forwardRef(() => SdTabControl));

  get isSelected(): boolean {
    return this.#parentControl.value === this.value;
  }

  @HostListener("click")
  onClick() {
    this.#parentControl.setValue(this.value);
  }
}
