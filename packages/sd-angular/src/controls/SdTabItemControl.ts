import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  HostListener,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdTabControl } from "./SdTabControl";
import { $computed } from "../utils/$hooks";
import { $hostBinding } from "../utils/$hostBinding";

@Component({
  selector: "sd-tab-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
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
            background: rgba(0, 0, 0, 0.05);
          }

          &[sd-selected="true"] {
            background: white;
            border-color: var(--theme-grey-lighter);
          }
        }

        @media all and (pointer: coarse) {
          border-bottom: 2px solid transparent !important;
          font-weight: bold;
          color: var(--theme-grey-default);

          &[sd-selected="true"] {
            border-bottom: 3px solid var(--theme-primary-default) !important;
            color: var(--theme-primary-default);
          }
        }
      }
    `,
  ],
  template: ` <ng-content></ng-content>`,
})
export class SdTabItemControl {
  #parentControl = inject<SdTabControl>(forwardRef(() => SdTabControl));

  value = input<any>();

  isSelected$ = $computed(() => this.#parentControl.value() === this.value());

  constructor() {
    $hostBinding("attr.sd-selected", this.isSelected$);
  }

  @HostListener("click")
  onClick() {
    this.#parentControl.value.set(this.value());
  }
}
