import { ChangeDetectionStrategy, Component, ViewEncapsulation } from "@angular/core";

/**
 * 폼 테이블 컨트롤
 * 
 * 폼 내부의 입력 필드들을 테이블 형태로 정렬하는 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <sd-form-table>
 *   <tr>
 *     <th>이름</th>
 *     <td><input type="text"></td>
 *   </tr>
 *   <tr>
 *     <th>이메일</th>
 *     <td><input type="email"></td>
 *   </tr>
 * </sd-form-table>
 * ```
 */
@Component({
  selector: "sd-form-table",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: ` <table>
    <tbody>
      <ng-content></ng-content>
    </tbody>
  </table>`,
  styles: [
    /* language=SCSS */ `
      sd-form-table {
        display: block;

        > table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          border: 0;

          > tbody > tr > * {
            padding: 0 var(--gap-default) var(--gap-sm) 0;
            vertical-align: middle;

            &:last-child {
              padding-right: 0;
            }
          }

          > * > tr:last-child > * {
            padding-bottom: 0;
          }

          > tbody > tr > th {
            padding-left: var(--gap-sm);
            text-align: right;
            width: 0;
            white-space: nowrap;
          }
        }
      }
    `,
  ],
})
export class SdFormTableControl {
}
