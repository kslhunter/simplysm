import {Component, ElementRef, EventEmitter, Input, NgZone, Output} from "@angular/core";
import {DateOnly} from "../../../sd-core/src";
import {ExcelWorkbook} from "../../../sd-excel/src";
import {SdToastProvider} from "../providers/SdToastProvider";

@Component({
  selector: "sd-excel-mapping",
  template: `
        <sd-topbar-container>
            <sd-topbar [main]="false"
                       [closable]="true"
                       (close.click)="closeExcelFile()">
                <h4>엑셀 업로드</h4>
                <sd-topbar-button (click)="submitExcelFile()"
                                  *ngIf="excelItemList.length > 0">
                    <sd-icon [icon]="'check'" [fixedWidth]="true"></sd-icon>
                    등록
                </sd-topbar-button>
            </sd-topbar>

            <sd-dock-container>
                <sd-dock class="sd-background-white sd-padding-sm-default sd-border-bottom-default">
                    <sd-pagination [value]="pagination.page"
                                   [length]="pagination.length"
                                   (valueChange)="setPage($event)"></sd-pagination>
                </sd-dock>

                <sd-pane>
                    <sd-busy [value]="busy">
                        <sd-sheet [items]="excelItemList" *ngIf="excelItemList.length > 0">
                            <sd-sheet-column *ngFor="let title of excelTitleList; trackBy: titleTrackByFn"
                                             [title]="title" [fill]="true">
                                <ng-template #header>
                                    <sd-select [(value)]="excelTitleMap[title]">
                                        <option value="undefined">미지정</option>
                                        <option *ngFor="let field of fields; trackBy: fieldTrackByFn" [value]="field">
                                            {{ field }}
                                        </option>
                                    </sd-select>
                                </ng-template>

                                <ng-template #item let-item="item">
                                    <div class="sd-padding-sm-default"
                                         [class.invalid]="validatorFn ? !validatorFn(excelTitleMap[title], item[title]) : false">
                                        {{ item[title] }}
                                    </div>
                                </ng-template>
                            </sd-sheet-column>
                        </sd-sheet>
                    </sd-busy>
                </sd-pane>
            </sd-dock-container>
        </sd-topbar-container>`
})
export class SdExcelMappingControl {
  public busy = false;
  public excelItemList: { [key: string]: any }[] = [];
  public excelTitleMap: { [key: string]: string | undefined } = {};
  public displayExcelItemList: { [key: string]: any }[] = [];

  public pagination = {
    page: 0,
    length: 0
  };

  public get excelTitleList(): string[] {
    return this.excelItemList.length > 0 ? Object.keys(this.excelItemList[0]) : [];
  }

  public titleTrackByFn = (index: number, value: string) => value;

  @Input() public fields: string[] = [];
  @Input() public validatorFn?: (header: string, value: any) => boolean;
  @Output() public readonly submit = new EventEmitter<{ [key: string]: string | undefined }[]>();
  @Output() public readonly valueChange = new EventEmitter<File | undefined>();

  public fieldTrackByFn(value: string): string {
    return value;
  }

  @Input()
  public set value(value: File | undefined) {
    if (value) {
      this.busy = true;

      this._zone.runOutsideAngular(() => {
        ExcelWorkbook.loadAsync(value)
          .then((wb) => {
            this._zone.run(() => {
              this.excelItemList = wb.json[Object.keys(wb.json)[0]];
              if (this.excelItemList.length < 1) {
                this._toast.warning("읽을 데이터가 없습니다.");
                this.closeExcelFile();
                return;
              }

              for (const title of this.excelTitleList) {
                this.excelTitleMap[title] = this.fields.includes(title) ? title : undefined;
              }

              this.pagination.length = Math.ceil(this.excelItemList.length / 30);
              this.pagination.page = 0;
              this.displayExcelItemList = this.excelItemList.filter((item, index) => {
                return index < 30 * (this.pagination.page + 1) &&
                  index >= 30 * this.pagination.page;
              });
              this.busy = false;
            });
          })
          .catch((e) => {
            this.busy = false;
            throw e;
          });
      });
    }
    else {
      this.closeExcelFile();
    }
  }

  public constructor(private _toast: SdToastProvider,
                     private _zone: NgZone,
                     private _elementRef: ElementRef<HTMLElement>) {

  }

  public closeExcelFile(): void {
    this.excelItemList = [];
    this.excelTitleMap = {};
    this.valueChange.emit(undefined);
  }

  public async submitExcelFile(): Promise<void> {
    const invalidEls = this._elementRef.nativeElement.validate();
    if (invalidEls.length > 0) {
      this._toast.danger(`입력값이 잘못되었습니다\n- ${invalidEls
        .map((el) => {
          const parentEl = el.findParent("*[title]");
          if (parentEl) return parentEl.title;
          return undefined;
        }).filterExists().distinct().join(", ")}`
      );
      invalidEls[0].findParent("td")!.focus();
      return;
    }

    const dupKeys = Object.values(this.excelTitleMap).groupBy((item) => item).filter((item) => item.key && item.values.length > 1).map((item) => item.key).distinct();
    if (dupKeys.length > 0) {
      await this._toast.danger(`매핑이 중복되었습니다.\n- ${dupKeys.join(", ")}`);
      return;
    }

    const getValue = (item: any, colName: string): string | undefined => {
      const fieldName = Object.keys(this.excelTitleMap).single((key) => this.excelTitleMap[key] === colName);
      const val = fieldName ? item[fieldName] : undefined;
      return val ? (
        val instanceof Date ? val.toFormatString("yyyy-MM-dd HH:mm:ss")
          : val instanceof DateOnly ? val.toFormatString("yyyy-MM-dd")
          : val.toString()
      ) : undefined;
    };

    const result = this.excelItemList.map((item) => {
      const info: { [key: string]: string | undefined } = {};
      this.fields.forEach((colName) => info[colName] = getValue(item, colName));
      return info;
    });

    this.submit.emit(result);
  }

  public setPage(page: number): void {
    this.pagination.page = page;
    this.displayExcelItemList = this.excelItemList.filter((item, index) => {
      return index < 30 * (this.pagination.page + 1) &&
        index >= 30 * this.pagination.page;
    });
  }
}