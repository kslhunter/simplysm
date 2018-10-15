import {ErrorHandler, ModuleWithProviders, NgModule} from "@angular/core";
import {EVENT_MANAGER_PLUGINS} from "@angular/platform-browser";
import {ResizeEventPlugin} from "./plugin/ResizeEventPlugin";
import {SdToastProvider} from "./provider/SdToastProvider";
import {SdFileDialogProvider} from "./provider/SdFileDialogProvider";
import {SdDomValidatorProvider} from "./provider/SdDomValidatorProvider";
import {SdBusyContainerControl} from "./control/SdBusyContainerControl";
import {SdButtonControl} from "./control/SdButtonControl";
import {SdCheckboxControl} from "./control/SdCheckboxControl";
import {SdDockContainerControl} from "./control/SdDockContainerControl";
import {SdDockControl} from "./control/SdDockControl";
import {SdFormItemControl} from "./control/SdFormItemControl";
import {SdFormControl} from "./control/SdFormControl";
import {SdIconControl} from "./control/SdIconControl";
import {SdListControl} from "./control/SdListControl";
import {SdListItemControl} from "./control/SdListItemControl";
import {SdPaginationControl} from "./control/SdPaginationControl";
import {SdPaneControl} from "./control/SdPaneControl";
import {SdSheetColumnControl} from "./control/SdSheetColumnControl";
import {SdSheetControl} from "./control/SdSheetControl";
import {SdSidebarControl} from "./control/SdSidebarControl";
import {SdSidebarContainerControl} from "./control/SdSidebarContainerControl";
import {SdTextfieldControl} from "./control/SdTextfieldControl";
import {SdTopbarControl} from "./control/SdTopbarControl";
import {SdTopbarContainerControl} from "./control/SdTopbarContainerControl";
import {SdTopbarMenuControl} from "./control/SdTopbarMenuControl";
import {SdSocketProvider} from "./provider/SdSocketProvider";
import {SdOrmProvider} from "./provider/SdOrmProvider";
import {SdLocalStorageProvider} from "./provider/SdLocalStorageProvider";
import {SdComboboxControl} from "./control/SdComboboxControl";
import {SdComboboxItemControl} from "./control/SdComboboxItemControl";
import {GlobalErrorHandler} from "./plugin/GlobalErrorHandler";
import {SdSelectControl} from "./control/SdSelectControl";
import {CommonModule} from "@angular/common";
import {SdModalProvider} from "./provider/SdModalProvider";
import {SdModalControl} from "./control/SdModalControl";
import {SdLabelControl} from "./control/SdLabelControl";
import {SdMultiSelectControl} from "./control/SdMultiSelectControl";
import {SdMultiSelectItemControl} from "./control/SdMultiSelectItemControl";
import {SdDropdownPopupControl} from "./control/SdDropdownPopupControl";
import {SdDropdownControl} from "./control/SdDropdownControl";
import {SdGridControl} from "./control/SdGridControl";
import {SdGridItemControl} from "./control/SdGridItemControl";
import {SdBarcodeControl} from "./control/SdBarcodeControl";
import {SdPrintProvider} from "./provider/SdPrintProvider";
import {SdCardControl} from "./control/SdCardControl";
import {SdMarkdownEditorControl} from "./control/SdMarkdownEditorControl";
import {SdSmtpClientProvider} from "./provider/SdSmtpClientProvider";
import {SdSelectItemControl} from "./control/SdSelectItemControl";
import {SdCheckboxGroupItemControl} from "./control/SdCheckboxGroupItemControl";
import {SdCheckboxGroupControl} from "./control/SdCheckboxGroupControl";
import {SdCasePipe} from "./pipe/SdCasePipe";
import {SdNavigateAttribute} from "./attribute/SdNavigateAttribute";
import {SdTabviewControl} from "./control/SdTabviewControl";
import {SdTabviewItemControl} from "./control/SdTabviewItemControl";
import {SdTabControl} from "./control/SdTabControl";
import {SdTabItemControl} from "./control/SdTabItemControl";
import {SdViewControl} from "./control/SdViewControl";
import {SdViewItemControl} from "./control/SdViewItemControl";
import {SdHtmlEditorControl} from "./control/SdHtmlEditorControl";

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
  SdLabelControl,
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
  SdSelectControl,
  SdSelectItemControl,
  SdMultiSelectControl,
  SdMultiSelectItemControl,
  SdDropdownControl,
  SdDropdownPopupControl,
  SdGridControl,
  SdGridItemControl,
  SdBarcodeControl,
  SdCardControl,
  SdMarkdownEditorControl,
  SdCheckboxGroupControl,
  SdCheckboxGroupItemControl,
  SdTabviewControl,
  SdTabviewItemControl,
  SdTabControl,
  SdTabItemControl,
  SdViewControl,
  SdViewItemControl,
  SdHtmlEditorControl
];

const entryControls: any[] = [
  SdModalControl
];

const attributes: any[] = [
  SdNavigateAttribute
];

const pipes: any[] = [
  SdCasePipe
];

const providers: any[] = [
  SdDomValidatorProvider,
  SdFileDialogProvider,
  SdLocalStorageProvider,
  SdOrmProvider,
  SdToastProvider,
  SdModalProvider,
  SdSocketProvider,
  SdPrintProvider,
  SdSmtpClientProvider,
  {provide: EVENT_MANAGER_PLUGINS, useClass: ResizeEventPlugin, multi: true},
  {provide: ErrorHandler, useClass: GlobalErrorHandler}
];

@NgModule({
  imports: [
    CommonModule
  ],
  exports: [
    ...controls,
    ...entryControls,
    ...attributes,
    ...pipes
  ],
  declarations: [
    ...controls,
    ...entryControls,
    ...attributes,
    ...pipes
  ],
  entryComponents: [
    ...entryControls
  ]
})
export class SimplismModule {
  public static forRoot(): ModuleWithProviders {
    return {
      ngModule: SimplismModule,
      providers
    };
  }
}
