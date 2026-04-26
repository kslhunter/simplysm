import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  input,
  model,
  output,
  type TemplateRef,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { SdButton } from "../../controls/button/sd-button";
import { SdCommandDirective } from "../../core/commands/sd-command";
import { SdForm } from "../../controls/form/sd-form";
import type { SdViewType } from "../../core/routing/injectViewTypeSignal";
import { SdBaseContainer } from "./sd-base-container";
import { NgIcon } from "@ng-icons/core";
import { NgTemplateOutlet } from "@angular/common";
import { tablerDeviceFloppy } from "@ng-icons/tabler-icons";

@Component({
  selector: "sd-crud-detail",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdBaseContainer, SdButton, NgIcon, NgTemplateOutlet, SdForm],
  hostDirectives: [{ directive: SdCommandDirective, outputs: ["sdSaveCommand"] }],
  host: {
    "(sdSaveCommand)": "onSaveButtonClick()",
  },
  template: `
    <sd-base-container
      [(ready)]="ready"
      [initialized]="initialized()"
      [(busyCount)]="busyCount"
      [restricted]="restricted()"
      [viewType]="viewType()"
    >
      <!-- TOP -->
      @if (viewType() === "page" && (!readonly() || commandTplRef())) {
        <ng-template #topbarTpl>
          @if (!readonly()) {
            <sd-button [theme]="'link-primary'" (click)="formCtrl()?.requestSubmit()">
              <ng-icon [svg]="tablerDeviceFloppy" />
              저장
              <small>(CTRL+S)</small>
            </sd-button>
          }

          <ng-template [ngTemplateOutlet]="commandTplRef()" />
        </ng-template>
      } @else if (viewType() === "control" && (!readonly() || commandTplRef())) {
        <ng-template #commandTpl>
          @if (!readonly()) {
            <sd-button [theme]="'primary'" (click)="onSaveButtonClick()">
              <ng-icon [svg]="tablerDeviceFloppy" />
              저장
              <small>(CTRL+S)</small>
            </sd-button>
          }

          <ng-template [ngTemplateOutlet]="commandTplRef()" />
        </ng-template>
      } @else if (commandTplRef()) {
        <ng-template #commandTpl>
          <ng-template [ngTemplateOutlet]="commandTplRef()" />
        </ng-template>
      }

      <!-- BOTTOM -->
      @if (viewType() === "modal" || bottomCommandTplRef()) {
        <ng-template #bottomCommandTpl>
          @if (bottomCommandTplRef()) {
            <div class="flex-fill flex-row main-align-start gap-sm">
              <ng-template [ngTemplateOutlet]="bottomCommandTplRef()" />
            </div>
          }

          <sd-button [size]="'sm'" [theme]="'primary'" (click)="onSaveButtonClick()">
            확인
          </sd-button>
        </ng-template>
      }

      @if (contentTplRef()) {
        <ng-template #contentTpl>
          @if (readonly()) {
            <div class="fill">
              <ng-template [ngTemplateOutlet]="contentTplRef()" />
            </div>
          } @else {
            <sd-form #formCtrl (formSubmit)="submit.emit()" class="block fill">
              <ng-template [ngTemplateOutlet]="contentTplRef()" />
            </sd-form>
          }
        </ng-template>
      }
    </sd-base-container>
  `,
})
export class SdCrudDetail {
  ready = model(false);
  initialized = input(false);
  busyCount = model(0);
  restricted = input(false);
  readonly = input(false);
  viewType = input.required<SdViewType>();

  formCtrl = viewChild<SdForm>("formCtrl");

  submit = output();

  commandTplRef = contentChild<TemplateRef<void>>("commandTpl");
  contentTplRef = contentChild<TemplateRef<void>>("contentTpl");
  bottomCommandTplRef = contentChild<TemplateRef<void>>("bottomCommandTpl");

  onSaveButtonClick() {
    this.formCtrl()?.requestSubmit();
  }

  protected readonly tablerDeviceFloppy = tablerDeviceFloppy;
}
