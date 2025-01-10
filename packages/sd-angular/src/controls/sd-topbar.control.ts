import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  HostListener,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdTopbarContainerControl } from "./sd-topbar-container.control";
import { SdSidebarContainerControl } from "./sd-sidebar-container.control";
import { ISdResizeEvent } from "../plugins/events/sd-resize.event-plugin";
import { SdAnchorControl } from "./sd-anchor.control";
import { SdGapControl } from "./sd-gap.control";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { $computed } from "../utils/hooks";
import { injectElementRef } from "../utils/dom/element-ref.injector";
import { SdIconControl } from "./sd-icon.control";

@Component({
  selector: "sd-topbar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdAnchorControl, SdGapControl, SdIconControl],
  styles: [
    /* language=SCSS */ `
      @use "../scss/mixins";

      sd-topbar {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--gap-default);
        align-items: center;
        justify-content: start;
        //white-space: nowrap;

        position: absolute;
        z-index: var(--z-index-topbar);
        top: 0;
        left: 0;
        width: 100%;
        height: var(--topbar-height);
        overflow-x: auto;
        overflow-y: hidden;
        //line-height: var(--topbar-height);
        user-select: none;

        background: var(--control-color);
        color: var(--text-trans-default);

        //body.sd-theme-compact &,
        //body.sd-theme-modern & {
        //  border-bottom: 1px solid var(--border-color-light);
        //  @include mixins.elevation(2);
        //  animation: sd-topbar var(--animation-duration) ease-in;
        //}

        /*> ._nav {
        display: inline-block;
        height: var(--topbar-height);s
        white-space: nowrap;
        vertical-align: top;
      }*/

        @each $h in (h1, h2, h3, h4, h5, h6) {
          > #{$h} {
            //display: inline-block;
            //vertical-align: top;
            //line-height: var(--topbar-height);
            //margin-right: var(--gap-xxl);
            padding-right: var(--gap-xl);
          }
        }

        &::-webkit-scrollbar-track {
          background-color: rgba(0, 0, 0, 0.1);
        }

        &::-webkit-scrollbar-corner {
          background-color: rgba(0, 0, 0, 0.1);
        }

        &::-webkit-scrollbar {
          width: var(--gap-sm);
          height: var(--gap-sm);
          background-color: rgba(0, 0, 0, 0);
        }

        &::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.2);
        }

        > ._sidebar-toggle-button {
          //display: inline-block;
          //vertical-align: top;
          text-align: center;
          //margin-right: var(--gap-default);
          cursor: pointer;
          line-height: var(--topbar-height);

          min-width: var(--topbar-height);
          font-size: var(--font-size-h4);

          color: var(--theme-primary-default);

          &:hover {
            background: transparent;
            color: var(--theme-primary-darker);
          }
        }

        > ._menu {
          display: flex;
          flex-wrap: nowrap;
          flex-direction: row;
          flex-grow: 1;
          gap: var(--gap-sm);
          padding-right: var(--gap-default);

          body.sd-theme-mobile & {
            justify-content: end;
          }
        }
      }
    `,
  ],
  template: `
    @if (hasSidebar()) {
      <sd-anchor class="_sidebar-toggle-button" (click)="onSidebarToggleButtonClick()" sdUseRipple>
        <sd-icon [icon]="icons.bars" fixedWidth />
      </sd-anchor>
    } @else {
      <sd-gap width="sm" />
    }

    <ng-content />

    <div class="_menu">
      <ng-content select="sd-topbar-menu"></ng-content>
    </div>
  `,
})
export class SdTopbarControl {
  icons = inject(SdAngularConfigProvider).icons;

  #elRef = injectElementRef<HTMLElement>();
  #parentSidebarContainerControl = inject(SdSidebarContainerControl, { optional: true });
  #topbarContainerControl = inject<SdTopbarContainerControl>(forwardRef(() => SdTopbarContainerControl));

  sidebarContainer = input<SdSidebarContainerControl>();

  hasSidebar = $computed(() => !!this.sidebarContainer() || !!this.#parentSidebarContainerControl);

  onSidebarToggleButtonClick() {
    const sidebarContainerControl = this.sidebarContainer() ?? this.#parentSidebarContainerControl;
    sidebarContainerControl!.toggle.update((v) => !v);
  }

  @HostListener("sdResize", ["$event"])
  onResize(event: ISdResizeEvent) {
    if (!event.heightChanged) return;
    this.#topbarContainerControl.paddingTop.set(this.#elRef.nativeElement.offsetHeight + "px");
  }
}
