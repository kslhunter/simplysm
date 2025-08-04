import { ChangeDetectionStrategy, Component, ViewEncapsulation } from "@angular/core";

/** @deprecated */
@Component({
  selector: "sd-topbar-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      @use "sass:map";

      @use "../scss/variables";
      @use "../scss/mixins";

      sd-topbar-menu {
        display: flex;
        flex-wrap: nowrap;
        flex-direction: row;
        flex-grow: 1;
        gap: var(--gap-sm);
        padding-right: var(--gap-default);

        body.sd-theme-mobile & {
          justify-content: end;
          padding-right: 0;
        }
      }
    `,
  ],
  template: `
    <ng-content></ng-content>
  `,
})
export class SdTopbarMenuControl {}
