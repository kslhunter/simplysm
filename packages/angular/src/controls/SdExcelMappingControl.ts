import {Component, EventEmitter, Input, NgZone, Output} from "@angular/core";
import {ExcelWorkbook} from "@simplism/excel";
import {SdToastProvider} from "../providers/SdToastProvider";
import {DateOnly} from "@simplism/core";

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
                    <i class="fas fa-fw fa-check"></i>
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
                        <sd-table *ngIf="excelItemList.length > 0">
                            <thead>
                            <tr>
                                <th *ngFor="let header of excelHeaderList">
                                    {{header}}
                                </th>
                            </tr>
                            </thead>
                            <thead class="sd-background-info-state">
                            <tr>
                                <sd-cell-select *ngFor="let header of excelHeaderList"
                                                [(value)]="excelHeaderMap[header]">
                                    <option *ngFor="let field of fields"
                                            [value]="field">
                                        {{field}}
                                    </option>
                                </sd-cell-select>
                            </tr>
                            </thead>
                            <tbody *ngFor="let item of displayExcelItemList">
                            <tr>
                                <td *ngFor="let header of excelHeaderList">
                                    {{item[header]}}
                                </td>
                            </tr>
                            </tbody>
                        </sd-table>
                    </sd-busy>
                </sd-pane>
            </sd-dock-container>
        </sd-topbar-container>`
})
export class SdExcelMappingControl {
    busy = false;
    excelItemList: { [key: string]: any }[] = [];
    excelHeaderMap: { [key: string]: string | undefined } = {};
    displayExcelItemList: { [key: string]: any }[] = [];

    pagination = {
        page: 0,
        length: 0
    };

    get excelHeaderList(): string[] {
        return this.excelItemList.length > 0 ? Object.keys(this.excelItemList[0]) : [];
    }

    @Input() fields: string[] = [];
    @Output() submit = new EventEmitter<{ [key: string]: string | undefined }[]>();
    @Output() valueChange = new EventEmitter<File | undefined>();

    @Input()
    set value(value: File | undefined) {
        if (value) {
            this.busy = true;

            this._zone.runOutsideAngular(() => {
                ExcelWorkbook.loadAsync(value)
                    .then(wb => {
                        this._zone.run(() => {
                            this.excelItemList = wb.json[Object.keys(wb.json)[0]];
                            if (this.excelItemList.length < 1) {
                                this._toast.warning("읽을 데이터가 없습니다.");
                                this.closeExcelFile();
                                return;
                            }

                            for (const header of this.excelHeaderList) {
                                this.excelHeaderMap[header] = this.fields.includes(header) ? header : undefined;
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
                    .catch(e => {
                        this.busy = false;
                        throw e;
                    });
            });
        }
        else {
            this.closeExcelFile();
        }
    }

    constructor(private _toast: SdToastProvider,
                private _zone: NgZone) {

    }

    closeExcelFile(): void {
        this.excelItemList = [];
        this.excelHeaderMap = {};
        this.valueChange.emit(undefined);
    }


    async submitExcelFile(): Promise<void> {
        const dupKeys = Object.values(this.excelHeaderMap).groupBy(item => item).toPairedArray().filter(item => item[0] && item[1].length > 1).map(item => item[0]).distinct();
        if (dupKeys.length > 0) {
            await this._toast.danger("매핑이 중복되었습니다.\n- " + dupKeys.join(", "));
            return;
        }

        const getValue = (item: any, colName: string): string | undefined => {
            const fieldName = Object.keys(this.excelHeaderMap).singleOr(undefined, key => this.excelHeaderMap[key] === colName);
            const val = fieldName ? item[fieldName] : undefined;
            return val ? (
                val instanceof Date ? val.toFormatString("yyyy-MM-dd HH:mm:ss")
                    : val instanceof DateOnly ? val.toFormatString("yyyy-MM-dd")
                    : val.toString()
            ) : undefined;
        };

        const result = this.excelItemList.map(item => {
            const info: { [key: string]: string | undefined } = {};
            this.fields.forEach(colName => info[colName] = getValue(item, colName));
            return info;
        });

        this.submit.emit(result);
    }

    setPage(page: number): void {
        this.pagination.page = page;
        this.displayExcelItemList = this.excelItemList.filter((item, index) => {
            return index < 30 * (this.pagination.page + 1) &&
                index >= 30 * this.pagination.page;
        });
    }
}