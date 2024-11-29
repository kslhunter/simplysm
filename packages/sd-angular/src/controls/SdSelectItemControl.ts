import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  forwardRef,
  HostListener,
  inject,
  input,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { SdSelectControl } from "./SdSelectControl";
import { NgTemplateOutlet } from "@angular/common";
import { SdCheckboxControl } from "./SdCheckboxControl";
import { SdGapControl } from "./SdGapControl";
import { $computed, $effect } from "../utils/$hooks";
import { injectElementRef } from "../utils/injectElementRef";
import { useRipple } from "../utils/useRipple";
import { transformBoolean } from "../utils/transforms";

/**
 * 선택 항목 컴포넌트
 * 
 * 선택 컴포넌트(sd-select) 내부에서 사용되는 선택 가능한 항목 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <sd-select [(value)]="selectedValue">
 *   <sd-select-item [value]="1">항목 1</sd-select-item>
 *   <sd-select-item [value]="2" [disabled]="true">항목 2</sd-select-item>
 * </sd-select>
 * ```
 * 
 * @remarks
 * - 단일 선택과 다중 선택 모드를 지원합니다
 * - 비활성화가 가능합니다
 * - 커스텀 템플릿을 지원합니다
 * - 리플 효과가 자동으로 적용됩니다
 * - 호버와 포커스 시 배경색이 변경됩니다
 */
@Component({
  selector: "sd-select-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCheckboxControl, NgTemplateOutlet, SdGapControl],
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

      sd-select-item {
        display: block;
        padding: var(--gap-sm) var(--gap-default);
        cursor: pointer;
        transition: background 0.1s ease-in;
        background: white;

        &:hover {
          transition: background 0.1s ease-out;
          background: rgba(0, 0, 0, 0.07);
        }

        &:focus {
          outline: none;
          transition: background 0.1s ease-out;
          background: rgba(0, 0, 0, 0.07);
        }

        &[sd-selected="true"] {
          color: var(--theme-primary-default);
          font-weight: bold;
          //background: var(--theme-primary-lightest);
          background: rgba(0, 0, 0, 0.07);
        }

        &[sd-disabled="true"] {
          background: var(--theme-grey-default);
          opacity: 0.3;
        }
      }
    `,
  ],
  template: `
    @if (selectMode() === "multi") {
      <sd-checkbox [value]="isSelected()" [inline]="true"></sd-checkbox>
      <sd-gap width="sm" />
    }

    <div class="_content" style="display: inline-block;">
      @if (!labelTemplateRef()) {
        <ng-content />
      } @else {
        <ng-template [ngTemplateOutlet]="labelTemplateRef()!" />
      }
    </div>
  `,
  host: {
    "[attr.tabindex]": "'0'",
    "[attr.sd-disabled]": "disabled()",
    "[attr.sd-select-mode]": "selectMode()",
    "[attr.sd-selected]": "isSelected()",
  },
})
export class SdSelectItemControl {
  /** 부모 선택 컨트롤에 대한 참조 */
  #selectControl: SdSelectControl<any, any> = inject(forwardRef(() => SdSelectControl));
  /** 현재 엘리먼트에 대한 참조 */
  elRef = injectElementRef<HTMLElement>();

  /** 선택 항목의 값 */
  value = input<any>();
  /** 비활성화 여부 */
  disabled = input(false, { transform: transformBoolean });

  /** 라벨 템플릿 참조 */
  labelTemplateRef = contentChild<any, TemplateRef<void>>("label", { read: TemplateRef });

  /** 선택 모드 (단일/다중) */
  selectMode = $computed(() => this.#selectControl.selectMode());
  /** 현재 항목이 선택되었는지 여부 */
  isSelected = $computed(() => this.#selectControl.getIsSelectedItemControl(this));

  constructor() {
    // 비활성화되지 않은 경우에만 리플 효과 적용
    useRipple(() => !this.disabled());

    // 컴포넌트 생성/제거 시 부모 컨트롤의 항목 목록 업데이트
    $effect((onCleanup) => {
      this.#selectControl.itemControls.update((v) => [...v, this]);

      onCleanup(() => {
        this.#selectControl.itemControls.update((v) => v.filter((item) => item !== this));
      });
    });
  }

  /**
   * 클릭 이벤트 핸들러
   * @param event 마우스 이벤트 객체
   */
  @HostListener("click", ["$event"])
  onClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled()) return;

    this.#selectControl.onItemControlClick(this, this.selectMode() === "single");
  }

  /**
   * 키보드 이벤트 핸들러
   * @param event 키보드 이벤트 객체
   */
  @HostListener("keydown", ["$event"])
  onKeydown(event: KeyboardEvent) {
    if (this.disabled()) return;

    if (!event.ctrlKey && !event.altKey && event.key === " ") {
      event.preventDefault();
      event.stopPropagation();

      this.#selectControl.onItemControlClick(this, false);
    }
    if (!event.ctrlKey && !event.altKey && event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();

      this.#selectControl.onItemControlClick(this, this.selectMode() === "single");
    }
  }
}
