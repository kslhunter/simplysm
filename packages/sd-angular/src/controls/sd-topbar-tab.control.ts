import { ChangeDetectionStrategy, Component, output, ViewEncapsulation } from "@angular/core";
import { SdAnchorControl } from "./sd-anchor.control";
import { SdTablerIconControl } from "./tabler-icon/sd-tabler-icon.control";
import { taBackspace } from "@simplysm/sd-tabler-icons/icons/ta-backspace";

@Component({
  selector: "sd-topbar-tab",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdAnchorControl, SdTablerIconControl],
  styles: [
    /* language=SCSS */ `
      sd-topbar-tab {
        display: inline-block;
        padding: 0 var(--gap-lg);
        cursor: pointer;
        line-height: calc(var(--topbar-height-sm) - var(--gap-sm) - 2px);
        border-top: 2px solid var(--theme-primary-darkest);
        border-left: 1px solid var(--theme-primary-darkest);
        border-right: 1px solid var(--theme-primary-darkest);
        margin-right: var(--gap-xs);
        background: var(--theme-primary-light);
        color: var(--text-trans-default);

        > sd-anchor {
          color: var(--theme-primary-default);

          &:hover {
            color: var(--theme-primary-darker);
          }
        }

        &._selected {
          background: var(--control-color);
          font-weight: bold;
        }
      }
    `,
  ],
  template: `
    <ng-content></ng-content>
    <sd-anchor (click)="onCloseButtonClick($event)">
      <sd-tabler-icon [icon]="taBackspace" />
    </sd-anchor>
  `,
})
export class SdTopbarTabControl {
  clickClose = output<MouseEvent>();

  onCloseButtonClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    this.clickClose.emit(event);
  }

  protected readonly taBackspace = taBackspace;
}
