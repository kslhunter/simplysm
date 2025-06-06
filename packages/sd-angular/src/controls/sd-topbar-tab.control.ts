import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
  ViewEncapsulation,
} from "@angular/core";
import { SdAnchorControl } from "./sd-anchor.control";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";

@Component({
  selector: "sd-topbar-tab",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdAnchorControl, FaIconComponent],
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
      <fa-icon [icon]="icons.xmark" [fixedWidth]="true" />
    </sd-anchor>
  `,
})
export class SdTopbarTabControl {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  clickClose = output<MouseEvent>();

  onCloseButtonClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    this.clickClose.emit(event);
  }
}
