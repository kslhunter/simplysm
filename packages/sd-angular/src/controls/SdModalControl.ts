import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { NumberUtil } from "@simplysm/sd-core-common";
import { SdAnchorControl } from "./SdAnchorControl";
import { SdPaneControl } from "./SdPaneControl";
import { SdSystemConfigProvider } from "../providers/SdSystemConfigProvider";
import { ISdResizeEvent } from "../plugins/SdResizeEventPlugin";
import { SdEventsDirective } from "../directives/SdEventsDirective";
import { SdDockContainerControl } from "./SdDockContainerControl";
import { SdDockControl } from "./SdDockControl";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { $effect, $model, $signal } from "../utils/$hooks";
import { injectElementRef } from "../utils/injectElementRef";
import { transformBoolean } from "../utils/transforms";
import { SdIconControl } from "./SdIconControl";

/**
 * 모달 컨트롤
 *
 * 화면 위에 떠있는 대화상자를 표시하는 컨트롤
 *
 * @example
 *
 * <sd-modal [header]="'제목'" [(isOpen)]="isModalOpen">
 *   <sd-dock-container>
 *     <sd-dock>
 *       모달 내용
 *     </sd-dock>
 *     <sd-dock [position]="'bottom'" [align]="'right'">
 *       <sd-button (click)="isModalOpen = false">닫기</sd-button>
 *     </sd-dock>
 *   </sd-dock-container>
 * </sd-modal>
 *
 *
 * @remarks
 * - 모달은 화면 최상단에 표시되며 백드롭으로 뒷 배경이 어둡게 처리됩니다
 * - 헤더에는 제목과 닫기 버튼이 표시됩니다
 * - 모달 내부는 sd-dock-container를 사용하여 레이아웃을 구성할 수 있습니다
 * - ESC 키를 누르거나 백드롭을 클릭하면 모달이 닫힙니다
 * - isOpen 바인딩을 통해 모달의 표시 여부를 제어할 수 있습니다
 */
@Component({
  selector: "sd-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdAnchorControl, SdPaneControl, SdDockContainerControl, SdDockControl, SdEventsDirective, SdIconControl],
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

      sd-modal {
        display: block;
        position: fixed;
        z-index: var(--z-index-modal);
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        padding-top: calc(var(--topbar-height) + var(--gap-sm));

        > ._backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
        }

        > ._dialog {
          position: relative;
          display: block;
          margin: 0 auto;
          width: fit-content;
          min-width: 240px;
          background: white;
          //border: 1px solid var(--theme-primary-darker);
          // border-radius:2 px;
          overflow: hidden;
          @include elevation(16);

          border-radius: var(--border-radius-default);

          &:focus {
            outline: none;
          }

          > sd-dock-container {
            > ._header {
              display: flex;
              flex-direction: row;
              user-select: none;
              border-bottom: 1px solid var(--trans-light);

              > ._title {
                // display: inline-block;
                flex-grow: 1;

                // padding:var(--gap-sm) var(--gap-default);
                //padding: var(--gap-default) var(--gap-lg);
                padding: var(--gap-sm) var(--gap-default);
              }

              > ._close-button {
                //display: inline-block;
                //float: right;
                //cursor: pointer;
                //text-align: center;
                padding: var(--gap-sm) var(--gap-default);
                //margin: calc(var(--gap-default) - var(--gap-sm));

                //&:hover {
                //  background: var(--theme-grey-lightest);
                //}
                //
                //&:active {
                //  background: var(--theme-grey-lighter);
                //}
              }
            }
          }

          > ._left-resize-bar {
            position: absolute;
            top: 0;
            left: 0;
            width: var(--gap-sm);
            height: 100%;
            cursor: ew-resize;
          }

          > ._right-resize-bar {
            position: absolute;
            top: 0;
            right: 0;
            width: var(--gap-sm);
            height: 100%;
            cursor: ew-resize;
          }

          > ._top-resize-bar {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: var(--gap-sm);
            cursor: ns-resize;
          }

          > ._top-right-resize-bar {
            position: absolute;
            right: 0;
            top: 0;
            width: var(--gap-sm);
            height: var(--gap-sm);
            z-index: 1;
            cursor: nesw-resize;
          }

          > ._top-left-resize-bar {
            position: absolute;
            left: 0;
            top: 0;
            width: var(--gap-sm);
            height: var(--gap-sm);
            cursor: nwse-resize;
            z-index: 1;
          }

          > ._bottom-resize-bar {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: var(--gap-sm);
            cursor: ns-resize;
          }

          > ._bottom-right-resize-bar {
            position: absolute;
            right: 0;
            bottom: 0;
            width: var(--gap-sm);
            height: var(--gap-sm);
            z-index: 1;
            cursor: nwse-resize;
          }

          > ._bottom-left-resize-bar {
            position: absolute;
            left: 0;
            bottom: 0;
            width: var(--gap-sm);
            height: var(--gap-sm);
            cursor: nesw-resize;
            z-index: 1;
          }
        }

        opacity: 0;
        transition: opacity var(--animation-duration) ease-in-out;
        pointer-events: none;

        > ._dialog {
          transform: translateY(-25px);
          transition: transform var(--animation-duration) ease-in-out;
        }

        &[sd-open="true"][sd-init="true"] {
          opacity: 1;
          pointer-events: auto;

          > ._dialog {
            transform: none;
          }
        }

        &[sd-float="true"] {
          pointer-events: none;

          > ._backdrop {
            display: none;
          }

          > ._dialog {
            pointer-events: auto;
            opacity: 0;
            @include elevation(4);
            border: 1px solid var(--theme-grey-lighter);

            &:focus {
              @include elevation(16);
            }
          }

          &[sd-open="true"][sd-init="true"] {
            pointer-events: none;

            > ._dialog {
              pointer-events: auto;
              opacity: 1;
            }
          }
        }

        &[sd-position="bottom-right"] {
          > ._dialog {
            position: absolute;
            right: calc(var(--gap-xxl) * 2);
            bottom: var(--gap-xxl);
          }
        }

        &[sd-position="top-right"] {
          > ._dialog {
            position: absolute;
            right: var(--gap-xxl);
            top: var(--gap-xxl);
          }
        }

        @media all and (max-width: 520px) {
          &[sd-mobile-fill-disabled="false"] {
            padding-top: 0;

            > ._dialog {
              width: 100%;
              height: 100%;

              border: none;
              border-radius: 0;

              > sd-dock-container > ._header {
                background: transparent;
                color: var(--text-trans-lighter);

                /*._close-button {
                color: var(--text-trans-lighter);

                &:hover {
                  background: transparent;
                  color: var(--text-trans-lighter);
                }
              }*/
              }
            }
          }
        }
      }
    `,
  ],
  template: `
    <div class="_backdrop" (click)="onBackdropClick()"></div>

    <div
      #dialogEl
      class="_dialog"
      tabindex="0"
      (keydown.escape)="onDialogEscapeKeydown()"
      [style.min-width.px]="minWidthPx()"
      [style.min-height.px]="minHeightPx()"
      [style.width.px]="minWidthPx() && widthPx() && minWidthPx()! > widthPx()! ? minWidthPx() : widthPx()"
      [style.height.px]="minHeightPx() && heightPx() && minHeightPx()! > heightPx()! ? minHeightPx() : heightPx()"
      (focus)="onDialogFocus()"
      (sdResize)="onDialogResize($event)"
    >
      <sd-dock-container>
        @if (!hideHeader()) {
          <sd-dock class="_header" (mousedown)="onHeaderMouseDown($event)" [style]="headerStyle()">
            <h5 class="_title">{{ title() }}</h5>
            @if (!hideCloseButton()) {
              <sd-anchor class="_close-button" theme="grey" (click)="onCloseButtonClick()">
                <sd-icon [icon]="icons.xmark" fixedWidth />
              </sd-anchor>
            }
          </sd-dock>
        }

        <sd-pane class="_content">
          <ng-content></ng-content>
        </sd-pane>
      </sd-dock-container>

      @if (resizable()) {
        <div class="_left-resize-bar" (mousedown)="onResizeBarMousedown($event, 'left')"></div>
        <div class="_right-resize-bar" (mousedown)="onResizeBarMousedown($event, 'right')"></div>
        <div class="_top-resize-bar" (mousedown)="onResizeBarMousedown($event, 'top')"></div>
        <div class="_top-right-resize-bar" (mousedown)="onResizeBarMousedown($event, 'top-right')"></div>
        <div class="_top-left-resize-bar" (mousedown)="onResizeBarMousedown($event, 'top-left')"></div>
        <div class="_bottom-resize-bar" (mousedown)="onResizeBarMousedown($event, 'bottom')"></div>
        <div class="_bottom-right-resize-bar" (mousedown)="onResizeBarMousedown($event, 'bottom-right')"></div>
        <div class="_bottom-left-resize-bar" (mousedown)="onResizeBarMousedown($event, 'bottom-left')"></div>
      }
    </div>
  `,
  host: {
    "[attr.sd-open]": "open()",
    "[attr.sd-float]": "float()",
    "[attr.sd-position]": "position()",
    "[attr.sd-mobile-fill-disabled]": "mobileFillDisabled()",
  },
})
export class SdModalControl {
  /** 아이콘 설정 */
  icons = inject(SdAngularConfigProvider).icons;

  #sdSystemConfig = inject(SdSystemConfigProvider);
  #elRef = injectElementRef<HTMLElement>();

  /** 모달 열림 상태 */
  _open = input(false, { alias: "open", transform: transformBoolean });
  /** 모달 열림 상태 변경 이벤트 */
  _openChange = output<boolean>({ alias: "openChange" });
  /** 모달 열림 상태 */
  open = $model(this._open, this._openChange);

  /** 모달 설정 키 */
  key = input<string>();

  /** 모달 제목 */
  title = input.required<string>();

  /** 헤더 숨김 여부 */
  hideHeader = input(false, { transform: transformBoolean });

  /** 닫기 버튼 숨김 여부 */
  hideCloseButton = input(false, { transform: transformBoolean });

  /** 배경 클릭으로 닫기 사용 여부 */
  useCloseByBackdrop = input(false, { transform: transformBoolean });

  /** ESC 키로 닫기 사용 여부 */
  useCloseByEscapeKey = input(false, { transform: transformBoolean });

  /** 크기 조절 가능 여부 */
  resizable = input(false, { transform: transformBoolean });

  /** 이동 가능 여부 */
  movable = input(true, { transform: transformBoolean });

  /** 플로팅 여부 */
  float = input(false, { transform: transformBoolean });

  /** 모바일에서 전체 채우기 비활성화 여부 */
  mobileFillDisabled = input(false, { transform: transformBoolean });

  /** 높이 (픽셀) */
  heightPx = input<number>();

  /** 너비 (픽셀) */
  widthPx = input<number>();

  /** 최소 높이 (픽셀) */
  minHeightPx = input<number>();

  /** 최소 너비 (픽셀) */
  minWidthPx = input<number>();

  /** 위치 */
  position = input<"bottom-right" | "top-right">();

  /** 헤더 스타일 */
  headerStyle = input<string>();

  /** 다이얼로그 요소 참조 */
  dialogElRef = viewChild.required<any, ElementRef<HTMLElement>>("dialogEl", { read: ElementRef });

  #config = $signal<ISdModalConfigVM>();

  constructor() {
    $effect([this.key], async () => {
      this.#config.set(await this.#sdSystemConfig.getAsync(`sd-modal.${this.key()}`));
    });

    $effect(() => {
      const conf = this.#config();
      if (conf) {
        this.dialogElRef().nativeElement.style.position = conf.position;
        this.dialogElRef().nativeElement.style.left = conf.left;
        this.dialogElRef().nativeElement.style.top = conf.top;
        this.dialogElRef().nativeElement.style.right = conf.right;
        this.dialogElRef().nativeElement.style.bottom = conf.bottom;
        if (conf.width) {
          this.dialogElRef().nativeElement.style.width = conf.width;
        }
        if (conf.height) {
          this.dialogElRef().nativeElement.style.height = conf.height;
        }
      }

      this.#elRef.nativeElement.setAttribute("sd-init", "true");
    });

    $effect(() => {
      if (this.open()) {
        this.dialogElRef().nativeElement.focus();
      }
    });
  }

  /**
   * 다이얼로그 포커스 이벤트 처리
   */
  onDialogFocus() {
    const maxZIndex = document.body.findAll("sd-modal").max((el) => Number(getComputedStyle(el).zIndex));
    if (maxZIndex !== undefined) {
      this.#elRef.nativeElement.style.zIndex = (maxZIndex + 1).toString();
    }
  }

  /**
   * 크기 조절 이벤트 처리
   */
  @HostListener("sdResize", ["$event"])
  onResize(event: ISdResizeEvent) {
    if (event.heightChanged) {
      this.#calcHeight();
    }
    if (event.widthChanged) {
      this.#calcWidth();
    }
  }

  /**
   * 다이얼로그 크기 조절 이벤트 처리
   */
  onDialogResize(event: ISdResizeEvent) {
    if (event.heightChanged) {
      this.#calcHeight();
    }
    if (event.widthChanged) {
      this.#calcWidth();
    }
  }

  /**
   * 높이 계산
   */
  #calcHeight() {
    const style = getComputedStyle(this.#elRef.nativeElement);
    let paddingTop = style.paddingTop === "" ? 0 : (NumberUtil.parseInt(style.paddingTop) ?? 0);

    if (this.dialogElRef().nativeElement.offsetHeight > this.#elRef.nativeElement.offsetHeight - paddingTop) {
      this.dialogElRef().nativeElement.style.maxHeight = `calc(100% - ${paddingTop * 2}px)`;
      this.dialogElRef().nativeElement.style.height = `calc(100% - ${paddingTop * 2}px)`;
    }
  }

  /**
   * 너비 계산
   */
  #calcWidth() {
    if (this.dialogElRef().nativeElement.offsetWidth > this.#elRef.nativeElement.offsetWidth) {
      this.dialogElRef().nativeElement.style.maxWidth = `100%`;
      this.dialogElRef().nativeElement.style.width = `100%`;
    }
  }

  /**
   * 윈도우 크기 조절 이벤트 처리
   */
  @HostListener("window:resize")
  onWindowResize() {
    if (this.dialogElRef().nativeElement.offsetLeft > this.#elRef.nativeElement.offsetWidth - 100) {
      this.dialogElRef().nativeElement.style.left = this.#elRef.nativeElement.offsetWidth - 100 + "px";
    }
    if (this.dialogElRef().nativeElement.offsetTop > this.#elRef.nativeElement.offsetHeight - 100) {
      this.dialogElRef().nativeElement.style.right = this.#elRef.nativeElement.offsetHeight - 100 + "px";
    }
  }

  /**
   * 닫기 버튼 클릭 이벤트 처리
   */
  onCloseButtonClick() {
    if (this.hideCloseButton()) {
      return;
    }

    this.open.set(false);
  }

  /**
   * 배경 클릭 이벤트 처리
   */
  onBackdropClick() {
    if (this.hideCloseButton() || !this.useCloseByBackdrop()) {
      return;
    }

    this.open.set(false);
  }

  /**
   * 다이얼로그 ESC 키 이벤트 처리
   */
  onDialogEscapeKeydown() {
    if (this.hideCloseButton() || !this.useCloseByEscapeKey()) {
      return;
    }

    this.open.set(false);
  }

  /**
   * 크기 조절 바 마우스 다운 이벤트 처리
   */
  onResizeBarMousedown(
    event: MouseEvent,
    direction: "left" | "right" | "top" | "top-left" | "top-right" | "bottom" | "bottom-left" | "bottom-right",
  ) {
    if (!this.resizable()) return;

    const dialogEl = this.dialogElRef().nativeElement;

    const startX = event.clientX;
    const startY = event.clientY;
    const startHeight = dialogEl.clientHeight;
    const startWidth = dialogEl.clientWidth;
    const startTop = dialogEl.offsetTop;
    const startLeft = dialogEl.offsetLeft;

    let isDoDrag = false;

    const doDrag = (e: MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      if (direction === "top" || direction === "top-right" || direction === "top-left") {
        if (dialogEl.style.position === "absolute") {
          dialogEl.style.top = startTop + (e.clientY - startY) + "px";
          dialogEl.style.bottom = "auto";
        }
        dialogEl.style.height = `${Math.max(startHeight - (e.clientY - startY), this.minHeightPx() ?? 0)}px`;
      }
      if (direction === "bottom" || direction === "bottom-right" || direction === "bottom-left") {
        dialogEl.style.height = `${Math.max(startHeight + e.clientY - startY, this.minHeightPx() ?? 0)}px`;
      }
      if (direction === "right" || direction === "bottom-right" || direction === "top-right") {
        dialogEl.style.width = `${Math.max(startWidth + (e.clientX - startX) * (dialogEl.style.position === "absolute"
          ? 1
          : 2), this.minWidthPx() ?? 0)}px`;
      }
      if (direction === "left" || direction === "bottom-left" || direction === "top-left") {
        if (dialogEl.style.position === "absolute") {
          dialogEl.style.left = startLeft + (e.clientX - startX) + "px";
        }
        dialogEl.style.width = `${Math.max(startWidth - (e.clientX - startX) * (dialogEl.style.position === "absolute"
          ? 1
          : 2), this.minWidthPx() ?? 0)}px`;
      }

      isDoDrag = true;
    };

    const stopDrag = async (e: MouseEvent): Promise<void> => {
      e.stopPropagation();
      e.preventDefault();

      document.documentElement.removeEventListener("mousemove", doDrag, false);
      document.documentElement.removeEventListener("mouseup", stopDrag, false);

      if (this.key() != null && isDoDrag) {
        const newConf = {
          position: dialogEl.style.position,
          left: dialogEl.style.left,
          top: dialogEl.style.top,
          right: dialogEl.style.right,
          bottom: dialogEl.style.bottom,
          width: dialogEl.style.width,
          height: dialogEl.style.height,
        };
        this.#config.set(newConf);
        await this.#sdSystemConfig.setAsync(`sd-modal.${this.key()}`, newConf);
      }
    };

    document.documentElement.addEventListener("mousemove", doDrag, false);
    document.documentElement.addEventListener("mouseup", stopDrag, false);
  }

  /**
   * 헤더 마우스 다운 이벤트 처리
   */
  onHeaderMouseDown(event: MouseEvent) {
    if (!this.movable()) return;

    const dialogEl = this.dialogElRef().nativeElement;

    const startX = event.clientX;
    const startY = event.clientY;
    const startTop = dialogEl.offsetTop;
    const startLeft = dialogEl.offsetLeft;

    let isDoDrag = false;

    const doDrag = (e: MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      dialogEl.style.position = "absolute";
      dialogEl.style.left = `${startLeft + e.clientX - startX}px`;
      dialogEl.style.top = `${startTop + e.clientY - startY}px`;
      dialogEl.style.right = "auto";
      dialogEl.style.bottom = "auto";

      const el = this.#elRef.nativeElement;
      if (dialogEl.offsetLeft > el.offsetWidth - 100) {
        dialogEl.style.left = el.offsetWidth - 100 + "px";
      }
      if (dialogEl.offsetTop > el.offsetHeight - 100) {
        dialogEl.style.top = el.offsetHeight - 100 + "px";
      }
      if (dialogEl.offsetTop < 0) {
        dialogEl.style.top = "0";
      }
      if (dialogEl.offsetLeft < -dialogEl.offsetWidth + 100) {
        dialogEl.style.left = -dialogEl.offsetWidth + 100 + "px";
      }

      isDoDrag = true;
    };

    const stopDrag = async (e: MouseEvent): Promise<void> => {
      e.stopPropagation();
      e.preventDefault();

      document.documentElement.removeEventListener("mousemove", doDrag, false);
      document.documentElement.removeEventListener("mouseup", stopDrag, false);

      if (this.key() != null && isDoDrag) {
        const newConf = {
          position: dialogEl.style.position,
          left: dialogEl.style.left,
          top: dialogEl.style.top,
          right: dialogEl.style.right,
          bottom: dialogEl.style.bottom,
          width: dialogEl.style.width,
          height: dialogEl.style.height,
        };
        this.#config.set(newConf);
        await this.#sdSystemConfig.setAsync(`sd-modal.${this.key()}`, newConf);
      }
    };

    document.documentElement.addEventListener("mousemove", doDrag, false);
    document.documentElement.addEventListener("mouseup", stopDrag, false);
  }
}

export interface ISdModalConfigVM {
  position: string;
  left: string;
  top: string;
  right: string;
  bottom: string;
  width: string;
  height: string;
}
