import { ChangeDetectionStrategy, Component, model, ViewEncapsulation } from "@angular/core";

@Component({
  selector: "sd-tab",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-tab {
        display: block;
        border-bottom: 2px solid var(--sd-bd-hairline);

        padding: 0 calc(var(--sd-gap-default) + 1px) 0 calc(var(--sd-gap-default) - 1px);
      }
    `,
  ],
  template: `
    <ng-content></ng-content>
  `,
})
export class SdTab<T> {
  value = model<T>();
}
