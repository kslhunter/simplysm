import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { SdDockControl } from "../../../controls/layout/sd-dock.control";
import { SdDockContainerControl } from "../../../controls/layout/sd-dock-container.control";
import { SdButtonControl } from "../../../controls/button/sd-button.control";
import { SdPaneControl } from "../../../controls/layout/sd-pane.control";
import { SdModalBaseControl } from "../../base/sd-modal-base.control";
import { SdDetailViewBaseControl } from "../detail-view/sd-detail-view-base.control";
import { ISdViewModel, TSdViewModelGenericTypes } from "../ISdViewModel";

@Component({
  selector: "sd-detail-modal2-base",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdDockControl,
    SdDockContainerControl,
    SdButtonControl,
    SdPaneControl,
    SdModalBaseControl,
    SdDetailViewBaseControl,
  ],
  template: `
    <sd-modal-base [viewCodes]="vm().viewCodes">
      <sd-dock-container>
        <sd-pane class="p-lg">
          <sd-detail-view-base
            #detailView
            [vm]="vm()"
            [(initialized)]="initialized"
            [(busyCount)]="busyCount"
            [dataId]="dataId()"
            [defaultData]="defaultData()"
            [(data)]="data"
          >
            <ng-content />
          </sd-detail-view-base>
        </sd-pane>

        <sd-dock position="bottom" class="p-sm-default bdt bdt-trans-light flex-row">
          @if (data().id != null) {
            <div>
              @if (!data().isDeleted) {
                <sd-button
                  theme="danger"
                  inline
                  (click)="detailView.deleteAsync()"
                  [disabled]="!vm().perms().includes('edit')"
                >
                  삭제
                </sd-button>
              } @else {
                <sd-button
                  theme="warning"
                  inline
                  (click)="detailView.restoreAsync()"
                  [disabled]="!vm().perms().includes('edit')"
                >
                  복구
                </sd-button>
              }
            </div>
          }

          <div class="flex-grow tx-right">
            <sd-button theme="primary" inline (click)="detailView.requestSubmit()">
              확인
            </sd-button>
          </div>
        </sd-dock>
      </sd-dock-container>
    </sd-modal-base>
  `,
})
export class SdDetailModal2BaseControl<VM extends ISdViewModel> {
  vm = input.required<VM>();

  initialized = model(false);
  busyCount = model(0);

  dataId = input<number>();
  defaultData = input.required<TSdViewModelGenericTypes<VM>["DD"]>();
  data = model.required<TSdViewModelGenericTypes<VM>["DD"]>();
}
