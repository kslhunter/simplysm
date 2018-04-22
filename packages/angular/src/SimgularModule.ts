import "jquery";
import {CodeException} from "@simplism/core";
import {ErrorHandler, Injectable, NgModule, Type} from "@angular/core";
import {BrowserModule} from "@angular/platform-browser";
import {SdButtonControl} from "./controls/SdButtonControl";
import {SdButtonGroupControl} from "./controls/SdButtonGroupControl";
import {SdFormControl, SdFormItemControl} from "./controls/SdFormControl";
import {SdTextFieldControl} from "./controls/SdTextFieldControl";
import {SdTextAreaControl} from "./controls/SdTextAreaControl";
import {SdSidebarContainerControl, SdSidebarControl} from "./controls/SdSidebarControl";
import {
    SdTopbarButtonControl,
    SdTopbarContainerControl,
    SdTopbarControl,
    SdTopbarFileButtonControl
} from "./controls/SdTopbarControl";
import {SdDockContainerControl, SdDockControl} from "./controls/SdDockControl";
import {SdListControl, SdListItemControl} from "./controls/SdListControl";
import {SdPaneControl} from "./controls/SdPaneControl";
import {SdCardControl} from "./controls/SdCardControl";
import {SdDatePickerControl} from "./controls/SdDatePickerControl";
import {SdDateRangePickerControl} from "./controls/SdDateRangePickerControl";
import {SdStarsControl} from "./controls/SdStarsControl";
import {SdDrawingControl} from "./controls/SdDrawingControl";
import {SdModalProvider} from "./providers/SdModalProvider";
import {SdBusyProvider} from "./providers/SdBusyProvider";
import {SdServiceProvider} from "./providers/SdServiceProvider";
import {SdToastProvider} from "./providers/SdToastProvider";
import {SdLocalStorageProvider} from "./providers/SdLocalStorageProvider";
import {SdNoteControl} from "./controls/SdNoteControl";
import {SdGridControl, SdGridItemControl} from "./controls/SdGridControl";
import {
    SdCellButtonControl,
    SdCellCheckboxControl,
    SdCellControl,
    SdCellDatePickerControl,
    SdCellSelectControl,
    SdCellTextFieldControl,
    SdColumnSelectorControl,
    SdTableControl
} from "./controls/SdTableControl";
import {SdPaginationControl} from "./controls/SdPaginationControl";
import {SdModalControl} from "./entry-controls/SdModalControl";
import {SdFocusProvider} from "./providers/SdFocusProvider";
import {OptionControl, SdSelectControl} from "./controls/SdSelectControl";
import {SdCheckboxControl} from "./controls/SdCheckboxControl";
import {SdTabControl, SdTabItemControl} from "./controls/SdTabControl";
import {SdViewerControl, SdViewerItemControl} from "./controls/SdViewerControl";
import {SdPrintProvider} from "./providers/SdPrintProvider";
import {SdBarcodeControl} from "./controls/SdBarcodeControl";
import {SdEnumControl, SdEnumItemControl} from "./controls/SdEnumControl";
import {SdHidBarcodeScannerProvider} from "./providers/SdHidBarcodeScannerProvider";
import {SdCameraBarcodeScannerProvider} from "./providers/SdCameraBarcodeScannerProvider";
import {SdKeyboardPanelProvider} from "./providers/SdKeyboardPanelProvider";
import {SdProgressControl, SdProgressItemControl} from "./controls/SdProgressControl";
import {CircleControl, SdChartDonutControl, SdChartDonutItemControl} from "./controls/SdChartDonutControl";
import {SdCanDeactivateGuardProvider} from "./providers/SdCanDeactivateGuardProvider";
import {SdExcelMappingControl} from "./controls/SdExcelMappingControl";
import {SdBusyControl} from "./controls/SdBusyControl";
import {SimgularHelpers} from "./helpers/SimgularHelpers";
import {SdDropdownControl} from "./controls/SdDropdownControl";
import {SdComboboxControl} from "./controls/SdComboboxControl";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";
import {library} from "@fortawesome/fontawesome-svg-core";
import {fas} from "@fortawesome/free-solid-svg-icons";
import {far} from "@fortawesome/free-regular-svg-icons";
import {SdIconControl} from "./controls/SdIcon";
import {SdSheetColumnControl, SdSheetControl} from "./controls2/SdSheetControl";
import {SdSheetColumnConfigModal} from "./modals/SdSheetColumnConfigModal";
import {SdButton2Control} from "./controls2/SdButton2Control";
import {SdTextfieldControl} from "./controls2/SdTextfieldControl";

library.add(fas, far);

const modules: Type<any>[] = [
    BrowserModule,
    FontAwesomeModule
];

const controls: Type<any>[] = [
    SdButtonControl, SdButtonGroupControl,
    SdFormControl, SdFormItemControl,
    SdTextFieldControl,
    SdTextAreaControl,
    SdSidebarContainerControl, SdSidebarControl,
    SdTopbarContainerControl, SdTopbarControl, SdTopbarButtonControl, SdTopbarFileButtonControl,
    SdDockContainerControl, SdDockControl,
    SdListControl, SdListItemControl,
    SdPaneControl,
    SdCardControl,
    SdDatePickerControl, SdDateRangePickerControl,
    SdStarsControl,
    SdDrawingControl,
    SdNoteControl,
    SdGridControl, SdGridItemControl,
    SdTableControl, SdCellControl, SdCellTextFieldControl, SdCellButtonControl, SdCellDatePickerControl, SdCellSelectControl, SdCellCheckboxControl, SdColumnSelectorControl,
    SdPaginationControl,
    SdSelectControl,
    SdCheckboxControl,
    SdTabControl, SdTabItemControl,
    SdViewerControl, SdViewerItemControl,
    SdBarcodeControl,
    SdEnumControl, SdEnumItemControl,
    SdProgressControl, SdProgressItemControl,
    SdChartDonutControl, SdChartDonutItemControl,
    SdExcelMappingControl,
    SdBusyControl,
    SdDropdownControl,
    SdComboboxControl,
    SdIconControl,
    SdSheetControl, SdSheetColumnControl,

    CircleControl, OptionControl,

    SdButton2Control,
    SdTextfieldControl
];

const providers: Type<any>[] = [
    SdModalProvider,
    SdBusyProvider,
    SdServiceProvider,
    SdToastProvider,
    SdLocalStorageProvider,
    SdFocusProvider,
    SdPrintProvider,
    SdHidBarcodeScannerProvider,
    SdCameraBarcodeScannerProvider,
    SdKeyboardPanelProvider,
    SdCanDeactivateGuardProvider
];

const entryControls: Type<any>[] = [
    SdModalControl,
    SdSheetColumnConfigModal
];

const directives: Type<any>[] = [];

const pipes: Type<any>[] = [];

@Injectable()
class SimgularErrorHandler implements ErrorHandler {
    constructor(private _toast: SdToastProvider) {
    }

    async handleError(error: any): Promise<void> {
        let err: Error;
        if (error.rejection) {
            err = error.rejection;
        } else {
            err = error;
        }

        if (!(err instanceof CodeException)) {
            if (process.env.NODE_ENV === "production") {
                alert("처리되지 않은 오류가 발생하였습니다.\n\n" + err.message);
                location.reload();
                return;
            }
            else {
                this._toast.danger("처리되지 않은 오류가 발생하였습니다.\n\n" + err.message);
            }
        }
        throw err;
    }
}

providers.push({provide: ErrorHandler, useClass: SimgularErrorHandler} as any);

@NgModule({
    imports: ([] as any[])
        .concat(modules),
    entryComponents: entryControls,
    declarations: ([] as any[])
        .concat(controls)
        .concat(entryControls)
        .concat(directives)
        .concat(pipes),
    exports: ([] as any[])
        .concat(modules)
        .concat(controls)
        .concat(entryControls)
        .concat(directives)
        .concat(pipes),
    providers: ([] as any[])
        .concat(providers)
})
export class SimgularModule {
    constructor() {
        window.addEventListener("popstate", () => {
            location.reload(true);
        });

        let timeout: number;
        window.addEventListener("resize", () => {
            SimgularHelpers.stopDetectElementChanges();

            window.clearTimeout(timeout);
            timeout = window.setTimeout(() => {
                SimgularHelpers.rerunDetectElementChanges();
            }, 200);
        });
    }
}
