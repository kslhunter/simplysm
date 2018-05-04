import {ErrorHandler, Injectable, NgModule, Type} from "@angular/core";
import {BrowserModule} from "@angular/platform-browser";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";
import {library} from "@fortawesome/fontawesome-svg-core";
import {far} from "@fortawesome/free-regular-svg-icons";
import {fas} from "@fortawesome/free-solid-svg-icons";
import "jquery";
import {SdBarcodeControl} from "./controls/SdBarcodeControl";
import {SdBusyControl} from "./controls/SdBusyControl";
import {SdButtonControl} from "./controls/SdButtonControl";
import {SdButtonGroupControl} from "./controls/SdButtonGroupControl";
import {SdCardControl} from "./controls/SdCardControl";
import {CircleControl, SdChartDonutControl, SdChartDonutItemControl} from "./controls/SdChartDonutControl";
import {SdCheckboxControl} from "./controls/SdCheckboxControl";
import {SdComboboxControl} from "./controls/SdComboboxControl";
import {SdDatePickerControl} from "./controls/SdDatePickerControl";
import {SdDateRangePickerControl} from "./controls/SdDateRangePickerControl";
import {SdDrawingControl} from "./controls/SdDrawingControl";
import {SdDropdownControl} from "./controls/SdDropdownControl";
import {SdEnumControl, SdEnumItemControl} from "./controls/SdEnumControl";
import {SdExcelMappingControl} from "./controls/SdExcelMappingControl";
import {SdFormControl, SdFormItemControl} from "./controls/SdFormControl";
import {SdGridControl, SdGridItemControl} from "./controls/SdGridControl";
import {SdIconControl} from "./controls/SdIcon";
import {SdListControl, SdListItemControl} from "./controls/SdListControl";
import {SdNoteControl} from "./controls/SdNoteControl";
import {SdPaginationControl} from "./controls/SdPaginationControl";
import {SdPaneControl} from "./controls/SdPaneControl";
import {SdProgressControl, SdProgressItemControl} from "./controls/SdProgressControl";
import {OptionControl, SdSelectControl} from "./controls/SdSelectControl";
import {SdSidebarContainerControl, SdSidebarControl} from "./controls/SdSidebarControl";
import {SdStarsControl} from "./controls/SdStarsControl";
import {SdTabControl, SdTabItemControl} from "./controls/SdTabControl";
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
import {SdTextAreaControl} from "./controls/SdTextAreaControl";
import {SdTextFieldControl} from "./controls/SdTextFieldControl";
import {
  SdTopbarButtonControl,
  SdTopbarContainerControl,
  SdTopbarControl,
  SdTopbarFileButtonControl
} from "./controls/SdTopbarControl";
import {SdViewerControl, SdViewerItemControl} from "./controls/SdViewerControl";
import {SdButton2Control} from "./controls2/SdButton2Control";
import {SdDockContainerControl, SdDockControl} from "./controls2/SdDockControl";
import {SdSheetColumnControl, SdSheetColumnHeadControl, SdSheetControl} from "./controls2/SdSheetControl";
import {SdTextfieldControl} from "./controls2/SdTextfieldControl";
import {SdModalControl} from "./entry-controls/SdModalControl";
import {SimgularHelpers} from "./helpers/SimgularHelpers";
import {SdSheetColumnConfigModal} from "./modals/SdSheetColumnConfigModal";
import {SdBusyProvider} from "./providers/SdBusyProvider";
import {SdCameraBarcodeScannerProvider} from "./providers/SdCameraBarcodeScannerProvider";
import {SdCanDeactivateGuardProvider} from "./providers/SdCanDeactivateGuardProvider";
import {SdFocusProvider} from "./providers/SdFocusProvider";
import {SdHidBarcodeScannerProvider} from "./providers/SdHidBarcodeScannerProvider";
import {SdKeyboardPanelProvider} from "./providers/SdKeyboardPanelProvider";
import {SdLocalStorageProvider} from "./providers/SdLocalStorageProvider";
import {SdModalProvider} from "./providers/SdModalProvider";
import {SdPrintProvider} from "./providers/SdPrintProvider";
import {SdServiceProvider} from "./providers/SdServiceProvider";
import {SdToastProvider} from "./providers/SdToastProvider";

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

  CircleControl, OptionControl,

  SdButton2Control,
  SdDockContainerControl, SdDockControl,
  SdSheetControl, SdSheetColumnControl, SdSheetColumnHeadControl,
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
  public constructor(private readonly _toast: SdToastProvider) {
  }

  public handleError(error: any): void {
    const err = error.rejection ? error.rejection : error;

    if (!err.handled) {
      if (process.env.NODE_ENV === "production") {
        alert(`처리되지 않은 오류가 발생하였습니다.\n\n${err.message}`);
        location.reload();
        return;
      }
      {
        this._toast.danger(`처리되지 않은 오류가 발생하였습니다.\n\n${err.message}`);
        throw err;
      }
    }
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
export class SdAngularModule {
  public constructor() {
    if (process.env.NODE_ENV === "production") {
      window.addEventListener("popstate", () => {
        location.reload(true);
      });
    }

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
