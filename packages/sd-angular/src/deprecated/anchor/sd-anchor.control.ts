import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../../utils/type-tramsforms";

/**
 * 앵커 컨트롤 컴포넌트
 * 클릭 가능한 앵커 링크를 표시하는 컴포넌트
 *
 * @deprecated
 */
@Component({
  selector: "sd-anchor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>
  `,
  styleUrl: "sd-anchor.scss",
  host: {
    "[attr.data-sd-theme]": "theme()",
    "[attr.data-sd-disabled]": "disabled()",
    "[attr.tabindex]": "disabled() ? undefined : 0",
  },
})
export class SdAnchorControl {
  /** 비활성화 여부 */
  disabled = input(false, { transform: transformBoolean });

  /** 테마 - 컴포넌트의 색상 테마를 설정 */
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">("primary");
}
