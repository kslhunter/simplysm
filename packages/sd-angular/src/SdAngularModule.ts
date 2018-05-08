import {ErrorHandler, Injectable, NgModule, Type} from "@angular/core";
import {BrowserModule} from "@angular/platform-browser";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";
import {library} from "@fortawesome/fontawesome-svg-core";
import {far} from "@fortawesome/free-regular-svg-icons";
import {fas} from "@fortawesome/free-solid-svg-icons";
import {SdButtonControl} from "./controls/SdButtonControl";
import {SdFormControl, SdFormItemControl} from "./controls/SdFormControl";
import {SdTextfieldControl} from "./controls/SdTextfieldControl";
import {SdTextareaControl} from "./controls/SdTextareaControl";
import {SdSidebarContainerControl, SdSidebarControl} from "./controls/SdSidebarControl";
import {SdTopbarContainerControl, SdTopbarControl} from "./controls/SdTopbarControl";
import {SdListControl, SdListItemControl} from "./controls/SdListControl";
import {SdPaneControl} from "./controls/SdPaneControl";
import {SdDatePickerControl} from "./controls/SdDatePickerControl";
import {SdDateRangePickerControl} from "./controls/SdDateRangePickerControl";
import {SdNoteControl} from "./controls/SdNoteControl";
import {SdGridControl, SdGridItemControl} from "./controls/SdGridControl";
import {SdPaginationControl} from "./controls/SdPaginationControl";
import {OptionControl, SdSelectControl} from "./controls/SdSelectControl";
import {SdCheckboxControl} from "./controls/SdCheckboxControl";
import {SdTabControl, SdTabItemControl} from "./controls/SdTabControl";
import {SdViewerControl, SdViewerItemControl} from "./controls/SdViewerControl";
import {SdBarcodeControl} from "./controls/SdBarcodeControl";
import {SdEnumControl, SdEnumItemControl} from "./controls/SdEnumControl";
import {SdChartDonutControl, SdChartDonutItemControl} from "./controls/SdChartDonutControl";
import {SdBusyContainerControl} from "./controls/SdBusyContainerControl";
import {SdDropdownControl} from "./controls/SdDropdownControl";
import {SdComboboxControl} from "./controls/SdComboboxControl";
import {SdIconControl} from "./controls/SdIconControl";
import {SdDockContainerControl, SdDockControl} from "./controls/SdDockControl";
import {SdModalProvider} from "./providers/SdModalProvider";
import {SdBusyProvider} from "./providers/SdBusyProvider";
import {SdServiceProvider} from "./providers/SdServiceProvider";
import {SdToastProvider} from "./providers/SdToastProvider";
import {SdLocalStorageProvider} from "./providers/SdLocalStorageProvider";
import {SdPrintProvider} from "./providers/SdPrintProvider";
import {SdCanDeactivateGuardProvider} from "./providers/SdCanDeactivateGuardProvider";
import {SdModalControl} from "./controls/SdModalControl";

library.add(fas, far);

const modules: Type<any>[] = [
  BrowserModule,
  FontAwesomeModule
];

const controls: Type<any>[] = [
  SdButtonControl,
  SdFormControl, SdFormItemControl,
  SdTextfieldControl,
  SdTextareaControl,
  SdSidebarContainerControl, SdSidebarControl,
  SdTopbarContainerControl, SdTopbarControl,
  SdListControl, SdListItemControl,
  SdPaneControl,
  SdDatePickerControl, SdDateRangePickerControl,
  SdNoteControl,
  SdGridControl, SdGridItemControl,
  SdPaginationControl,
  SdSelectControl, OptionControl,
  SdCheckboxControl,
  SdTabControl, SdTabItemControl,
  SdViewerControl, SdViewerItemControl,
  SdBarcodeControl,
  SdEnumControl, SdEnumItemControl,
  SdChartDonutControl, SdChartDonutItemControl,
  SdBusyContainerControl,
  SdDropdownControl,
  SdDockContainerControl, SdDockControl,
  SdComboboxControl,
  SdIconControl
];

const providers: Type<any>[] = [
  SdModalProvider,
  SdBusyProvider,
  SdServiceProvider,
  SdToastProvider,
  SdLocalStorageProvider,
  SdPrintProvider,
  SdCanDeactivateGuardProvider
];

const entryControls: Type<any>[] = [
  SdModalControl
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
  }
}
