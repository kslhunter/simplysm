import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";

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
  `]
})
export class SdGridControl {
  @Input()
  gap?: "xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl";

  @HostBinding("style.grid-gap")
  get styleGridGap() {
    return this.gap != null ? `var(--gap-${this.gap})` : undefined;
  }
}