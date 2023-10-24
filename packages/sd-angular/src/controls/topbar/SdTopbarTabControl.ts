import {ChangeDetectionStrategy, Component, EventEmitter, Output} from "@angular/core";
import {faXmark} from "@fortawesome/pro-solid-svg-icons";

@Component({
  selector: "sd-topbar-tab",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>
    <sd-anchor (click)="onCloseButtonClick($event)">
      <sd-icon [icon]="faXmark" fixedWidth/>
    </sd-anchor>`,
  styles: [/* language=SCSS */ `
    :host {
      display: inline-block;
      padding: 0 var(--gap-lg);
      cursor: pointer;
      line-height: calc(var(--topbar-height-sm) - var(--gap-sm) - 2px);
      vertical-align: bottom;
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
        background: white;
        font-weight: bold;
      }
    }
  `]
})
export class SdTopbarTabControl {
  @Output()
  clickClose = new EventEmitter<MouseEvent>();

  onCloseButtonClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    this.clickClose.emit(event);
  }

  protected readonly faXmark = faXmark;
}
