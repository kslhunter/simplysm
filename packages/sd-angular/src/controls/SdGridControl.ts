import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from "@angular/core";

@Component({
  selector: "sd-grid",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: ` <ng-content /> `,
  styles: [
    /* language=SCSS */ `
      sd-grid {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
      }
    `,
  ],
  host: {
    "[style.gap]": "gap != null ? 'var(--gap-' + gap + ')' : ''",
  },
})
export class SdGridControl {
  @Input() gap?: "xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl";
}
