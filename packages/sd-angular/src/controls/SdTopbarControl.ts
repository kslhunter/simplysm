import {ChangeDetectionStrategy, Component, ElementRef, forwardRef, HostListener, inject, Input} from "@angular/core";
import {SdTopbarContainerControl} from "./SdTopbarContainerControl";
import {SdSidebarContainerControl} from "./SdSidebarContainerControl";
import {faArrowLeft} from "@fortawesome/pro-duotone-svg-icons";
import {ISdResizeEvent} from "../plugins/SdResizeEventPlugin";
import {SdAnchorControl} from "./SdAnchorControl";
import {NgIf} from "@angular/common";
import {SdIconControl} from "./SdIconControl";
import {SdGapControl} from "./SdGapControl";

@Component({
  selector: "sd-topbar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    SdAnchorControl,
    NgIf,
    SdIconControl,
    SdGapControl
  ],
  template: `
    <sd-anchor class="_sidebar-toggle-button" (click)="onSidebarToggleButtonClick()"
               *ngIf="hasSidebar">
      <sd-icon [icon]="faArrowLeft" fixedWidth/>
    </sd-anchor>

    <div class="_nav">
      <ng-content select="sd-topbar-nav"/>
    </div>

    <sd-gap width="default" *ngIf="!hasSidebar"></sd-gap>
    <ng-content/>
    <div class="_menu">
      <ng-content select="sd-topbar-menu"/>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    :host {
      display: block;
      position: absolute;
      z-index: var(--z-index-topbar);
      top: 0;
      left: 0;
      width: 100%;
      height: var(--topbar-height);
      overflow-x: auto;
      overflow-y: hidden;
      white-space: nowrap;
      line-height: var(--topbar-height);
      user-select: none;

      body.sd-theme-compact & {
        background: var(--theme-primary-default);
        color: var(--text-trans-rev-default);
      }

      body.sd-theme-mobile &,
      body.sd-theme-kiosk &,
      body.sd-theme-modern & {
        background: var(--background-color);
        color: var(--text-trans-default);
      }

      > ._nav {
        display: inline-block;
        height: var(--topbar-height);
        white-space: nowrap;
        vertical-align: top;
      }

      @each $h in (h1, h2, h3, h4, h5, h6) {
        > ::ng-deep #{$h} {
          display: inline-block;
          vertical-align: top;
          line-height: var(--topbar-height);
          margin-right: var(--gap-xxl);
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
        text-align: center;
        margin-right: var(--gap-default);
        cursor: pointer;

        body.sd-theme-compact & {
          color: var(--text-trans-rev-dark);
          min-width: var(--topbar-height);
          font-size: 16px;

          &:hover {
            background: rgba(0, 0, 0, .1);
            color: var(--text-trans-rev-default);
          }
        }

        body.sd-theme-modern &,
        body.sd-theme-mobile &,
        body.sd-theme-kiosk & {
          color: var(--text-trans-lighter);
          font-size: 12px;
          line-height: var(--line-height);
          padding: var(--gap-xs) var(--gap-sm);
          margin: var(--gap-xxs);
          border-radius: var(--border-radius-default);
          
          @include active-effect(true);

          &:hover {
            color: var(--text-trans-light);
          }
        }
      }

      > ._menu {
        display: inline-block;

        body.sd-theme-mobile &,
        body.sd-theme-kiosk & {
          float: right;
        }
      }
    }
  `]
})
export class SdTopbarControl {
  #elRef: ElementRef<HTMLElement> = inject(ElementRef);
  #parentSidebarContainerControl = inject(SdSidebarContainerControl, {optional: true});
  #topbarContainerControl: SdTopbarContainerControl = inject(forwardRef(() => SdTopbarContainerControl));

  @Input()
  sidebarContainer?: SdSidebarContainerControl;

  get hasSidebar(): boolean {
    return !!this.sidebarContainer || !!this.#parentSidebarContainerControl;
  }

  onSidebarToggleButtonClick() {
    const sidebarContainerControl = this.sidebarContainer ?? this.#parentSidebarContainerControl;
    sidebarContainerControl!.toggle = !sidebarContainerControl!.toggle;
  }

  @HostListener("sdResize.outside", ["$event"])
  onResizeOutside(event: ISdResizeEvent) {
    if (!event.heightChanged) return;

    this.#redrawOutside();
  }

  #redrawOutside() {
    this.#topbarContainerControl.elRef.nativeElement.style.paddingTop = this.#elRef.nativeElement.offsetHeight + "px";
  }

  protected readonly faArrowLeft = faArrowLeft;
}

