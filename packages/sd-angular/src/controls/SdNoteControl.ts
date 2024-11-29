import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../utils/transforms";

/**
 * 노트 컨트롤
 *
 * 텍스트 메시지나 알림을 표시하기 위한 노트 컴포넌트입니다.
 *
 * @example
 *
 * <sd-note>기본 노트</sd-note>
 *
 * <sd-note theme="primary">테마가 적용된 노트</sd-note>
 *
 * <sd-note size="sm">작은 크기의 노트</sd-note>
 *
 * <sd-note [inset]="true">인셋 스타일의 노트</sd-note>
 *
 *
 * @remarks
 * - theme: 노트의 색상 테마를 설정합니다 (primary, secondary, info 등)
 * - size: 노트의 크기를 설정합니다 (sm, lg)
 * - inset: 테두리 반경을 제거하여 인셋 스타일로 표시합니다
 */
@Component({
  selector: "sd-note",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      @import "../scss/variables";

      sd-note {
        display: block;
        padding: var(--gap-sm) var(--gap-default);
        background: var(--theme-grey-lightest);

        border: none;
        border-radius: var(--border-radius-default);

        @each $key, $val in map-get($vars, theme) {
          &[sd-theme="#{$key}"] {
            background: var(--theme-#{$key}-lightest);
            border-color: var(--theme-#{$key}-light);
          }
        }

        &[sd-size="sm"] {
          font-size: var(--font-size-sm);
          padding: var(--gap-xs) var(--gap-sm);
        }

        &[sd-size="lg"] {
          padding: var(--gap-default) var(--gap-lg);
        }

        &[sd-inset="true"] {
          border-radius: 0;
        }
      }
    `,
  ],
  template: `
    <ng-content></ng-content> `,
  host: {
    "[attr.sd-theme]": "theme()",
    "[attr.sd-size]": "size()",
    "[attr.sd-inset]": "inset()",
  },
})
export class SdNoteControl {
  /** 노트의 테마를 설정합니다. primary, secondary, info, success, warning, danger, grey, blue-grey 중 선택 가능합니다. */
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">();

  /** 노트의 크기를 설정합니다. sm(작게) 또는 lg(크게) 중 선택 가능합니다. */
  size = input<"sm" | "lg">();

  /** 노트의 모서리를 각지게 만듭니다. true로 설정하면 border-radius가 0이 됩니다. */
  inset = input(false, { transform: transformBoolean });}
