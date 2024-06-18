import {ChangeDetectionStrategy, Component, Input} from "@angular/core";

@Component({
  selector: "sd-grid",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <ng-content/>`,
  styles: [/* language=SCSS */ `
    :host {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
    }
  `],
  host: {
    "[style.gap]": "gap != null ? 'var(--gap-' + gap + ')' : ''"
  }
})
export class SdGridControl {
  @Input() gap?: "xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl";
}