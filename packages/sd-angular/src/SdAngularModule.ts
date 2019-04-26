import { CommonModule } from "@angular/common";
import { ErrorHandler, ModuleWithProviders, NgModule, Provider } from "@angular/core";
import { Type } from "@simplysm/sd-common";
import { SdCardControl } from "./controls/SdCardControl";
import { SdFormControl } from "./controls/SdFormControl";
import { SdTextfieldControl } from "./controls/SdTextfieldControl";
import { SdButtonControl } from "./controls/SdButtonControl";
import { SdSidebarControl } from "./controls/SdSidebarControl";
import { SdPaneControl } from "./controls/SdPaneControl";
import { SdIconControl } from "./controls/SdIconControl";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdNavigateDirective } from "./directives/SdNavigateDirective";
import { SdBusyContainerControl } from "./controls/SdBusyContainerControl";
import { SdCheckboxControl } from "./controls/SdCheckboxControl";
import { SdComboboxControl } from "./controls/SdComboboxControl";
import { SdComboboxItemControl } from "./controls/SdComboboxItemControl";
import { SdDockControl } from "./controls/SdDockControl";
import { SdDockContainerControl } from "./controls/SdDockContainerControl";
import { SdLabelControl } from "./controls/SdLabelControl";
import { SdListControl } from "./controls/SdListControl";
import { SdListItemControl } from "./controls/SdListItemControl";
import { SdPaginationControl } from "./controls/SdPaginationControl";
import { SdSheetControl } from "./controls/SdSheetControl";
import { SdSheetColumnControl } from "./controls/SdSheetColumnControl";
import { SdTopbarControl } from "./controls/SdTopbarControl";
import { SdTopbarContainerControl } from "./controls/SdTopbarContainerControl";
import { SdTopbarMenuControl } from "./controls/SdTopbarMenuControl";
import { SdSelectControl } from "./controls/SdSelectControl";
import { SdSelectItemControl } from "./controls/SdSelectItemControl";
import { SdDropdownControl } from "./controls/SdDropdownControl";
import { SdMultiSelectItemControl } from "./controls/SdMultiSelectItemControl";
import { SdMultiSelectControl } from "./controls/SdMultiSelectControl";
import { SdDropdownPopupControl } from "./controls/SdDropdownPopupControl";
import { SdGridControl } from "./controls/SdGridControl";
import { SdGridItemControl } from "./controls/SdGridItemControl";
import { SdBarcodeControl } from "./controls/SdBarcodeControl";
import { SdMarkdownEditorControl } from "./controls/SdMarkdownEditorControl";
import { SdCheckboxGroupControl } from "./controls/SdCheckboxGroupControl";
import { SdTabviewControl } from "./controls/SdTabviewControl";
import { SdTabviewItemControl } from "./controls/SdTabviewItemControl";
import { SdTabControl } from "./controls/SdTabControl";
import { SdTabItemControl } from "./controls/SdTabItemControl";
import { SdViewControl } from "./controls/SdViewControl";
import { SdViewItemControl } from "./controls/SdViewItemControl";
import { SdHtmlEditorControl } from "./controls/SdHtmlEditorControl";
import { SdNoteControl } from "./controls/SdNoteControl";
import { SdModalControl } from "./controls/SdModalControl";
import { SdCasePipe } from "./pipes/SdCasePipe";
import { SdDomValidatorProvider } from "./providers/SdDomValidatorProvider";
import { SdToastProvider } from "./providers/SdToastProvider";
import { SdLocalStorageProvider } from "./providers/SdLocalStorageProvider";
import { SdFileDialogProvider } from "./providers/SdFileDialogProvider";
import { SdModalProvider } from "./providers/SdModalProvider";
import { SdPrintProvider } from "./providers/SdPrintProvider";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { ResizeEventPlugin } from "./plugins/ResizeEventPlugin";
import { GlobalErrorHandler } from "./plugins/GlobalErrorHandler";
import { SdFormItemControl } from "./controls/SdFormItemControl";
import { SdSidebarContainerControl } from "./controls/SdSidebarContainerControl";
import { SdCheckboxGroupItemControl } from "./controls/SdCheckboxGroupItemControl";
import { SdSidebarBrandControl } from "./controls/SdSidebarBrandControl";
import { SdSidebarUserControl } from "./controls/SdSidebarUserControl";
import { SdSidebarUserMenuControl } from "./controls/SdSidebarUserMenuControl";
import { SdTableControl } from "./controls/SdTableControl";
import { SdListItemButtonControl } from "./controls/SdListItemButtonControl";
import { LinkActionDirective } from "./directives/LinkActionDirective";
import { SdToastContainerControl } from "./controls/SdToastContainerControl";
import { SdToastControl } from "./controls/SdToastControl";
import { SdServiceProvider } from "./providers/SdServiceProvider";
import { SdAddressSearchModal } from "./modals/SdAddressSearchModal";
import { SdCryptoServiceProvider } from "./providers/SdCryptoServiceProvider";
import { SdOrmServiceProvider } from "./providers/SdOrmServiceProvider";
import { SdSmtpClientServiceProvider } from "./providers/SdSmtpClientServiceProvider";
import { SdSoapProvider } from "./providers/SdSoapProvider";

const controls: Type<any>[] = [
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
  SdListItemButtonControl,
  SdPaginationControl,
  SdPaneControl,
  SdSheetControl,
  SdSheetColumnControl,
  SdSidebarControl,
  SdSidebarContainerControl,
  SdSidebarBrandControl,
  SdSidebarUserControl,
  SdSidebarUserMenuControl,
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
  SdHtmlEditorControl,
  SdNoteControl,
  SdTableControl
];

const entryControls: Type<any>[] = [SdModalControl, SdToastContainerControl, SdToastControl, SdAddressSearchModal];

const directives: Type<any>[] = [SdNavigateDirective, LinkActionDirective];

const pipes: Type<any>[] = [SdCasePipe];

const providers: Provider[] = [
  SdDomValidatorProvider,
  SdFileDialogProvider,
  SdLocalStorageProvider,
  SdModalProvider,
  SdPrintProvider,
  SdToastProvider,
  SdServiceProvider,
  SdCryptoServiceProvider,
  SdOrmServiceProvider,
  SdSmtpClientServiceProvider,
  SdSoapProvider,
  { provide: EVENT_MANAGER_PLUGINS, useClass: ResizeEventPlugin, multi: true },
  { provide: ErrorHandler, useClass: GlobalErrorHandler }
];

@NgModule({
  imports: [CommonModule, FontAwesomeModule],
  exports: [...controls, ...entryControls, ...directives, ...pipes],
  declarations: [...controls, ...entryControls, ...directives, ...pipes],
  entryComponents: entryControls
})
export class SdAngularModule {
  public static forRoot(): ModuleWithProviders<SdAngularModule> {
    return { ngModule: SdAngularModule, providers };
  }
}
