import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from "@angular/core";
import { SdDockControl } from "../../../controls/layout/sd-dock.control";
import { SdDockContainerControl } from "../../../controls/layout/sd-dock-container.control";
import { SdButtonControl } from "../../../controls/button/sd-button.control";
import { SdPaneControl } from "../../../controls/layout/sd-pane.control";
import { SdFormControl } from "../../../controls/form/sd-form.control";
import { SdModalBaseControl } from "../../base/sd-modal-base.control";
import { SdAngularConfigProvider } from "../../../providers/sd-angular-config.provider";
import { injectParent } from "../../../utils/injectParent";
import { SdDetailModalAbstract } from "./sd-detail-modal.abstract";
import { TemplateTargetDirective } from "../../../directives/template-target.directive";

@Component({
  selector: "sd-detail-modal-base",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdDockControl,
    SdDockContainerControl,
    SdButtonControl,
    SdPaneControl,
    SdFormControl,
    SdModalBaseControl,
    TemplateTargetDirective,
  ],
  template: `
    <sd-modal-base
      [viewCodes]="$.vm.viewCodes"
      [busy]="$.busyCount() > 0"
      [initialized]="$.initialized()"
    >
      <ng-template target="content">
        <sd-dock-container>
          <sd-pane class="p-lg">
            <sd-form #formCtrl (submit)="$.onSubmit()">
              <ng-content />
            </sd-form>

            @if ($.data().lastModifyDateTime) {
              최종수정:
              {{ $.data().lastModifyDateTime!.toFormatString("yyyy-MM-dd HH:mm") }}
              ({{ $.data().lastModifierName }})
            }
          </sd-pane>

          <sd-dock position="bottom" class="p-sm-default bdt bdt-trans-light flex-row">
            @if ($.data().id != null) {
              <div>
                @if (!$.data().isDeleted) {
                  <sd-button
                    theme="danger"
                    inline
                    (click)="$.onDeleteButtonClick()"
                    [disabled]="!$.vm.perms().includes('edit')"
                  >
                    삭제
                  </sd-button>
                } @else {
                  <sd-button
                    theme="warning"
                    inline
                    (click)="$.onRestoreButtonClick()"
                    [disabled]="!$.vm.perms().includes('edit')"
                  >
                    복구
                  </sd-button>
                }
              </div>
            }

            <div class="flex-grow tx-right">
              <sd-button theme="primary" inline (click)="formCtrl.requestSubmit()">확인</sd-button>
            </div>
          </sd-dock>
        </sd-dock-container>
      </ng-template>
    </sd-modal-base>
  `,
})
export class SdDetailModalBaseControl {
  icons = inject(SdAngularConfigProvider).icons;

  $ = injectParent(SdDetailModalAbstract);
}
