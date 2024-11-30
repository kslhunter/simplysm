import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  ElementRef,
  inject,
  input,
  output,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { SdSelectItemControl } from "./SdSelectItemControl";
import { SdDropdownControl } from "./SdDropdownControl";
import { SdItemOfTemplateContext, SdItemOfTemplateDirective } from "../directives/SdItemOfTemplateDirective";
import { SdDockContainerControl } from "./SdDockContainerControl";
import { NgTemplateOutlet } from "@angular/common";
import { SdDockControl } from "./SdDockControl";
import { SdAnchorControl } from "./SdAnchorControl";
import { SdGapControl } from "./SdGapControl";
import { SdPaneControl } from "./SdPaneControl";
import { SdTypedTemplateDirective } from "../directives/SdTypedTemplateDirective";
import { SdDropdownPopupControl } from "./SdDropdownPopupControl";
import { StringUtil } from "@simplysm/sd-core-common";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { $computed, $effect, $model, $signal } from "../utils/$hooks";
import { transformBoolean } from "../utils/transforms";
import { SdUseRippleDirective } from "../directives/SdUseRippleDirective";
import { SdIconControl } from "./SdIconControl";


/**
 * 선택 컴포넌트
 *
 * 드롭다운 형태의 선택 컴포넌트입니다.
 *
 * @example
 * ```html
 * <sd-select [(value)]="selectedValue">
 *   <sd-select-item [value]="1">항목 1</sd-select-item>
 *   <sd-select-item [value]="2">항목 2</sd-select-item>
 * </sd-select>
 * ```
 *
 * @remarks
 * - 드롭다운 형태로 항목을 선택할 수 있습니다
 * - 단일 선택과 다중 선택을 지원합니다
 * - 검색 기능을 제공합니다
 * - 커스텀 템플릿을 지원합니다
 * - 키보드 네비게이션을 지원합니다
 */
@Component({
  selector: "sd-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdDropdownControl,
    SdDropdownPopupControl,
    SdDockContainerControl,
    SdDockControl,
    SdAnchorControl,
    SdGapControl,
    SdPaneControl,
    NgTemplateOutlet,
    SdTypedTemplateDirective,
    SdUseRippleDirective,
    SdIconControl,
  ],
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

      sd-select {
        display: block;
        width: 100%;
        min-width: 10em;

        > sd-dropdown {
          > ._sd-dropdown-control {
            display: flex;
            overflow: hidden;

            border: 1px solid var(--trans-lighter);
            border-radius: var(--border-radius-default);
            background: var(--theme-secondary-lightest);

            &:focus,
            &:has(:focus) {
              border-color: var(--theme-primary-default);
            }

            > ._sd-select-control {
              display: flex;
              position: relative;
              gap: var(--gap-default);
              flex-grow: 1;
              padding: var(--gap-sm) var(--gap-default);

              cursor: pointer;

              > ._sd-select-control-content {
                flex-grow: 1;
                white-space: nowrap;
              }

              > ._sd-select-control-icon {
                opacity: 0.3;
              }

              &:hover > ._sd-select-control-icon,
              &:focus > ._sd-select-control-icon,
              &:active > ._sd-select-control-icon {
                opacity: 1;
              }

              > ._invalid-indicator {
                display: none;
                //display: block;
                position: absolute;
                z-index: 9999;
                background: var(--theme-danger-default);

                top: var(--gap-xs);
                left: var(--gap-xs);
                border-radius: 100%;
                width: var(--gap-sm);
                height: var(--gap-sm);
              }
            }

            > sd-select-button {
              padding: var(--gap-sm);
              border-left: 1px solid var(--theme-grey-lightest);

              &:last-of-type {
                border-top-right-radius: var(--border-radius-default);
                border-bottom-right-radius: var(--border-radius-default);
              }
            }
          }
        }

        &[sd-disabled="true"] {
          > sd-dropdown > ._sd-dropdown-control {
            background: var(--theme-grey-lightest);

            > ._sd-select-control {
              color: var(--text-trans-light);
              cursor: default;

              > ._sd-select-control-icon {
                display: none;
              }
            }
          }
        }

        &:has(:invalid),
        &[sd-invalid] {
          > sd-dropdown > ._sd-dropdown-control > ._sd-select-control > ._invalid-indicator {
            display: block;
          }
        }

        &[sd-inline="true"] {
          display: inline-block;
          width: auto;
          vertical-align: top;
        }

        &[sd-size="sm"] {
          > sd-dropdown > ._sd-dropdown-control {
            > ._sd-select-control {
              padding: var(--gap-xs) var(--gap-sm);
              gap: var(--gap-sm);
            }

            > sd-select-button {
              padding: var(--gap-xs);
            }
          }
        }

        &[sd-size="lg"] {
          > sd-dropdown > ._sd-dropdown-control {
            > ._sd-select-control {
              padding: var(--gap-default) var(--gap-lg);
              gap: var(--gap-lg);
            }

            > sd-select-button {
              padding: var(--gap-default);
            }
          }
        }

        &[sd-inset="true"] {
          min-width: auto;
          border-radius: 0;

          > sd-dropdown > ._sd-dropdown-control {
            border: none;
            border-radius: 0;

            > sd-select-button {
              border-radius: 0;
            }

            &:focus,
            &:has(:focus) {
              outline: 1px solid var(--theme-primary-default);
              outline-offset: -1px;

              > sd-select-button {
                outline: 1px solid var(--theme-primary-default);
                outline-offset: -1px;
              }
            }
          }

          &[sd-disabled="true"] > sd-dropdown > ._sd-dropdown-control {
            background: white;

            > ._sd-select-control {
              color: var(--text-trans-default);
            }
          }
        }
      }
    `,
  ],
  template: `
    <sd-dropdown
      #dropdown
      [disabled]="disabled()"
      [contentClass]="contentClass()"
      [contentStyle]="contentStyle()"
      [(open)]="open"
    >
      <div class="_sd-select-control" [sdUseRipple]="!disabled()">
        <div #contentEl class="_sd-select-control-content"></div>
        <div class="_sd-select-control-icon">
          <sd-icon [icon]="icons.caretDown" />
        </div>

        <div class="_invalid-indicator"></div>
      </div>

      @if (!disabled()) {
        <ng-content select="sd-select-button" />
      }

      <sd-dropdown-popup #dropdownPopup (keydown)="onPopupKeydown($event)">
        @if (!items()) {
          <sd-dock-container>
            @if (headerTemplateRef()) {
              <sd-dock>
                <ng-template [ngTemplateOutlet]="headerTemplateRef()!" />
              </sd-dock>
            }

            <sd-pane>
              <ng-content></ng-content>
            </sd-pane>
          </sd-dock-container>
        } @else {
          <sd-dock-container>
            @if (headerTemplateRef()) {
              <sd-dock>
                <ng-template [ngTemplateOutlet]="headerTemplateRef()!" />
              </sd-dock>
            }

            @if (selectMode() === "multi" && !hideSelectAll()) {
              <sd-dock class="bdb bdb-trans-default p-sm-default">
                <sd-anchor (click)="onSelectAllButtonClick(true)">전체선택</sd-anchor>
                <sd-gap width="sm"></sd-gap>
                <sd-anchor (click)="onSelectAllButtonClick(false)">전체해제</sd-anchor>
              </sd-dock>
            }

            <sd-pane>
              <ng-template [ngTemplateOutlet]="beforeTemplateRef() ?? null" />
              <ng-template #rowOfList [typed]="rowOfListType" let-items="items" let-depth="depth">
                @for (item of items; let index = $index; track trackByFn()(item, index)) {
                  <div class="_sd-select-item">
                    <ng-template
                      [ngTemplateOutlet]="itemTemplateRef() ?? null"
                      [ngTemplateOutletContext]="{
                        $implicit: item,
                        item: item,
                        index: index,
                        depth: depth,
                      }"
                    ></ng-template>

                    @if (getChildrenFn() &&
                    getChildrenFn()!(item, index, depth) &&
                    getChildrenFn()!(item, index, depth).length > 0) {
                      <div class="_children">
                        <ng-template
                          [ngTemplateOutlet]="rowOfList"
                          [ngTemplateOutletContext]="{
                            items: getChildrenFn()!(item, index, depth),
                            depth: depth + 1,
                          }"
                        ></ng-template>
                      </div>
                    }
                  </div>
                }
              </ng-template>
              <ng-template
                [ngTemplateOutlet]="rowOfList"
                [ngTemplateOutletContext]="{ items: items(), depth: 0 }"
              ></ng-template>
            </sd-pane>
          </sd-dock-container>
        }
      </sd-dropdown-popup>
    </sd-dropdown>
  `,
  host: {
    "[attr.sd-disabled]": "disabled()",
    "[attr.sd-inline]": "inline()",
    "[attr.sd-inset]": "inset()",
    "[attr.sd-size]": "size()",
    "[attr.sd-invalid]": "errorMessage()",
  },
})
export class SdSelectControl<M extends "single" | "multi", T> {
  /** 아이콘 설정 */
  icons = inject(SdAngularConfigProvider).icons;

  /** 현재 선택된 값 */
  _value = input<TSelectValue<any>[M] | undefined>(undefined, { alias: "value" });
  /** 값 변경 이벤트 */
  _valueChange = output<TSelectValue<any>[M] | undefined>({ alias: "valueChange" });
  /** 양방향 바인딩을 위한 값 모델 */
  value = $model(this._value, this._valueChange);

  /** 드롭다운 열림 상태 */
  _open = input(false, { alias: "open", transform: transformBoolean });
  /** 드롭다운 열림 상태 변경 이벤트 */
  _openChange = output<boolean>({ alias: "openChange" });
  /** 드롭다운 열림 상태 양방향 바인딩 */
  open = $model(this._open, this._openChange);

  /** 필수 입력 여부 */
  required = input(false, { transform: transformBoolean });
  /** 비활성화 여부 */
  disabled = input(false, { transform: transformBoolean });

  /** 선택 가능한 항목 목록 */
  items = input<T[]>();
  /** 항목 추적 함수 */
  trackByFn = input<(item: T, index: number) => any>((item) => item);
  /** 자식 항목을 가져오는 함수 */
  getChildrenFn = input<(item: T, index: number, depth: number) => T[]>();

  /** 인라인 표시 여부 */
  inline = input(false, { transform: transformBoolean });
  /** 인셋 스타일 적용 여부 */
  inset = input(false, { transform: transformBoolean });
  /** 크기 설정 */
  size = input<"sm" | "lg">();
  /** 선택 모드 (단일/다중) */
  selectMode = input("single" as M);
  /** 컨텐츠 CSS 클래스 */
  contentClass = input<string>();
  /** 컨텐츠 스타일 */
  contentStyle = input<string>();
  /** 다중 선택시 표시 방향 */
  multiSelectionDisplayDirection = input<"vertical" | "horizontal">();
  /** 전체 선택 버튼 숨김 여부 */
  hideSelectAll = input(false, { transform: transformBoolean });
  /** 플레이스홀더 텍스트 */
  placeholder = input<string>();

  /** 컨텐츠 요소 참조 */
  contentElRef = viewChild.required<any, ElementRef<HTMLElement>>("contentEl", { read: ElementRef });
  /** 드롭다운 컨트롤 참조 */
  dropdownControl = viewChild.required<SdDropdownControl>("dropdown");
  /** 드롭다운 팝업 요소 참조 */
  dropdownPopupElRef = viewChild.required<any, ElementRef<HTMLElement>>("dropdownPopup", { read: ElementRef });

  /** 헤더 템플릿 참조 */
  headerTemplateRef = contentChild<any, TemplateRef<void>>("header", { read: TemplateRef });
  /** 이전 템플릿 참조 */
  beforeTemplateRef = contentChild<any, TemplateRef<void>>("before", { read: TemplateRef });
  /** 항목 템플릿 참조 */
  itemTemplateRef = contentChild<any, TemplateRef<SdItemOfTemplateContext<T>>>(SdItemOfTemplateDirective, {
    read: TemplateRef,
  });

  /** 항목 컨트롤 목록 */
  itemControls = $signal<SdSelectItemControl[]>([]);

  /** 에러 메시지 계산 */
  errorMessage = $computed(() => {
    const errorMessages: string[] = [];

    if (this.required() && this.value() === undefined) {
      errorMessages.push("선택된 항목이 없습니다.");
    }

    const fullErrorMessage = errorMessages.join("\r\n");
    return !StringUtil.isNullOrEmpty(fullErrorMessage) ? fullErrorMessage : undefined;
  });

  constructor() {
    $effect(() => {
      const selectedItemControls = this.itemControls().filter((itemControl) => itemControl.isSelected());
      const selectedItemEls = selectedItemControls.map((item) => item.elRef.nativeElement);
      const innerHTML = selectedItemEls
        .map((el) => el.findFirst("> ._content")?.innerHTML ?? "")
        .map((item) => `<div style="display: inline-block">${item}</div>`)
        .join(this.multiSelectionDisplayDirection() === "vertical" ? "<div class='p-sm-0'></div>" : ", ");

      if (innerHTML === "" && this.placeholder() !== undefined) {
        this.contentElRef().nativeElement.innerHTML = `<span class='sd-text-color-grey-default'>${this.placeholder()}</span>`;
      }
      else {
        this.contentElRef().nativeElement.innerHTML = innerHTML;
      }
    });
  }

  /** 팝업 키보드 이벤트 처리 */
  onPopupKeydown(event: KeyboardEvent) {
    if (!event.ctrlKey && !event.altKey && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      event.stopPropagation();

      if (document.activeElement instanceof HTMLElement) {
        const focusableEls = this.dropdownPopupElRef().nativeElement.findFocusableAll();
        const currIndex = focusableEls.indexOf(document.activeElement);

        if (event.key === "ArrowUp") {
          if (currIndex === 0) {
            this.dropdownControl().contentElRef().nativeElement.focus();
          }
          else {
            focusableEls[currIndex - 1].focus();
          }
        }
        else {
          if (typeof focusableEls[currIndex + 1] !== "undefined") {
            focusableEls[currIndex + 1].focus();
          }
        }
      }
    }
  }

  /** 항목 선택 여부 확인 */
  getIsSelectedItemControl(itemControl: SdSelectItemControl): boolean {
    if (this.selectMode() === "multi") {
      const itemKeyValues = this.value() as any[] | undefined;
      return itemKeyValues?.includes(itemControl.value()) ?? false;
    }
    else {
      const itemKeyValue = this.value();
      return itemKeyValue === itemControl.value();
    }
  }

  /** 항목 클릭 이벤트 처리 */
  onItemControlClick(itemControl: SdSelectItemControl, close: boolean) {
    if (this.selectMode() === "multi") {
      this.value.update((v) => {
        const r = [...((v ?? []) as any[])];
        if (r.includes(itemControl.value())) {
          r.remove(itemControl.value());
        }
        else {
          r.push(itemControl.value());
        }
        return r;
      });
    }
    else {
      this.value.set(itemControl.value());
    }

    if (close) {
      this.dropdownControl().open.set(false);
    }
  }

  /** 전체 선택 버튼 클릭 이벤트 처리 */
  onSelectAllButtonClick(check: boolean) {
    const value = check ? this.itemControls().map((item) => item.value()) : [];

    this.value.set(value);
  }

  /** 목록 행 템플릿 타입 */
  protected readonly rowOfListType!: {
    items: T[];
    depth: number;
  };
}

export type TSelectValue<T> = {
  multi: T[];
  single: T;
};
