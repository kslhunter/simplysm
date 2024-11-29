import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";

/**
 * 프로그레스 컨트롤
 *
 * 진행 상태를 표시하는 프로그레스 바 컴포넌트
 *
 * @example
 *
 * <sd-progress [label]="'진행률'" [maxValue]="100">
 *   <sd-progress-item [value]="50"></sd-progress-item>
 * </sd-progress>
 *
 *
 * @remarks
 * - 프로그레스 바의 레이블과 최대값을 설정할 수 있습니다
 * - 내부에 sd-progress-item을 통해 진행 상태를 표시할 수 있습니다
 * - 테마 색상과 크기 조절이 가능합니다
 */
@Component({
  selector: "sd-progress",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-progress {
        position: relative;
        display: block;
        width: 100%;
        white-space: nowrap;
        background: white;
        background: var(--theme-grey-lighter);
        border-radius: var(--border-radius-default);
        overflow: hidden;

        > ._sd-progress-content {
          font-weight: bold;
          font-size: 13pt;
          background: white;
          padding: var(--gap-lg) var(--gap-default);
        }

        &._size-lg {
          > ._sd-progress-content,
          > sd-progress-item > div {
            padding: var(--gap-default) var(--gap-lg);
            font-size: large;
          }
        }
      }
    `,
  ],
  template: `
    <div class="_sd-progress-content">
      {{ label() || "&nbsp;" }}
    </div>
    <ng-content></ng-content>
  `,
})
export class SdProgressControl {
  /** 프로그레스 바의 레이블 텍스트 */
  label = input<string>();

  /** 프로그레스 바의 최대값 */
  maxValue = input<number>();
}
