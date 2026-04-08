import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdView } from "./sd-view";

@Component({
  selector: "sd-view-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-view-item {
        display: none;

        &[data-sd-selected="true"] {
          display: block;
        }

        sd-view[data-sd-fill="true"] & {
          height: 100%;
        }
      }
    `,
  ],
  template: `
    <ng-content></ng-content>
  `,
  host: {
    "[attr.data-sd-selected]": "isSelected()",
  },
})
export class SdViewItem {
  value = input<any>();

  private readonly _parentControl = inject(SdView);

  isSelected = computed(() => this._parentControl.value() === this.value());
}
