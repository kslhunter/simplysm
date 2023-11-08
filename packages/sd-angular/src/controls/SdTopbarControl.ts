import {ChangeDetectionStrategy, Component, ElementRef, forwardRef, HostListener, inject, Input} from "@angular/core";
import {SdTopbarContainerControl} from "./SdTopbarContainerControl";
import {SdSidebarContainerControl} from "./SdSidebarContainerControl";
import {faBars} from "@fortawesome/pro-duotone-svg-icons";
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
    <sd-anchor class="_sidebar-toggle-button" (click)="onSidebarToggleButtonClick()" style="font-size: 16px;"
               *ngIf="hasSidebar">
      <sd-icon [icon]="faBars" fixedWidth/>
    </sd-anchor>

    <div class="_nav">
      <ng-content select="sd-topbar-nav"></ng-content>
    </div>

    <sd-gap width="default" *ngIf="!hasSidebar"></sd-gap>
    <ng-content></ng-content>
    <div class="_menu" style="display: inline-block">
      <ng-content select="sd-topbar-menu"/>
    </div>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      position: absolute;
      z-index: var(--z-index-topbar);
      top: 0;
      left: 0;
      width: 100%;
      height: var(--topbar-height);
      background: var(--theme-primary-default);
      color: var(--text-trans-rev-default);
      overflow-x: auto;
      overflow-y: hidden;
      white-space: nowrap;
      line-height: var(--topbar-height);
      user-select: none;

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
        min-width: var(--topbar-height);
        text-align: center;
        margin-right: var(--gap-default);
        cursor: pointer;

        @media not all and (pointer: coarse) {
          color: var(--text-trans-rev-dark);
        }

        @media all and (pointer: coarse) {
          color: var(--text-trans-lighter);
        }

        &:hover {
          background: rgba(0, 0, 0, .2);
          color: var(--text-trans-rev-default);
        }
      }

      > ._menu {
        display: inline-block;
      }

      @media all and (pointer: coarse) {
        background: var(--background-color);
        color: var(--text-trans-lighter);

        > ._menu {
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

  protected readonly faBars = faBars;
}

