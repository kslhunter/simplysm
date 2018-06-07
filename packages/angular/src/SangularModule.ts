import {ErrorHandler, NgModule} from "@angular/core";
import {BrowserModule, EVENT_MANAGER_PLUGINS} from "@angular/platform-browser";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {ResizeEventPlugin} from "./plugins/ResizeEventPlugin";
import {SdToastProvider} from "./providers/SdToastProvider";
import {SdFileDialogProvider} from "./providers/SdFileDialogProvider";
import {SdDomValidatorProvider} from "./providers/SdDomValidatorProvider";
import {SdBusyContainerControl} from "./controls/sd-busy-container.control";
import {SdButtonControl} from "./controls/sd-button.control";
import {SdCheckboxControl} from "./controls/sd-checkbox.control";
import {SdDockContainerControl} from "./controls/sd-dock-container.control";
import {SdDockControl} from "./controls/sd-dock.control";
import {SdFormItemControl} from "./controls/sd-form-item.control";
import {SdFormControl} from "./controls/sd-form.control";
import {SdIconControl} from "./controls/sd-icon.control";
import {SdListControl} from "./controls/sd-list.control";
import {SdListItemControl} from "./controls/sd-list-item.control";
import {SdPaginationControl} from "./controls/sd-pagination.control";
import {SdPaneControl} from "./controls/sd-pane.control";
import {SdSheetColumnControl} from "./controls/sd-sheet-column.control";
import {SdSheetControl} from "./controls/sd-sheet.control";
import {SdSidebarControl} from "./controls/sd-sidebar.control";
import {SdSidebarContainerControl} from "./controls/sd-sidebar-container.control";
import {SdTextfieldControl} from "./controls/sd-textfield.control";
import {SdTopbarControl} from "./controls/sd-topbar.control";
import {SdTopbarContainerControl} from "./controls/sd-topbar-container.control";
import {SdTopbarMenuControl} from "./controls/sd-topbar-menu.control";
import {SdWebSocketProvider} from "./providers/SdWebSocketProvider";
import {SdOrmProvider} from "./providers/SdOrmProvider";
import {SdLocalStorageProvider} from "./providers/SdLocalStorageProvider";
import {SdComboboxControl} from "./controls/sd-combobox.control";
import {SdComboboxItemControl} from "./controls/sd-combobox-item.control";
import {GlobalErrorHandler} from "./plugins/GlobalErrorHandler";
import {SdSelectControl} from "./controls/sd-select.control";
import {OptionValueAttribute} from "./attributes/option-value.attribute";

const controls: any[] = [
  SdBusyContainerControl,
  SdButtonControl,
  SdCheckboxControl,
  SdComboboxControl,
  SdComboboxItemControl,
  SdDockControl,
  SdDockContainerControl,
  SdFormControl,
  SdFormItemControl,
  SdIconControl,
  SdListControl,
  SdListItemControl,
  SdPaginationControl,
  SdPaneControl,
  SdSheetControl,
  SdSheetColumnControl,
  SdSidebarControl,
  SdSidebarContainerControl,
  SdTextfieldControl,
  SdTopbarControl,
  SdTopbarContainerControl,
  SdTopbarMenuControl,
  SdSelectControl
];

const attributes: any[] = [
  OptionValueAttribute
];

const providers: any[] = [
  SdDomValidatorProvider,
  SdFileDialogProvider,
  SdLocalStorageProvider,
  SdOrmProvider,
  SdToastProvider,
  SdWebSocketProvider,
  {provide: EVENT_MANAGER_PLUGINS, useClass: ResizeEventPlugin, multi: true},
  {provide: ErrorHandler, useClass: GlobalErrorHandler}
];

@NgModule({
  imports: [
    BrowserModule,
    BrowserAnimationsModule
  ],
  exports: [
    BrowserModule,
    BrowserAnimationsModule,
    ...controls,
    ...attributes
  ],
  declarations: [
    ...controls,
    ...attributes
  ],
  providers
})
export class SangularModule {
}
