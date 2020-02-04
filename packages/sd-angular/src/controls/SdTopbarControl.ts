import {ChangeDetectionStrategy, Component, forwardRef, Inject} from "@angular/core";
import {SdSidebarContainerControl} from "./SdSidebarContainerControl";

@Component({
  selector: "sd-topbar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="_sidebar-toggle-button" (click)="onSidebarToggleButtonClick()" style="font-size: 16px;"
       *ngIf="sidebarContainerControl">
      <sd-icon icon="bars" fixedWidth></sd-icon>
    </a>
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      position: absolute;
      z-index: var(--z-index-topbar);
      top: 0;
      left: 0;
      width: 100%;
      height: var(--sd-topbar-height);
      background: var(--theme-color-primary-default);
      color: var(--text-brightness-rev-default);
      overflow-x: auto;
      overflow-y: hidden;
      white-space: nowrap;
      line-height: var(--sd-topbar-height);

      @each $h in (h1, h2, h3, h4, h5, h6) {
        > /deep/ #{$h} {
          display: inline-block;
          vertical-align: top;
          line-height: var(--sd-topbar-height);
          margin-right: var(--gap-default);
        }
      }

      &::-webkit-scrollbar-track {
        background-color: rgba(0, 0, 0, .1);
      }

      &::-webkit-scrollbar-corner {
        background-color: rgba(0, 0, 0, .1);
      }

      &::-webkit-scrollbar {
        width: var(--gap-sm);
        height: var(--gap-sm);
        background-color: rgba(0, 0, 0, 0);
      }

      &::-webkit-scrollbar-thumb {
        background-color: rgba(0, 0, 0, .2);
      }

      > ._sidebar-toggle-button {
        display: inline-block;
        vertical-align: top;
        min-width: var(--sd-topbar-height);
        text-align: center;
        margin-right: var(--gap-default);
        color: var(--text-brightness-rev-dark);
        cursor: pointer;

        &:hover {
          background: rgba(0, 0, 0, .2);
          color: var(--text-brightness-rev-default);
        }
      }
    }
  `]
})
export class SdTopbarControl {
  public constructor(@Inject(forwardRef(() => SdSidebarContainerControl))
                     public sidebarContainerControl?: SdSidebarContainerControl) {
  }

  public onSidebarToggleButtonClick(): void {
    this.sidebarContainerControl!.toggle = !this.sidebarContainerControl!.toggle;
  }
}
